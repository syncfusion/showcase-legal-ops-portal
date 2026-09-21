using LegalMatterContractPortal.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LegalMatterContractPortal.Infrastructure.Persistence;

public sealed class LegalDbContext : DbContext
{
    public LegalDbContext(DbContextOptions<LegalDbContext> options) : base(options) { }

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<LawFirm> LawFirms => Set<LawFirm>();
    public DbSet<PracticeArea> PracticeAreas => Set<PracticeArea>();
    public DbSet<Matter> Matters => Set<Matter>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<MatterEvent> MatterEvents => Set<MatterEvent>();
    public DbSet<Deadline> Deadlines => Set<Deadline>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLineItem> InvoiceLineItems => Set<InvoiceLineItem>();
    public DbSet<MatterBudget> MatterBudgets => Set<MatterBudget>();
    public DbSet<Approval> Approvals => Set<Approval>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<UtbmsCode> UtbmsCodes => Set<UtbmsCode>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.ApplyConfigurationsFromAssembly(typeof(LegalDbContext).Assembly);
    }
}
