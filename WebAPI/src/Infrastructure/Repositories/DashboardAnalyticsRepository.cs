using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Enums;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Domain.Entities;
using LegalMatterContractPortal.Domain.Enums;
using LegalMatterContractPortal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LegalMatterContractPortal.Infrastructure.Repositories;

internal sealed class DashboardRepository(LegalDbContext db) : IDashboardRepository
{
    public async Task<DashboardSummaryDto> GetSummaryAsync(DateOnly? asOf, CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        var ytdStart = new DateOnly(today.Year, 1, 1);

        // Active matters = Intake,Triage,Active,OnHold,Closing
        var openStatuses = new[] { MatterStatus.Intake, MatterStatus.Triage, MatterStatus.Active, MatterStatus.OnHold, MatterStatus.Closing };
        var activeMatters = await db.Matters.AsNoTracking().CountAsync(m => openStatuses.Contains(m.Status), ct);
        var totalMatters = await db.Matters.AsNoTracking().CountAsync(ct);
        var mattersOpenedYtd = await db.Matters.AsNoTracking().CountAsync(m => m.OpenDate >= ytdStart && m.OpenDate <= today, ct);
        var pendingApprovals = await db.Approvals.AsNoTracking().CountAsync(a => a.Status == ApprovalStatus.Pending, ct);

        // Life-to-date spend for active matters.
        var spendYtd = await db.Invoices.AsNoTracking()
            .Where(i => i.InvoiceDate <= today
                && db.Matters.Any(m => m.MatterId == i.MatterId && openStatuses.Contains(m.Status)))
            .SumAsync(i => i.TotalAmount, ct);
        // Budget for active matters that already have invoices.
        var budgetYtd = await db.Matters.AsNoTracking()
            .Where(m => openStatuses.Contains(m.Status)
                && db.Invoices.Any(i => i.MatterId == m.MatterId && i.InvoiceDate <= today))
            .SumAsync(m => m.BudgetAmount, ct);

        var deadlinesAll = await db.Deadlines.AsNoTracking().ToListAsync(ct);
        var overdue = deadlinesAll.Count(d => d.Status == DeadlineStatus.Overdue);
        var dueSoon = deadlinesAll.Count(d => d.Status == DeadlineStatus.DueSoon);
        var upcoming = deadlinesAll.Count(d => d.Status == DeadlineStatus.Upcoming);
        var total = deadlinesAll.Count;
        var flaggedInvoices = await db.InvoiceLineItems.AsNoTracking().CountAsync(li => li.Flagged, ct);
        var renewalsDue60 = await db.Contracts.AsNoTracking()
            .CountAsync(c => c.RenewalDate.HasValue && c.RenewalDate.Value >= today && c.RenewalDate.Value <= today.AddDays(60), ct);

        // Spend mix for the doughnut (same basis as Spend to Date).
        var spendByPracticeArea = await db.Invoices.AsNoTracking()
            .Where(i => i.InvoiceDate <= today)
            .Join(db.Matters.AsNoTracking(), i => i.MatterId, m => m.MatterId, (i, m) => new { i, m })
            .Where(x => openStatuses.Contains(x.m.Status))
            .Join(db.PracticeAreas.AsNoTracking(), x => x.m.PracticeAreaId, p => p.PracticeAreaId, (x, p) => new { x.i, x.m, p })
            .GroupBy(y => y.p.Name)
            .Select(g => new SpendByPracticeAreaDto(g.Key, g.Sum(y => y.i.TotalAmount), g.Select(y => y.m.MatterId).Distinct().Count()))
            .ToListAsync(ct);

        // Group by year/month in SQL; format yyyy-MM in memory.
        var spendTrendRaw = await db.Invoices.AsNoTracking()
            .Where(i => i.InvoiceDate >= ytdStart && i.InvoiceDate <= today)
            .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(i => i.TotalAmount) })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync(ct);
        var spendTrend = spendTrendRaw
            .Select(x => new SpendTrendPointDto($"{x.Year:D4}-{x.Month:D2}", x.Amount))
            .ToList();

        var openingsRaw = await db.Matters.AsNoTracking()
            .Where(m => m.OpenDate >= ytdStart.AddYears(-1) && m.OpenDate <= today)
            .GroupBy(m => new { m.OpenDate.Year, m.OpenDate.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Opened = g.Count(),
                Closed = g.Count(m => m.Status == MatterStatus.Closed),
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync(ct);
        var openings = openingsRaw
            .Select(x => new MatterOpeningsTrendPointDto($"{x.Year:D4}-{x.Month:D2}", x.Opened, x.Closed))
            .ToList();

        // Monthly sparkline counts for approvals and deadlines.
        var trendStart = new DateOnly(today.Year, today.Month, 1).AddMonths(-11);
        var trendStartDto = new DateTimeOffset(trendStart.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var approvalsRaw = await db.Approvals.AsNoTracking()
            .Where(a => a.RequestedAt >= trendStartDto)
            .GroupBy(a => new { a.RequestedAt.Year, a.RequestedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync(ct);
        var approvalsTrend = approvalsRaw
            .Select(x => new TrendPointDto($"{x.Year:D4}-{x.Month:D2}", x.Count))
            .ToList();

        var deadlinesRaw = await db.Deadlines.AsNoTracking()
            .Where(d => d.DueDate >= trendStart)
            .GroupBy(d => new { d.DueDate.Year, d.DueDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync(ct);
        var deadlinesTrend = deadlinesRaw
            .Select(x => new TrendPointDto($"{x.Year:D4}-{x.Month:D2}", x.Count))
            .ToList();

        return new DashboardSummaryDto(activeMatters, totalMatters, mattersOpenedYtd, pendingApprovals, spendYtd, budgetYtd,
            new DeadlinesSummaryDto(total, overdue, dueSoon, upcoming), spendByPracticeArea, spendTrend, openings,
            approvalsTrend, deadlinesTrend, overdue, renewalsDue60, flaggedInvoices);
    }

    /// <summary>Top 50 open matters ranked by severity for the dashboard grid.</summary>
    public async Task<IReadOnlyList<CriticalMatterDto>> GetCriticalMattersAsync(CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        const int TopN = 50;
        const int StalledDays = 60;

        // Severity score weights.
        const int WOverdue = 4;
        const int WOverBudget = 3;
        const int WEscalated = 2;
        const int WStalled = 1;

        // Open matters for the dashboard card.
        var openStatuses = new[]
        {
            MatterStatus.Intake, MatterStatus.Triage,
            MatterStatus.Active, MatterStatus.OnHold, MatterStatus.Closing
        };

        var matters = await db.Matters.AsNoTracking()
            .Where(m => openStatuses.Contains(m.Status))
            .Include(m => m.Client)
            .Include(m => m.ResponsibleStaff)
            .Include(m => m.PracticeArea)
            .OrderBy(m => m.MatterNumber)
            .Take(TopN)
            .ToListAsync(ct);

        if (matters.Count == 0) return Array.Empty<CriticalMatterDto>();

        var ids = matters.Select(m => m.MatterId).ToList();
        var numbers = matters.Select(m => m.MatterNumber).ToHashSet();
        var idByNumber = matters.ToDictionary(m => m.MatterNumber, m => m.MatterId);

        // Spent per matter.
        var spentByMatter = await db.Invoices.AsNoTracking()
            .Where(i => ids.Contains(i.MatterId))
            .GroupBy(i => i.MatterId)
            .Select(g => new { MatterId = g.Key, Spent = g.Sum(i => i.TotalAmount) })
            .ToDictionaryAsync(x => x.MatterId, x => x.Spent, ct);

        // Overdue matters.
        var overdueIds = (await db.Deadlines.AsNoTracking()
            .Where(d => ids.Contains(d.MatterId) && d.Status == DeadlineStatus.Overdue)
            .Select(d => d.MatterId)
            .Distinct()
            .ToListAsync(ct)).ToHashSet();

        // Next upcoming deadline per matter.
        var nextDeadlineByMatter = new Dictionary<long, Deadline>();
        var upcomingRows = await db.Deadlines.AsNoTracking()
            .Where(d => ids.Contains(d.MatterId)
                && d.DueDate >= today
                && (d.Status == DeadlineStatus.Upcoming || d.Status == DeadlineStatus.DueSoon))
            .OrderBy(d => d.MatterId)
            .ThenBy(d => d.DueDate)
            .ToListAsync(ct);
        foreach (var d in upcomingRows)
        {
            if (!nextDeadlineByMatter.ContainsKey(d.MatterId))
                nextDeadlineByMatter[d.MatterId] = d;
        }

        // Escalated approvals.
        var escalatedNumbers = (await db.Approvals.AsNoTracking()
            .Where(a => a.Status == ApprovalStatus.Escalated && a.MatterNumberRef != null)
            .Select(a => a.MatterNumberRef!)
            .Distinct()
            .ToListAsync(ct)).ToHashSet();
        var escalatedIds = numbers
            .Where(n => escalatedNumbers.Contains(n))
            .Select(n => idByNumber[n])
            .ToHashSet();

        // Stalled matters (no events in 60 days).
        var recentlyActiveIds = (await db.MatterEvents.AsNoTracking()
            .Where(e => ids.Contains(e.MatterId) && e.EventDate >= today.AddDays(-StalledDays))
            .Select(e => e.MatterId)
            .Distinct()
            .ToListAsync(ct)).ToHashSet();
        var stalledIds = new HashSet<long>(ids.Where(id => !recentlyActiveIds.Contains(id)));

        // Build dashboard rows.
        var rows = matters.Select(m =>
        {
            var spent = spentByMatter.TryGetValue(m.MatterId, out var s) ? s : 0m;
            var utilization = m.BudgetAmount > 0
                ? (int)Math.Round(spent / m.BudgetAmount * 100m)
                : 0;
            var overBudget = spent > m.BudgetAmount;
            var overdue = overdueIds.Contains(m.MatterId);
            var escalated = escalatedIds.Contains(m.MatterId);
            var stalled = stalledIds.Contains(m.MatterId);

            var severity = (overdue ? WOverdue : 0)
                         + (overBudget ? WOverBudget : 0)
                         + (escalated ? WEscalated : 0)
                         + (stalled ? WStalled : 0);

            DateOnly? nextDate = null;
            string? nextTitle = null;
            if (nextDeadlineByMatter.TryGetValue(m.MatterId, out var next))
            {
                nextDate = next.DueDate;
                nextTitle = next.Title;
            }
            int? daysToNext = nextDate.HasValue ? nextDate.Value.DayNumber - today.DayNumber : (int?)null;

            return new CriticalMatterDto(
                m.MatterNumber,
                m.Title,
                m.Client.Name,
                m.RiskLevel.ToString(),
                m.Status.ToString(),
                m.PracticeArea.Name,
                m.ResponsibleStaff.FullName,
                Overdue: overdue,
                OverBudget: overBudget,
                Escalated: escalated,
                Stalled: stalled,
                BudgetAmount: m.BudgetAmount,
                SpentAmount: spent,
                BudgetUtilizationPct: utilization,
                NextDeadlineTitle: nextTitle,
                NextDeadlineDate: nextDate,
                DaysToNextDeadline: daysToNext,
                OpenDate: m.OpenDate,
                SeverityScore: severity);
        });

        // Highest severity first.
        return rows
            .OrderByDescending(r => r.SeverityScore)
            .ThenBy(r => r.DaysToNextDeadline.HasValue ? 0 : 1) // nulls last
            .ThenBy(r => r.DaysToNextDeadline ?? int.MaxValue)
            .ThenBy(r => r.MatterNumber)
            .ToList();
    }
}

internal sealed class AnalyticsRepository(LegalDbContext db) : IAnalyticsRepository
{
    public async Task<IReadOnlyList<SpendByDimensionDto>> GetSpendAsync(string groupBy, DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        var start = from ?? new DateOnly(today.Year, 1, 1);
        var end = to ?? today;
        var q = db.Invoices.AsNoTracking()
            .Include(i => i.Firm).Include(i => i.Matter).ThenInclude(m => m.PracticeArea)
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate <= end);
        return groupBy.ToLowerInvariant() switch
        {
            // Aggregate by firm only (not firm+matter) so each bucket is unique.
            "firm" => (await q.GroupBy(i => i.Firm.Name)
                .Select(g => new { Firm = g.Key, Amount = g.Sum(i => i.TotalAmount), MatterCount = g.Select(i => i.MatterId).Distinct().Count() })
                .ToListAsync(ct))
                .Select(x => new SpendByDimensionDto("firm", x.Firm, x.Amount, x.MatterCount))
                .OrderByDescending(x => x.Amount)
                .ToList(),
            "practicearea" => (await q.GroupBy(i => i.Matter.PracticeArea.Name)
                .Select(g => new { PA = g.Key, Amount = g.Sum(i => i.TotalAmount), MatterCount = g.Select(i => i.MatterId).Distinct().Count() })
                .ToListAsync(ct))
                .Select(x => new SpendByDimensionDto("practiceArea", x.PA, x.Amount, x.MatterCount))
                .OrderByDescending(x => x.Amount)
                .ToList(),
            // Group by year/month in SQL; format yyyy-MM in memory.
            "month" => (await q.GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(i => i.TotalAmount), MatterCount = g.Select(i => i.MatterId).Distinct().Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync(ct))
                .Select(x => new SpendByDimensionDto("month", $"{x.Year:D4}-{x.Month:D2}", x.Amount, x.MatterCount))
                .ToList(),
            _ => throw new ArgumentException($"Unknown groupBy '{groupBy}'.", nameof(groupBy))
        };
    }

    /// <summary>Firm or practice-area spend matrix for the analytics heatmap.</summary>
    public async Task<IReadOnlyList<SpendMatrixCellDto>> GetSpendMatrixAsync(string rowDimension, DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        var start = from ?? new DateOnly(today.Year, 1, 1);
        var end = to ?? today;
        var dim = (rowDimension ?? "firm").ToLowerInvariant();
        if (dim is not ("firm" or "practicearea"))
            throw new ArgumentException($"Unknown rowDimension '{rowDimension}'. Use firm or practiceArea.", nameof(rowDimension));

        var q = db.Invoices.AsNoTracking()
            .Include(i => i.Firm)
            .Include(i => i.Matter).ThenInclude(m => m.PracticeArea)
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate <= end);

        if (dim == "firm")
        {
            var raw = await q
                .GroupBy(i => new { Row = i.Firm.Name, i.InvoiceDate.Year, i.InvoiceDate.Month })
                .Select(g => new
                {
                    g.Key.Row,
                    g.Key.Year,
                    g.Key.Month,
                    Amount = g.Sum(i => i.TotalAmount),
                    MatterCount = g.Select(i => i.MatterId).Distinct().Count(),
                })
                .ToListAsync(ct);
            return raw
                .Select(x => new SpendMatrixCellDto(x.Row, $"{x.Year:D4}-{x.Month:D2}", x.Amount, x.MatterCount))
                .OrderBy(x => x.Row).ThenBy(x => x.Column)
                .ToList();
        }

        var rawPa = await q
            .GroupBy(i => new { Row = i.Matter.PracticeArea.Name, i.InvoiceDate.Year, i.InvoiceDate.Month })
            .Select(g => new
            {
                g.Key.Row,
                g.Key.Year,
                g.Key.Month,
                Amount = g.Sum(i => i.TotalAmount),
                MatterCount = g.Select(i => i.MatterId).Distinct().Count(),
            })
            .ToListAsync(ct);
        return rawPa
            .Select(x => new SpendMatrixCellDto(x.Row, $"{x.Year:D4}-{x.Month:D2}", x.Amount, x.MatterCount))
            .OrderBy(x => x.Row).ThenBy(x => x.Column)
            .ToList();
    }

    public async Task<IReadOnlyList<BudgetVsActualDto>> GetBudgetVsActualAsync(string? matterNumber, int? practiceAreaId, CancellationToken ct = default)
    {
        var qd = db.MatterBudgets.AsNoTracking().Include(b => b.Matter).ThenInclude(m => m.PracticeArea).AsQueryable();
        if (!string.IsNullOrWhiteSpace(matterNumber)) qd = qd.Where(b => b.Matter.MatterNumber == matterNumber);
        if (practiceAreaId.HasValue) qd = qd.Where(b => b.Matter.PracticeAreaId == practiceAreaId.Value);
        var rows = await qd.OrderByDescending(b => b.SpentAmount).Take(50).ToListAsync(ct);
        return rows.Select(b => new BudgetVsActualDto(
            b.Matter.MatterNumber, b.Matter.Title, b.BudgetAmount, b.SpentAmount,
            b.BudgetAmount - b.SpentAmount, b.Matter.PracticeArea.Name)).ToList();
    }

    public async Task<IReadOnlyList<MatterCycleTimeDto>> GetCycleTimeAsync(int? practiceAreaId, DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        var start = from ?? today.AddDays(-365);
        var end = to ?? today;
        var qd = db.Matters.AsNoTracking().Include(m => m.PracticeArea).Where(m => m.CloseDate.HasValue && m.CloseDate >= start && m.CloseDate <= end);
        if (practiceAreaId.HasValue) qd = qd.Where(m => m.PracticeAreaId == practiceAreaId.Value);
        var rows = await qd.ToListAsync(ct);
        return rows.GroupBy(m => m.PracticeArea.Name).Select(g =>
        {
            var days = g.Select(m => (m.CloseDate!.Value.DayNumber - m.OpenDate.DayNumber)).OrderBy(x => x).ToList();
            var median = days.Count == 0 ? 0 : (days.Count % 2 == 1 ? days[days.Count / 2] : (days[days.Count / 2 - 1] + days[days.Count / 2]) / 2);
            return new MatterCycleTimeDto(g.Key, g.Count(), median);
        }).ToList();
    }

    public async Task<IReadOnlyList<DeadlineLoadDto>> GetDeadlineLoadAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        var start = from ?? today.AddDays(-60);
        var end = to ?? today.AddDays(120);
        var rows = await db.Deadlines.AsNoTracking().Where(d => d.DueDate >= start && d.DueDate <= end).ToListAsync(ct);
        return rows.GroupBy(d => {
            var ws = d.DueDate.AddDays(-(int)d.DueDate.DayOfWeek + 1); // Monday
            return new DateOnly(ws.Year, ws.Month, ws.Day);
        }).Select(g => new DeadlineLoadDto(
            g.Key.ToString("yyyy-MM-dd"), g.Count(),
            g.Count(d => d.DeadlineType == DeadlineType.CourtDate || d.DeadlineType == DeadlineType.Hearing),
            g.Count(d => d.DeadlineType == DeadlineType.FilingWindow || d.DeadlineType == DeadlineType.MotionResponse),
            g.Count(d => d.DeadlineType == DeadlineType.Renewal),
            g.Count(d => d.DeadlineType == DeadlineType.Discovery || d.DeadlineType == DeadlineType.Deposition)
        )).OrderBy(p => p.WeekStart).ToList();
    }
}
