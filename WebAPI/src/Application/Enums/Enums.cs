namespace LegalMatterContractPortal.Application.Enums;

/// <summary>Open-matter filter used by list queries.</summary>
public enum MatterStatusFilter
{
    Active,      // Intake, Triage, Active, OnHold, Closing
    Closed,      // Closed
    Rejected,
    Overdue,
    All
}
