using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Enums;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Domain.Enums;
using LegalMatterContractPortal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LegalMatterContractPortal.Infrastructure.Repositories;
internal sealed class MatterRepository(LegalDbContext db) : IMatterRepository
{
    public async Task<PagedResult<MatterSummaryDto>> ListAsync(MatterListQuery q, CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        var qd = db.Matters
            .AsNoTracking()
            .Include(m => m.Client)
            .Include(m => m.ResponsibleStaff)
            .Include(m => m.Firm)
            .Include(m => m.PracticeArea)
            .AsQueryable();

        if (q.Status.HasValue) qd = ApplyStatusFilter(qd, q.Status.Value);
        if (q.PracticeAreaId.HasValue) qd = qd.Where(m => m.PracticeAreaId == q.PracticeAreaId.Value);
        if (q.FirmId.HasValue) qd = qd.Where(m => m.FirmId == q.FirmId.Value);
        if (q.ClientId.HasValue) qd = qd.Where(m => m.ClientId == q.ClientId.Value);
        if (!string.IsNullOrWhiteSpace(q.RiskLevel) && Enum.TryParse<RiskLevel>(q.RiskLevel, true, out var rl)) qd = qd.Where(m => m.RiskLevel == rl);
        if (!string.IsNullOrWhiteSpace(q.MatterType) && Enum.TryParse<MatterType>(q.MatterType, true, out var mt)) qd = qd.Where(m => m.MatterType == mt);
        if (q.Recent == true) qd = qd.Where(m => m.OpenDate >= today.AddDays(-90));
        if (!string.IsNullOrWhiteSpace(q.Q)) qd = qd.Where(m =>
            EF.Functions.ILike(m.Title, $"%{q.Q}%") ||
            EF.Functions.ILike(m.MatterNumber, $"%{q.Q}%") ||
            EF.Functions.ILike(m.Client.Name, $"%{q.Q}%"));

        var totalCount = await qd.CountAsync(ct);
        qd = ApplySort(qd, q.Sort);
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize <= 0 ? 25 : q.PageSize, 1, 100);
        var rows = await qd.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        // Per-matter spend is opt-in.
        Dictionary<long, decimal> spentByMatter;
        if (q.IncludeSpent == true)
        {
            var ids = rows.Select(r => r.MatterId).ToList();
            spentByMatter = await db.Invoices.AsNoTracking()
                .Where(i => ids.Contains(i.MatterId))
                .GroupBy(i => i.MatterId)
                .Select(g => new { MatterId = g.Key, Spent = g.Sum(i => i.TotalAmount) })
                .ToDictionaryAsync(x => x.MatterId, x => x.Spent, ct);
        }
        else
        {
            // No spend loaded.
            spentByMatter = new Dictionary<long, decimal>(0);
        }

        // Map rows; missing navigations stay empty.
        var items = rows.Select(r => new MatterSummaryDto(
            r.MatterNumber,
            r.Title,
            r.Client?.Name ?? "Unknown client",
            r.Client?.Type.ToString() ?? "External",
            r.PracticeArea?.Name ?? "General",
            r.MatterType.ToString(),
            r.ResponsibleStaff?.FullName ?? "Unassigned",
            r.Firm?.Name,
            r.Status.ToString(),
            r.RiskLevel.ToString(),
            r.OpenDate,
            r.CloseDate,
            r.BudgetAmount,
            spentByMatter.TryGetValue(r.MatterId, out var s) ? s : 0m
        )).ToList();
        return new PagedResult<MatterSummaryDto> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<MatterDetailDto?> GetByMatterNumberAsync(string matterNumber, CancellationToken ct = default)
    {
        var m = await db.Matters.AsNoTracking()
            .Include(x => x.Client)
            .Include(x => x.ResponsibleStaff)
            .Include(x => x.Firm)
            .Include(x => x.PracticeArea)
            .FirstOrDefaultAsync(x => x.MatterNumber == matterNumber, ct);
        if (m is null) return null;

        var spent = await db.Invoices.AsNoTracking().Where(i => i.MatterId == m.MatterId).SumAsync(i => i.TotalAmount, ct);
        var contractCount = await db.Contracts.AsNoTracking().CountAsync(c => c.MatterId == m.MatterId, ct);
        var documentCount = await db.Documents.AsNoTracking().CountAsync(d => d.MatterId == m.MatterId, ct);
        var eventCount = await db.MatterEvents.AsNoTracking().CountAsync(e => e.MatterId == m.MatterId, ct);
        var deadlineCount = await db.Deadlines.AsNoTracking().CountAsync(d => d.MatterId == m.MatterId, ct);
        var invoiceCount = await db.Invoices.AsNoTracking().CountAsync(i => i.MatterId == m.MatterId, ct);
        var nextDeadline = await db.Deadlines.AsNoTracking()
            .Where(d => d.MatterId == m.MatterId && d.DueDate >= SystemAsOf.Today && (d.Status == DeadlineStatus.Upcoming || d.Status == DeadlineStatus.DueSoon))
            .OrderBy(d => d.DueDate)
            .Select(d => new DeadlineSummaryDto(d.Title, d.DeadlineType.ToString(), d.DueDate, d.Status.ToString(), d.Jurisdiction, d.OwnerStaff != null ? d.OwnerStaff.FullName : "Unassigned", m.MatterNumber))
            .FirstOrDefaultAsync(ct);
        var tz = TimeZoneInfo.Utc;
        return new MatterDetailDto(
            m.MatterNumber, m.Title, m.Description ?? string.Empty, m.Client.Name, m.Client.Type.ToString(),
            m.Client.Industry, m.PracticeArea.Name, m.MatterType.ToString(), m.ResponsibleStaff.FullName,
            m.ResponsibleStaff.Email, m.Firm?.Name, m.Firm?.Tier.ToString() ?? string.Empty,
            m.Status.ToString(), m.RiskLevel.ToString(), m.OpenDate, m.CloseDate, m.BudgetAmount, spent,
            contractCount, documentCount, eventCount, deadlineCount, invoiceCount, nextDeadline);
    }

    public async Task<IReadOnlyList<DeadlineSummaryDto>> GetTimelineAsync(string matterNumber, DateOnly? from, DateOnly? to, string? type, CancellationToken ct = default)
    {
        // Timeline is built from deadlines.
        var m = await db.Matters.AsNoTracking().FirstOrDefaultAsync(x => x.MatterNumber == matterNumber, ct);
        if (m is null) return [];
        var q = db.Deadlines.AsNoTracking().Where(d => d.MatterId == m.MatterId);
        if (from.HasValue) q = q.Where(d => d.DueDate >= from.Value);
        if (to.HasValue) q = q.Where(d => d.DueDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<DeadlineType>(type, true, out var dt))
            q = q.Where(d => d.DeadlineType == dt);
        return await q
            .OrderBy(d => d.DueDate)
            .Select(d => new DeadlineSummaryDto(
                d.Title,
                d.DeadlineType.ToString(),
                d.DueDate,
                d.Status.ToString(),
                d.Jurisdiction,
                d.OwnerStaff != null ? d.OwnerStaff.FullName : "Unassigned",
                m.MatterNumber))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<DocumentNodeDto>> GetDocumentsAsync(string matterNumber, string? folderPath, CancellationToken ct = default)
    {
        var m = await db.Matters.AsNoTracking().FirstOrDefaultAsync(x => x.MatterNumber == matterNumber, ct);
        if (m is null) return [];
        var q = db.Documents.AsNoTracking().Where(d => d.MatterId == m.MatterId);
        if (!string.IsNullOrWhiteSpace(folderPath)) q = q.Where(d => EF.Functions.ILike(d.FolderPath, $"%{folderPath}%"));
        return await q.OrderByDescending(d => d.CreatedAt).Select(d => new DocumentNodeDto(
            d.DocumentId, d.FileName, d.FolderPath, d.MimeType, d.DocumentType.ToString(), d.Version, d.SizeBytes,
            d.UploadedBy != null ? d.UploadedBy.FullName : "system", DateOnly.FromDateTime(d.CreatedAt.DateTime), d.ContractId, d.MatterId, d.Matter.MatterNumber)).ToListAsync(ct);
    }

    public bool MatterExists(string matterNumber) => db.Matters.AsNoTracking().Any(m => m.MatterNumber == matterNumber);

    private static IQueryable<Domain.Entities.Matter> ApplyStatusFilter(IQueryable<Domain.Entities.Matter> qd, MatterStatusFilter s) => s switch
    {
        MatterStatusFilter.Active => qd.Where(m => m.Status != MatterStatus.Closed && m.Status != MatterStatus.Rejected),
        MatterStatusFilter.Closed => qd.Where(m => m.Status == MatterStatus.Closed),
        MatterStatusFilter.Rejected => qd.Where(m => m.Status == MatterStatus.Rejected),
        MatterStatusFilter.Overdue => qd.Where(m => m.Status != MatterStatus.Closed),
        _ => qd
    };

    private static IQueryable<Domain.Entities.Matter> ApplySort(IQueryable<Domain.Entities.Matter> qd, string? sort)
    {
        if (string.IsNullOrWhiteSpace(sort)) return qd.OrderByDescending(m => m.OpenDate);
        var parts = sort.Split(':');
        var field = parts[0]; var dir = parts.Length > 1 && parts[1].Equals("asc", StringComparison.OrdinalIgnoreCase) ? "asc" : "desc";
        return (field.ToLowerInvariant()) switch
        {
            "title" => dir == "asc" ? qd.OrderBy(m => m.Title) : qd.OrderByDescending(m => m.Title),
            "status" => dir == "asc" ? qd.OrderBy(m => m.Status) : qd.OrderByDescending(m => m.Status),
            "risklevel" => dir == "asc" ? qd.OrderBy(m => m.RiskLevel) : qd.OrderByDescending(m => m.RiskLevel),
            "budgetamount" => dir == "asc" ? qd.OrderBy(m => m.BudgetAmount) : qd.OrderByDescending(m => m.BudgetAmount),
            "opendate" => dir == "asc" ? qd.OrderBy(m => m.OpenDate) : qd.OrderByDescending(m => m.OpenDate),
            "matternumber" => dir == "asc" ? qd.OrderBy(m => m.MatterNumber) : qd.OrderByDescending(m => m.MatterNumber),
            _ => qd.OrderByDescending(m => m.OpenDate)
        };
    }
}
