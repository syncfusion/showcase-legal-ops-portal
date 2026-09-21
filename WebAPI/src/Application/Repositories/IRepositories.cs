using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Enums;
using LegalMatterContractPortal.Application.Models;

namespace LegalMatterContractPortal.Application.Repositories;

public sealed class ContractListQuery : ListQuery
{
    public string? MatterNumber { get; set; }
    public string? Stage { get; set; }
    public int? RenewalDueWithinDays { get; set; }
    public string? Type { get; set; }
}

public sealed class DeadlineListQuery
{
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public string? Status { get; set; }
    public string? Type { get; set; }
    public long? OwnerStaffId { get; set; }
    public bool Upcoming { get; set; }  // status filter used by scheduler
    public bool Overdue { get; set; }
    public bool DueSoon { get; set; }
}

public sealed class InvoiceListQuery : ListQuery
{
    public string? Status { get; set; }
    public long? FirmId { get; set; }
    public string? MatterNumber { get; set; }
    public bool FlaggedOnly { get; set; }
}

public sealed class ApprovalListQuery
{
    public string? Queue { get; set; }
    public string? Status { get; set; }
    public string? SubjectType { get; set; }
    public long? ApproverStaffId { get; set; }
}

public sealed class BudgetListQuery
{
    public string? MatterNumber { get; set; }
    public bool OverBudgetOnly { get; set; }
}

public interface IContractRepository
{
    Task<PagedResult<ContractSummaryDto>> ListAsync(ContractListQuery query, CancellationToken ct = default);
    Task<ContractDetailDto?> GetByIdAsync(long contractId, CancellationToken ct = default);
}

public interface IDeadlineRepository
{
    Task<IReadOnlyList<DeadlineSummaryDto>> ListAsync(DeadlineListQuery query, CancellationToken ct = default);
}

public interface IInvoiceRepository
{
    Task<PagedResult<InvoiceSummaryDto>> ListAsync(InvoiceListQuery query, CancellationToken ct = default);
    Task<InvoiceDetailDto?> GetByInvoiceNumberAsync(string invoiceNumber, CancellationToken ct = default);
    Task<IReadOnlyList<InvoiceLineItemDto>> GetLineItemsAsync(string invoiceNumber, bool flaggedOnly, CancellationToken ct = default);
}

public interface IApprovalRepository
{
    Task<IReadOnlyList<ApprovalSummaryDto>> ListAsync(ApprovalListQuery query, CancellationToken ct = default);
}

public interface IMatterBudgetRepository
{
    Task<IReadOnlyList<MatterBudgetDto>> ListAsync(BudgetListQuery query, CancellationToken ct = default);
}

public interface ILookupRepository
{
    Task<IReadOnlyList<LookupItemDto>> GetAsync(string set, CancellationToken ct = default);
}

public interface IDashboardRepository
{
    Task<DashboardSummaryDto> GetSummaryAsync(DateOnly? asOf, CancellationToken ct = default);
    Task<IReadOnlyList<CriticalMatterDto>> GetCriticalMattersAsync(CancellationToken ct = default);
}

public interface IAnalyticsRepository
{
    Task<IReadOnlyList<SpendByDimensionDto>> GetSpendAsync(string groupBy, DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<SpendMatrixCellDto>> GetSpendMatrixAsync(string rowDimension, DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<BudgetVsActualDto>> GetBudgetVsActualAsync(string? matterNumber, int? practiceAreaId, CancellationToken ct = default);
    Task<IReadOnlyList<MatterCycleTimeDto>> GetCycleTimeAsync(int? practiceAreaId, DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<DeadlineLoadDto>> GetDeadlineLoadAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
}
