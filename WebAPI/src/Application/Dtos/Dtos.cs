namespace LegalMatterContractPortal.Application.Dtos;

public sealed record DashboardSummaryDto(
    int ActiveMatters,
    int TotalMatters,
    int MattersOpenedYtd,
    int PendingApprovals,
    decimal SpendYtd,
    decimal BudgetYtd,
    DeadlinesSummaryDto OpenDeadlines,
    IReadOnlyList<SpendByPracticeAreaDto> SpendByPracticeArea,
    IReadOnlyList<SpendTrendPointDto> SpendTrend,
    IReadOnlyList<MatterOpeningsTrendPointDto> MatterOpeningsTrend,
    IReadOnlyList<TrendPointDto> ApprovalsTrend,
    IReadOnlyList<TrendPointDto> DeadlinesTrend,
    int OverdueDeadlines,
    int RenewalsDueWithin60Days,
    int FlaggedInvoices);

public sealed record DeadlinesSummaryDto(int Total, int Overdue, int DueSoon, int Upcoming);
public sealed record SpendByPracticeAreaDto(string PracticeArea, decimal Amount, int MatterCount);
public sealed record SpendTrendPointDto(string Month, decimal Amount);
public sealed record MatterOpeningsTrendPointDto(string Month, int Opened, int Closed);
public sealed record TrendPointDto(string Month, int Count);

public sealed record LookupItemDto(string Code, string Name, string? Category);

public sealed record MatterSummaryDto(
    string MatterNumber,
    string Title,
    string Client,
    string ClientType,
    string PracticeArea,
    string MatterType,
    string ResponsibleAttorney,
    string? Firm,
    string Status,
    string RiskLevel,
    DateOnly OpenDate,
    DateOnly? CloseDate,
    decimal BudgetAmount,
    decimal SpentAmount);   // sum of related approved/paid invoices

/// <summary>Dashboard Critical Matters row with risk flags and next deadline.</summary>
public sealed record CriticalMatterDto(
    string MatterNumber,
    string Title,
    string Client,
    string RiskTier,
    string Status,
    string PracticeArea,
    string ResponsibleAttorney,
    bool Overdue,
    bool OverBudget,
    bool Escalated,
    bool Stalled,
    decimal BudgetAmount,
    decimal SpentAmount,
    int BudgetUtilizationPct,
    string? NextDeadlineTitle,
    DateOnly? NextDeadlineDate,
    int? DaysToNextDeadline,
    DateOnly OpenDate,
    int SeverityScore);

public sealed record MatterDetailDto(
    string MatterNumber,
    string Title,
    string Description,
    string Client,
    string ClientType,
    string ClientIndustry,
    string PracticeArea,
    string MatterType,
    string ResponsibleAttorney,
    string ResponsibleAttorneyEmail,
    string? Firm,
    string FirmTier,
    string Status,
    string RiskLevel,
    DateOnly OpenDate,
    DateOnly? CloseDate,
    decimal BudgetAmount,
    decimal SpentAmount,
    int ContractCount,
    int DocumentCount,
    int EventCount,
    int DeadlineCount,
    int InvoiceCount,
    DeadlineSummaryDto? NextDeadline);

public sealed record DeadlineSummaryDto(string Title, string DeadlineType, DateOnly DueDate, string Status, string Jurisdiction, string Owner, string MatterNumber);

public sealed record ContractSummaryDto(
    long ContractId,
    string MatterNumber,
    string MatterTitle,
    string Title,
    string ContractType,
    string Counterparty,
    string Stage,
    DateOnly EffectiveDate,
    DateOnly? RenewalDate,
    decimal ValueAmount,
    bool RenewalDueSoon,
    string? ResponsibleAttorney,
    DateTimeOffset StageEnteredAt);

public sealed record ContractDetailDto(
    long ContractId,
    string MatterNumber,
    string Title,
    string ContractType,
    string Counterparty,
    string Stage,
    DateOnly EffectiveDate,
    DateOnly? RenewalDate,
    decimal ValueAmount,
    long DocumentCount,
    long DeadlineCount);

public sealed record DocumentNodeDto(
    long DocumentId,
    string FileName,
    string FolderPath,
    string MimeType,
    string DocumentType,
    int Version,
    long SizeBytes,
    string UploadedBy,
    DateOnly CreatedAt,
    long? ContractId,
    long MatterId,
    string MatterNumber);

public sealed record InvoiceSummaryDto(
    string InvoiceNumber,
    string MatterNumber,
    string Firm,
    string FirmTier,
    DateOnly InvoiceDate,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal TotalAmount,
    string Status,
    bool HasFlaggedItems,
    long MatterId);

public sealed record InvoiceDetailDto(
    string InvoiceNumber,
    string MatterNumber,
    string MatterTitle,
    long MatterId,
    string Firm,
    string FirmTier,
    DateOnly InvoiceDate,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal TotalAmount,
    string Status,
    long LineItemCount,
    long FlaggedLineItemCount,
    bool HasFlaggedItems);

public sealed record InvoiceLineItemDto(
    long LineItemId,
    string? TaskCode,
    string? ActivityCode,
    string? ExpenseCode,
    string Narrative,
    decimal? Hours,
    decimal? Rate,
    decimal Amount,
    bool Flagged,
    string? FlagReason);

public sealed record ApprovalSummaryDto(
    long ApprovalId,
    string SubjectType,
    string SubjectId,
    string? SubjectTitle,
    string Queue,
    string Status,
    string? Approver,
    decimal? ThresholdAmount,
    string? MatterNumber,
    DateTimeOffset RequestedAt,
    DateTimeOffset? DecidedAt);

public sealed record MatterBudgetDto(
    long BudgetId,
    string MatterNumber,
    string MatterTitle,
    string Phase,
    string Period,
    decimal BudgetAmount,
    decimal SpentAmount,
    decimal Variance,
    bool OverBudget);

public sealed record SpendByDimensionDto(string Dimension, string Bucket, decimal Amount, int MatterCount);

/// <summary>One spend heat-map cell (row × month).</summary>
/// <param name="Row">Firm name or practice-area name.</param>
/// <param name="Column">Month bucket as yyyy-MM.</param>
/// <param name="Amount">Σ invoice total for that cell.</param>
/// <param name="MatterCount">Distinct matters billed in that cell.</param>
public sealed record SpendMatrixCellDto(string Row, string Column, decimal Amount, int MatterCount);

public sealed record BudgetVsActualDto(string MatterNumber, string MatterTitle, decimal Budget, decimal Actual, decimal Variance, string PracticeArea);
public sealed record MatterCycleTimeDto(string PracticeArea, int MatterCount, double MedianDaysOpen);
public sealed record DeadlineLoadDto(string WeekStart, int Count, int CourtDate, int Filing, int Renewal, int Discovery);
