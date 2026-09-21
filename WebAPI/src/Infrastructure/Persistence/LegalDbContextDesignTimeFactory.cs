using LegalMatterContractPortal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LegalMatterContractPortal.Infrastructure.Persistence;

/// <summary>EF design-time factory for migrations.</summary>
internal sealed class LegalDbContextDesignTimeFactory : IDesignTimeDbContextFactory<LegalDbContext>
{
    public LegalDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<LegalDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=legal_matter_contract_portal;Username=YourUserName;Password=YourPassword")
            .Options;
        return new LegalDbContext(options);
    }
}
