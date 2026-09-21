using LegalMatterContractPortal.Domain.Enums;

namespace LegalMatterContractPortal.Domain.Entities;

/// <summary>Matter deadline.</summary>
public sealed class Deadline
{
    public long DeadlineId { get; set; }
    public long MatterId { get; set; }
    public Matter Matter { get; set; } = null!;
    public long? ContractId { get; set; }
    public Contract? Contract { get; set; }
    public string Title { get; set; } = string.Empty;
    public DeadlineType DeadlineType { get; set; }
    public DateOnly DueDate { get; set; }
    public DeadlineStatus Status { get; set; }
    public string Jurisdiction { get; set; } = string.Empty;
    public long? OwnerStaffId { get; set; }
    public Staff? OwnerStaff { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>Outside-counsel invoice.</summary>
public sealed class Invoice
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;          // INV-2026-00521
    public long MatterId { get; set; }
    public Matter Matter { get; set; } = null!;
    public long FirmId { get; set; }
    public LawFirm Firm { get; set; } = null!;
    public DateOnly InvoiceDate { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<InvoiceLineItem> LineItems { get; set; } = new List<InvoiceLineItem>();
}

/// <summary>Invoice line item.</summary>
public sealed class InvoiceLineItem
{
    public long LineItemId { get; set; }
    public long InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public string? TaskCode { get; set; }     // L110, L120...
    public string? ActivityCode { get; set; }  // A101...
    public string? ExpenseCode { get; set; }   // E101...
    public string Narrative { get; set; } = string.Empty;
    public decimal? Hours { get; set; }
    public decimal? Rate { get; set; }
    public decimal Amount { get; set; }
    public bool Flagged { get; set; }
    public string? FlagReason { get; set; }   // block-billing | rate-increase | duplicate | out-of-scope
}

/// <summary>Matter budget.</summary>
public sealed class MatterBudget
{
    public long BudgetId { get; set; }
    public long MatterId { get; set; }
    public Matter Matter { get; set; } = null!;
    public string Phase { get; set; } = string.Empty;
    public decimal BudgetAmount { get; set; }
    public decimal SpentAmount { get; set; }
    public string Period { get; set; } = string.Empty;        // FY2026-Q1, FY2026-H1...
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>Approval queue record.</summary>
public sealed class Approval
{
    public long ApprovalId { get; set; }
    public ApprovalSubjectType SubjectType { get; set; }
    public string SubjectId { get; set; } = string.Empty;     // matter_number / invoice_number / contract display id
    public string? SubjectTitle { get; set; }
    public ApprovalQueue Queue { get; set; }
    public ApprovalStatus Status { get; set; }
    public long? ApproverStaffId { get; set; }
    public Staff? ApproverStaff { get; set; }
    public decimal? ThresholdAmount { get; set; }
    public string? MatterNumberRef { get; set; }              // for drill-through
    public DateTimeOffset RequestedAt { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
}

/// <summary>Time entry on a matter.</summary>
public sealed class TimeEntry
{
    public long TimeEntryId { get; set; }
    public long MatterId { get; set; }
    public Matter Matter { get; set; } = null!;
    public long StaffId { get; set; }
    public Staff Staff { get; set; } = null!;
    public string? TaskCode { get; set; }
    public decimal Hours { get; set; }
    public DateOnly EntryDate { get; set; }
    public string Narrative { get; set; } = string.Empty;
}

/// <summary>UTBMS code.</summary>
public sealed class UtbmsCode
{
    public string Code { get; set; } = string.Empty;            // PK
    public UtbmsCodeType CodeType { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PracticeArea { get; set; }
}
