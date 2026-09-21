namespace LegalMatterContractPortal.Domain.Enums;

/// <summary>Whether the client is an internal business unit or external customer.</summary>
public enum ClientType
{
    Internal,
    External
}

/// <summary>Matter lifecycle states.</summary>
public enum MatterStatus
{
    Intake,
    Triage,
    Active,
    OnHold,
    Closing,
    Closed,
    Rejected
}

/// <summary>Matter risk classification.</summary>
public enum RiskLevel
{
    Low,
    Medium,
    High
}

/// <summary>Top-level legal work category.</summary>
public enum MatterType
{
    Litigation,
    Advisory,
    Transaction,
    Investigation,
    Contract
}

/// <summary>Contract lifecycle stages.</summary>
public enum ContractStage
{
    Draft,
    InReview,
    InNegotiation,
    PendingApproval,
    Executed,
    Active,
    RenewalDue,
    Expired,
    Terminated
}

/// <summary>Legal document categories.</summary>
public enum DocumentType
{
    Contract,
    Nda,
    Msa,
    SaasAgreement,
    ServiceAgreement,
    Complaint,
    Motion,
    CourtFiling,
    DepositionTranscript,
    Correspondence,
    Pleading,
    Evidence,
    Memo,
    Email,
    Spreadsheet,
    Image
}

/// <summary>Matter timeline event categories.</summary>
public enum MatterEventType
{
    IntakeLogged,
    StaffAssigned,
    DocumentUploaded,
    ContractAdded,
    DeadlineSet,
    StatusChanged,
    NoteAdded,
    InvoiceReceived,
    ApprovalRequested,
    ApprovalDecided,
    FilingRecorded,
    DepositionHeld,
    SettlementReached,
    MatterClosed
}

/// <summary>Deadline categories.</summary>
public enum DeadlineType
{
    CourtDate,
    FilingWindow,
    StatuteOfLimitations,
    Renewal,
    Discovery,
    Deposition,
    MotionResponse,
    Hearing,
    Milestone
}

/// <summary>Deadline lifecycle states.</summary>
public enum DeadlineStatus
{
    Upcoming,
    DueSoon,
    Overdue,
    Completed,
    Waived
}

/// <summary>Invoice lifecycle states.</summary>
public enum InvoiceStatus
{
    Received,
    UnderReview,
    Flagged,
    Approved,
    Rejected,
    Paid
}

/// <summary>Approval lifecycle states.</summary>
public enum ApprovalStatus
{
    Pending,
    Approved,
    Rejected,
    Escalated
}

/// <summary>Subject of an approval record (polymorphic).</summary>
public enum ApprovalSubjectType
{
    Invoice,
    Contract,
    Matter
}

/// <summary>Approval work queue (which lane on the Kanban).</summary>
public enum ApprovalQueue
{
    InvoiceReview,
    ContractExecution,
    MatterIntake,
    BudgetOverrun
}

/// <summary>UTBMS code taxonomy.</summary>
public enum UtbmsCodeType
{
    Task,
    Activity,
    Expense
}

/// <summary>Law firm relationship tier.</summary>
public enum FirmTier
{
    Preferred,
    Strategic,
    Panel,
    AdHoc
}

/// <summary>Internal staff roles.</summary>
public enum StaffRole
{
    GeneralCounsel,
    ManagingCounsel,
    SeniorCounsel,
    Counsel,
    Paralegal,
    LegalOps,
    Compliance,
    ContractAnalyst
}
