using LegalMatterContractPortal.Domain.Enums;

namespace LegalMatterContractPortal.Domain.Entities;

/// <summary>Legal matter.</summary>
public sealed class Matter
{
    public long MatterId { get; set; }
    public string MatterNumber { get; set; } = string.Empty;          // MAT-2026-0142
    public string Title { get; set; } = string.Empty;
    public long ClientId { get; set; }
    public Client Client { get; set; } = null!;
    public int PracticeAreaId { get; set; }
    public PracticeArea PracticeArea { get; set; } = null!;
    public MatterType MatterType { get; set; }
    public long ResponsibleStaffId { get; set; }
    public Staff ResponsibleStaff { get; set; } = null!;
    public long? FirmId { get; set; }                                  // null = in-house
    public LawFirm? Firm { get; set; }
    public MatterStatus Status { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public DateOnly OpenDate { get; set; }
    public DateOnly? CloseDate { get; set; }
    public decimal BudgetAmount { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Contract> Contracts { get; set; } = new List<Contract>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<MatterEvent> Events { get; set; } = new List<MatterEvent>();
    public ICollection<Deadline> Deadlines { get; set; } = new List<Deadline>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<MatterBudget> Budgets { get; set; } = new List<MatterBudget>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}

/// <summary>Agreement executed under a matter.</summary>
public sealed class Contract
{
    public long ContractId { get; set; }
    public long MatterId { get; set; }
    public Matter Matter { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string ContractType { get; set; } = string.Empty;          // MSA, NDA, SaaS Agreement, Service Agreement...
    public string Counterparty { get; set; } = string.Empty;
    public ContractStage Stage { get; set; }
    public DateOnly EffectiveDate { get; set; }
    public DateOnly? RenewalDate { get; set; }
    public decimal ValueAmount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    /// <summary>When the contract entered its current stage.</summary>
    public DateTimeOffset StageEnteredAt { get; set; }

    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<Deadline> Deadlines { get; set; } = new List<Deadline>();
}

/// <summary>Document in a matter repository.</summary>
public sealed class Document
{
    public long DocumentId { get; set; }
    public long MatterId { get; set; }
    public Matter Matter { get; set; } = null!;
    public long? ContractId { get; set; }
    public Contract? Contract { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public string FolderPath { get; set; } = string.Empty;
    public DocumentType DocumentType { get; set; }
    public int Version { get; set; }
    public long SizeBytes { get; set; }
    public long? UploadedByStaffId { get; set; }
    public Staff? UploadedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>Timeline entry on a matter.</summary>
public sealed class MatterEvent
{
    public long EventId { get; set; }
    public long MatterId { get; set; }
    public Matter Matter { get; set; } = null!;
    public MatterEventType EventType { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateOnly EventDate { get; set; }
    public long? ActorStaffId { get; set; }
    public Staff? ActorStaff { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
