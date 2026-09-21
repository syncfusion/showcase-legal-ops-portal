using LegalMatterContractPortal.Infrastructure.Persistence;
using LegalMatterContractPortal.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LegalMatterContractPortal.Api.Hosting;

/// <summary>Runs the seeder at startup when the database is empty.</summary>
internal sealed class StartupSeederHostedService(IServiceProvider sp, IHostEnvironment env, IConfiguration cfg) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var seedOnStartup = cfg.GetValue("SeedOnStartup", env.IsDevelopment());
        if (!seedOnStartup) return;

        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LegalDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<StartupSeederHostedService>>();

        try
        {
            await db.Database.MigrateAsync(cancellationToken);
            await LegalDataSeeder.SeedAsync(db, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Startup seeding failed. Ensure PostgreSQL is reachable and the connection string is configured.");
            // Keep the API running if seeding fails.
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
