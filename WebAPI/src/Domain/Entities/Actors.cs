using LegalMatterContractPortal.Domain.Enums;

namespace LegalMatterContractPortal.Domain.Entities;

/// <summary>Requesting business unit (internal) or external client.</summary>
public sealed class Client
{
    public long ClientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ClientType Type { get; set; }
    public string Industry { get; set; } = string.Empty;
    public string? PrimaryContact { get; set; }
    public string? ContactEmail { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Matter> Matters { get; set; } = new List<Matter>();
}

/// <summary>Internal counsel / paralegal / legal-ops staff member.</summary>
public sealed class Staff
{
    public long StaffId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public StaffRole Role { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? BarJurisdiction { get; set; }
    public bool Active { get; set; }

    public ICollection<Matter> ResponsibleMatters { get; set; } = new List<Matter>();
    public ICollection<Approval> Approvals { get; set; } = new List<Approval>();
    public ICollection<Deadline> OwnedDeadlines { get; set; } = new List<Deadline>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}

/// <summary>Outside counsel vendor / law firm.</summary>
public sealed class LawFirm
{
    public long FirmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public FirmTier Tier { get; set; }
    public decimal DefaultRate { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? PracticeFocus { get; set; }

    public ICollection<Matter> Matters { get; set; } = new List<Matter>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}

/// <summary>Reference: legal practice areas (litigation, corporate, IP, etc.).</summary>
public sealed class PracticeArea
{
    public int PracticeAreaId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<Matter> Matters { get; set; } = new List<Matter>();
}
