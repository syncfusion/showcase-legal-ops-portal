using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Domain.Enums;
using LegalMatterContractPortal.Infrastructure.Persistence;
using LegalMatterContractPortal.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;

namespace LegalMatterContractPortal.Infrastructure.Repositories;

internal sealed class ApprovalRepository(LegalDbContext db) : IApprovalRepository
{
    public async Task<IReadOnlyList<ApprovalSummaryDto>> ListAsync(ApprovalListQuery q, CancellationToken ct = default)
    {
        var qd = db.Approvals.AsNoTracking().Include(a => a.ApproverStaff).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Queue) && Enum.TryParse<ApprovalQueue>(q.Queue, true, out var qu)) qd = qd.Where(a => a.Queue == qu);
        if (!string.IsNullOrWhiteSpace(q.Status) && Enum.TryParse<ApprovalStatus>(q.Status, true, out var st)) qd = qd.Where(a => a.Status == st);
        if (!string.IsNullOrWhiteSpace(q.SubjectType) && Enum.TryParse<ApprovalSubjectType>(q.SubjectType, true, out var su)) qd = qd.Where(a => a.SubjectType == su);
        if (q.ApproverStaffId.HasValue) qd = qd.Where(a => a.ApproverStaffId == q.ApproverStaffId.Value);
        var rows = await qd.OrderByDescending(a => a.RequestedAt).ToListAsync(ct);
        return rows.Select(a => new ApprovalSummaryDto(
            a.ApprovalId, a.SubjectType.ToString(), a.SubjectId, a.SubjectTitle, a.Queue.ToString(),
            a.Status.ToString(), a.ApproverStaff?.FullName, a.ThresholdAmount, a.MatterNumberRef,
            a.RequestedAt, a.DecidedAt)).ToList();
    }
}

internal sealed class MatterBudgetRepository(LegalDbContext db) : IMatterBudgetRepository
{
    public async Task<IReadOnlyList<MatterBudgetDto>> ListAsync(BudgetListQuery q, CancellationToken ct = default)
    {
        var qd = db.MatterBudgets.AsNoTracking().Include(b => b.Matter).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.MatterNumber)) qd = qd.Where(b => b.Matter.MatterNumber == q.MatterNumber);
        if (q.OverBudgetOnly) qd = qd.Where(b => b.SpentAmount > b.BudgetAmount);
        var rows = await qd.OrderByDescending(b => b.SpentAmount).ToListAsync(ct);
        return rows.Select(b => new MatterBudgetDto(
            b.BudgetId, b.Matter.MatterNumber, b.Matter.Title, b.Phase, b.Period, b.BudgetAmount, b.SpentAmount,
            b.BudgetAmount - b.SpentAmount, b.SpentAmount > b.BudgetAmount)).ToList();
    }
}

internal sealed class LookupRepository(LegalDbContext db) : ILookupRepository
{
    public async Task<IReadOnlyList<LookupItemDto>> GetAsync(string set, CancellationToken ct = default)
    {
        return set.ToLowerInvariant() switch
        {
            "practice-areas" => (await db.PracticeAreas.AsNoTracking().ToListAsync(ct))
                .Select(p => new LookupItemDto(p.PracticeAreaId.ToString(), p.Name, null)).ToList(),
            "contract-types" => ReferenceData.ContractTypes.Select(t => new LookupItemDto(t, t, null)).ToList(),
            "jurisdictions" => ReferenceData.Jurisdictions.Select(j => new LookupItemDto(j, j, null)).ToList(),
            "utbms" => (await db.UtbmsCodes.AsNoTracking().ToListAsync(ct))
                .Select(c => new LookupItemDto(c.Code, c.Description, c.CodeType.ToString())).ToList(),
            "staff" => (await db.Staff.AsNoTracking().OrderBy(s => s.FullName).ToListAsync(ct))
                .Select(s => new LookupItemDto(s.StaffId.ToString(), s.FullName, s.Role.ToString())).ToList(),
            "firms" => (await db.LawFirms.AsNoTracking().OrderBy(f => f.Name).ToListAsync(ct))
                .Select(f => new LookupItemDto(f.FirmId.ToString(), f.Name, f.Tier.ToString())).ToList(),
            "statuses" => Enum.GetNames<MatterStatus>().Select(n => new LookupItemDto(n, n, "matter")).Concat(
                Enum.GetNames<InvoiceStatus>().Select(n => new LookupItemDto(n, n, "invoice")))
                .Concat(Enum.GetNames<ContractStage>().Select(n => new LookupItemDto(n, n, "contract")))
                .Concat(Enum.GetNames<DeadlineStatus>().Select(n => new LookupItemDto(n, n, "deadline")))
                .Concat(Enum.GetNames<ApprovalStatus>().Select(n => new LookupItemDto(n, n, "approval"))).ToList(),
            _ => throw new ArgumentException($"Unknown lookup set '{set}'.", nameof(set))
        };
    }
}
