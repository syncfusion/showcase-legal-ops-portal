using LegalMatterContractPortal.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LegalMatterContractPortal.Infrastructure.Persistence.Configurations;

internal sealed class UtbmsCodeConfiguration : IEntityTypeConfiguration<UtbmsCode>
{
    public void Configure(EntityTypeBuilder<UtbmsCode> b)
    {
        b.ToTable("utbms_code");
        b.HasKey(x => x.Code);
        b.Property(x => x.Code).HasMaxLength(6);
        b.Property(x => x.Description).HasMaxLength(160);
        b.Property(x => x.PracticeArea).HasMaxLength(60);
    }
}

internal sealed class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> b)
    {
        b.ToTable("client");
        b.HasKey(x => x.ClientId);
        b.Property(x => x.Name).HasMaxLength(120);
        b.Property(x => x.Industry).HasMaxLength(60);
        b.Property(x => x.PrimaryContact).HasMaxLength(120);
        b.Property(x => x.ContactEmail).HasMaxLength(160);
        b.HasIndex(x => x.Name);
    }
}

internal sealed class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    public void Configure(EntityTypeBuilder<Staff> b)
    {
        b.ToTable("staff");
        b.HasKey(x => x.StaffId);
        b.Property(x => x.FullName).HasMaxLength(120);
        b.Property(x => x.Email).HasMaxLength(160);
        b.Property(x => x.BarJurisdiction).HasMaxLength(60);
        b.HasIndex(x => x.FullName);
    }
}

internal sealed class LawFirmConfiguration : IEntityTypeConfiguration<LawFirm>
{
    public void Configure(EntityTypeBuilder<LawFirm> b)
    {
        b.ToTable("law_firm");
        b.HasKey(x => x.FirmId);
        b.Property(x => x.Name).HasMaxLength(120);
        b.Property(x => x.City).HasMaxLength(60);
        b.Property(x => x.State).HasMaxLength(40);
        b.Property(x => x.PracticeFocus).HasMaxLength(120);
        b.HasIndex(x => x.Name);
    }
}

internal sealed class PracticeAreaConfiguration : IEntityTypeConfiguration<PracticeArea>
{
    public void Configure(EntityTypeBuilder<PracticeArea> b)
    {
        b.ToTable("practice_area");
        b.HasKey(x => x.PracticeAreaId);
        b.Property(x => x.Name).HasMaxLength(60);
        b.Property(x => x.Description).HasMaxLength(200);
    }
}

internal sealed class MatterConfiguration : IEntityTypeConfiguration<Matter>
{
    public void Configure(EntityTypeBuilder<Matter> b)
    {
        b.ToTable("matter");
        b.HasKey(x => x.MatterId);
        b.Property(x => x.MatterNumber).HasMaxLength(20);
        b.Property(x => x.Title).HasMaxLength(200);
        b.Property(x => x.Description).HasMaxLength(400);
        b.Property(x => x.BudgetAmount).HasPrecision(14, 2);

        b.HasOne(x => x.Client).WithMany(c => c.Matters).HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.PracticeArea).WithMany(p => p.Matters).HasForeignKey(x => x.PracticeAreaId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ResponsibleStaff).WithMany(s => s.ResponsibleMatters).HasForeignKey(x => x.ResponsibleStaffId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Firm).WithMany(f => f.Matters).HasForeignKey(x => x.FirmId).OnDelete(DeleteBehavior.SetNull);

        b.HasIndex(x => x.MatterNumber).IsUnique();
        b.HasIndex(x => x.Status);
        b.HasIndex(x => x.PracticeAreaId);
        b.HasIndex(x => x.ResponsibleStaffId);
        b.HasIndex(x => x.OpenDate);
    }
}

internal sealed class ContractConfiguration : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> b)
    {
        b.ToTable("contract");
        b.HasKey(x => x.ContractId);
        b.Property(x => x.Title).HasMaxLength(200);
        b.Property(x => x.ContractType).HasMaxLength(40);
        b.Property(x => x.Counterparty).HasMaxLength(120);
        b.Property(x => x.ValueAmount).HasPrecision(14, 2);
        b.Property(x => x.StageEnteredAt).HasColumnType("timestamp with time zone");
        b.HasOne(x => x.Matter).WithMany(m => m.Contracts).HasForeignKey(x => x.MatterId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.Stage);
        b.HasIndex(x => x.RenewalDate);
    }
}

internal sealed class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> b)
    {
        b.ToTable("document");
        b.HasKey(x => x.DocumentId);
        b.Property(x => x.FileName).HasMaxLength(200);
        b.Property(x => x.MimeType).HasMaxLength(100);
        b.Property(x => x.FolderPath).HasMaxLength(200);
        b.HasOne(x => x.Matter).WithMany(m => m.Documents).HasForeignKey(x => x.MatterId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Contract).WithMany(c => c.Documents).HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.UploadedBy).WithMany().HasForeignKey(x => x.UploadedByStaffId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => x.MatterId);
        b.HasIndex(x => x.FolderPath);
    }
}

internal sealed class MatterEventConfiguration : IEntityTypeConfiguration<MatterEvent>
{
    public void Configure(EntityTypeBuilder<MatterEvent> b)
    {
        b.ToTable("matter_event");
        b.HasKey(x => x.EventId);
        b.Property(x => x.Description).HasMaxLength(400);
        b.HasOne(x => x.Matter).WithMany(m => m.Events).HasForeignKey(x => x.MatterId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ActorStaff).WithMany().HasForeignKey(x => x.ActorStaffId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => new { x.MatterId, x.EventDate });
    }
}

internal sealed class DeadlineConfiguration : IEntityTypeConfiguration<Deadline>
{
    public void Configure(EntityTypeBuilder<Deadline> b)
    {
        b.ToTable("deadline");
        b.HasKey(x => x.DeadlineId);
        b.Property(x => x.Title).HasMaxLength(200);
        b.Property(x => x.Jurisdiction).HasMaxLength(60);
        b.HasOne(x => x.Matter).WithMany(m => m.Deadlines).HasForeignKey(x => x.MatterId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Contract).WithMany(c => c.Deadlines).HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.OwnerStaff).WithMany(s => s.OwnedDeadlines).HasForeignKey(x => x.OwnerStaffId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => x.DueDate);
        b.HasIndex(x => x.Status);
        b.HasIndex(x => x.MatterId);
        b.HasIndex(x => x.OwnerStaffId);
    }
}

internal sealed class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> b)
    {
        b.ToTable("invoice");
        b.HasKey(x => x.InvoiceId);
        b.Property(x => x.InvoiceNumber).HasMaxLength(20);
        b.Property(x => x.TotalAmount).HasPrecision(14, 2);
        b.HasOne(x => x.Matter).WithMany(m => m.Invoices).HasForeignKey(x => x.MatterId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Firm).WithMany(f => f.Invoices).HasForeignKey(x => x.FirmId).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.InvoiceNumber).IsUnique();
        b.HasIndex(x => x.Status);
        b.HasIndex(x => x.FirmId);
        b.HasIndex(x => x.MatterId);
        b.HasIndex(x => x.InvoiceDate);
    }
}

internal sealed class InvoiceLineItemConfiguration : IEntityTypeConfiguration<InvoiceLineItem>
{
    public void Configure(EntityTypeBuilder<InvoiceLineItem> b)
    {
        b.ToTable("invoice_line_item");
        b.HasKey(x => x.LineItemId);
        b.Property(x => x.TaskCode).HasMaxLength(6);
        b.Property(x => x.ActivityCode).HasMaxLength(6);
        b.Property(x => x.ExpenseCode).HasMaxLength(6);
        b.Property(x => x.Narrative).HasMaxLength(500);
        b.Property(x => x.Hours).HasPrecision(6, 2);
        b.Property(x => x.Rate).HasPrecision(10, 2);
        b.Property(x => x.Amount).HasPrecision(12, 2);
        b.Property(x => x.FlagReason).HasMaxLength(40);
        b.HasOne(x => x.Invoice).WithMany(i => i.LineItems).HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.InvoiceId);
        b.HasIndex(x => x.Flagged);
    }
}

internal sealed class MatterBudgetConfiguration : IEntityTypeConfiguration<MatterBudget>
{
    public void Configure(EntityTypeBuilder<MatterBudget> b)
    {
        b.ToTable("matter_budget");
        b.HasKey(x => x.BudgetId);
        b.Property(x => x.Phase).HasMaxLength(40);
        b.Property(x => x.Period).HasMaxLength(20);
        b.Property(x => x.BudgetAmount).HasPrecision(14, 2);
        b.Property(x => x.SpentAmount).HasPrecision(14, 2);
        b.HasOne(x => x.Matter).WithMany(m => m.Budgets).HasForeignKey(x => x.MatterId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ApprovalConfiguration : IEntityTypeConfiguration<Approval>
{
    public void Configure(EntityTypeBuilder<Approval> b)
    {
        b.ToTable("approval");
        b.HasKey(x => x.ApprovalId);
        b.Property(x => x.SubjectId).HasMaxLength(40);
        b.Property(x => x.SubjectTitle).HasMaxLength(200);
        b.Property(x => x.ThresholdAmount).HasPrecision(14, 2);
        b.Property(x => x.MatterNumberRef).HasMaxLength(20);
        b.HasOne(x => x.ApproverStaff).WithMany(s => s.Approvals).HasForeignKey(x => x.ApproverStaffId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => new { x.Queue, x.Status });
        b.HasIndex(x => new { x.SubjectType, x.SubjectId });
    }
}

internal sealed class TimeEntryConfiguration : IEntityTypeConfiguration<TimeEntry>
{
    public void Configure(EntityTypeBuilder<TimeEntry> b)
    {
        b.ToTable("time_entry");
        b.HasKey(x => x.TimeEntryId);
        b.Property(x => x.TaskCode).HasMaxLength(6);
        b.Property(x => x.Narrative).HasMaxLength(400);
        b.Property(x => x.Hours).HasPrecision(6, 2);
        b.HasOne(x => x.Matter).WithMany(m => m.TimeEntries).HasForeignKey(x => x.MatterId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Staff).WithMany(s => s.TimeEntries).HasForeignKey(x => x.StaffId).OnDelete(DeleteBehavior.Restrict);
    }
}
