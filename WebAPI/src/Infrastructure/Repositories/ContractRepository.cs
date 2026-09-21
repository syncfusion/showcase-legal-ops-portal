using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Domain.Enums;
using LegalMatterContractPortal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LegalMatterContractPortal.Infrastructure.Repositories;

internal sealed class ContractRepository(LegalDbContext db) : IContractRepository
{
    public async Task<PagedResult<ContractSummaryDto>> ListAsync(ContractListQuery q, CancellationToken ct = default)
    {
        var today = SystemAsOf.Today;
        var qd = db.Contracts.AsNoTracking().Include(c => c.Matter).ThenInclude(m => m.ResponsibleStaff).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.MatterNumber)) qd = qd.Where(c => c.Matter.MatterNumber == q.MatterNumber);
        if (!string.IsNullOrWhiteSpace(q.Stage) && Enum.TryParse<ContractStage>(q.Stage, true, out var stage)) qd = qd.Where(c => c.Stage == stage);
        if (!string.IsNullOrWhiteSpace(q.Type)) qd = qd.Where(c => EF.Functions.ILike(c.ContractType, $"%{q.Type}%"));
        if (q.RenewalDueWithinDays.HasValue) qd = qd.Where(c => c.RenewalDate.HasValue && c.RenewalDate.Value >= today && c.RenewalDate.Value <= today.AddDays(q.RenewalDueWithinDays.Value));
        if (!string.IsNullOrWhiteSpace(q.Q)) qd = qd.Where(c =>
            EF.Functions.ILike(c.Title, $"%{q.Q}%") ||
            EF.Functions.ILike(c.Counterparty, $"%{q.Q}%") ||
            EF.Functions.ILike(c.ContractType, $"%{q.Q}%"));

        var totalCount = await qd.CountAsync(ct);
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize <= 0 ? 25 : q.PageSize, 1, 100);
        var rows = await qd.OrderByDescending(c => c.EffectiveDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var items = rows.Select(c => new ContractSummaryDto(
            c.ContractId, c.Matter.MatterNumber, c.Matter.Title, c.Title, c.ContractType, c.Counterparty,
            c.Stage.ToString(), c.EffectiveDate, c.RenewalDate, c.ValueAmount,
            c.RenewalDate.HasValue && c.RenewalDate.Value >= today && c.RenewalDate.Value <= today.AddDays(60),
            c.Matter.ResponsibleStaff?.FullName,
            c.StageEnteredAt
        )).ToList();
        return new PagedResult<ContractSummaryDto> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<ContractDetailDto?> GetByIdAsync(long contractId, CancellationToken ct = default)
    {
        var c = await db.Contracts.AsNoTracking().Include(x => x.Matter).FirstOrDefaultAsync(x => x.ContractId == contractId, ct);
        if (c is null) return null;
        var docCount = await db.Documents.AsNoTracking().CountAsync(d => d.ContractId == contractId, ct);
        var deadlineCount = await db.Deadlines.AsNoTracking().CountAsync(d => d.ContractId == contractId, ct);
        return new ContractDetailDto(c.ContractId, c.Matter.MatterNumber, c.Title, c.ContractType, c.Counterparty,
            c.Stage.ToString(), c.EffectiveDate, c.RenewalDate, c.ValueAmount, docCount, deadlineCount);
    }
}

internal sealed class DeadlineRepository(LegalDbContext db) : IDeadlineRepository
{
    public async Task<IReadOnlyList<DeadlineSummaryDto>> ListAsync(DeadlineListQuery q, CancellationToken ct = default)
    {
        var qd = db.Deadlines.AsNoTracking().Include(d => d.Matter).Include(d => d.OwnerStaff).AsQueryable();
        if (q.From.HasValue) qd = qd.Where(d => d.DueDate >= q.From.Value);
        if (q.To.HasValue) qd = qd.Where(d => d.DueDate <= q.To.Value);
        if (!string.IsNullOrWhiteSpace(q.Status) && Enum.TryParse<DeadlineStatus>(q.Status, true, out var st)) qd = qd.Where(d => d.Status == st);
        if (!string.IsNullOrWhiteSpace(q.Type) && Enum.TryParse<DeadlineType>(q.Type, true, out var tp)) qd = qd.Where(d => d.DeadlineType == tp);
        if (q.OwnerStaffId.HasValue) qd = qd.Where(d => d.OwnerStaffId == q.OwnerStaffId.Value);
        if (q.Upcoming) qd = qd.Where(d => d.Status == DeadlineStatus.Upcoming);
        if (q.Overdue) qd = qd.Where(d => d.Status == DeadlineStatus.Overdue);
        if (q.DueSoon) qd = qd.Where(d => d.Status == DeadlineStatus.DueSoon);
        var rows = await qd.OrderBy(d => d.DueDate).ToListAsync(ct);
        return rows.Select(d => new DeadlineSummaryDto(
            d.Title, d.DeadlineType.ToString(), d.DueDate, d.Status.ToString(), d.Jurisdiction,
            d.OwnerStaff != null ? d.OwnerStaff.FullName : "Unassigned", d.Matter.MatterNumber)).ToList();
    }
}

internal sealed class InvoiceRepository(LegalDbContext db) : IInvoiceRepository
{
    public async Task<PagedResult<InvoiceSummaryDto>> ListAsync(InvoiceListQuery q, CancellationToken ct = default)
    {
        var qd = db.Invoices.AsNoTracking().Include(i => i.Firm).Include(i => i.Matter).Include(i => i.LineItems).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Status) && Enum.TryParse<InvoiceStatus>(q.Status, true, out var st)) qd = qd.Where(i => i.Status == st);
        if (q.FirmId.HasValue) qd = qd.Where(i => i.FirmId == q.FirmId.Value);
        if (!string.IsNullOrWhiteSpace(q.MatterNumber)) qd = qd.Where(i => i.Matter.MatterNumber == q.MatterNumber);
        if (q.FlaggedOnly) qd = qd.Where(i => i.LineItems.Any(li => li.Flagged));
        if (!string.IsNullOrWhiteSpace(q.Q)) qd = qd.Where(i =>
            EF.Functions.ILike(i.InvoiceNumber, $"%{q.Q}%") ||
            EF.Functions.ILike(i.Firm.Name, $"%{q.Q}%") ||
            EF.Functions.ILike(i.Matter.Title, $"%{q.Q}%"));

        var totalCount = await qd.CountAsync(ct);
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize <= 0 ? 25 : q.PageSize, 1, 100);
        var rows = await qd.OrderByDescending(i => i.InvoiceDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var items = rows.Select(i => new InvoiceSummaryDto(
            i.InvoiceNumber, i.Matter.MatterNumber, i.Firm.Name, i.Firm.Tier.ToString(), i.InvoiceDate,
            i.PeriodStart, i.PeriodEnd, i.TotalAmount, i.Status.ToString(),
            i.LineItems.Any(li => li.Flagged), i.Matter.MatterId == 0 ? 0 : i.MatterId)).ToList();
        return new PagedResult<InvoiceSummaryDto> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<InvoiceDetailDto?> GetByInvoiceNumberAsync(string invoiceNumber, CancellationToken ct = default)
    {
        var i = await db.Invoices.AsNoTracking().Include(x => x.Firm).Include(x => x.Matter)
            .FirstOrDefaultAsync(x => x.InvoiceNumber == invoiceNumber, ct);
        if (i is null) return null;
        var flagged = await db.InvoiceLineItems.AsNoTracking().CountAsync(li => li.InvoiceId == i.InvoiceId && li.Flagged, ct);
        var lineCount = await db.InvoiceLineItems.AsNoTracking().CountAsync(li => li.InvoiceId == i.InvoiceId, ct);
        return new InvoiceDetailDto(i.InvoiceNumber, i.Matter.MatterNumber, i.Matter.Title, i.MatterId,
            i.Firm.Name, i.Firm.Tier.ToString(), i.InvoiceDate, i.PeriodStart, i.PeriodEnd, i.TotalAmount,
            i.Status.ToString(), lineCount, flagged, flagged > 0);
    }

    public async Task<IReadOnlyList<InvoiceLineItemDto>> GetLineItemsAsync(string invoiceNumber, bool flaggedOnly, CancellationToken ct = default)
    {
        var i = await db.Invoices.AsNoTracking().FirstOrDefaultAsync(x => x.InvoiceNumber == invoiceNumber, ct);
        if (i is null) return [];
        var qd = db.InvoiceLineItems.AsNoTracking().Where(li => li.InvoiceId == i.InvoiceId);
        if (flaggedOnly) qd = qd.Where(li => li.Flagged);
        return await qd.OrderBy(li => li.LineItemId).Select(li => new InvoiceLineItemDto(
            li.LineItemId, li.TaskCode, li.ActivityCode, li.ExpenseCode, li.Narrative, li.Hours, li.Rate,
            li.Amount, li.Flagged, li.FlagReason)).ToListAsync(ct);
    }
}
