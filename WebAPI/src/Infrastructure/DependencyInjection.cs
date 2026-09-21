using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Application.Services;
using LegalMatterContractPortal.Infrastructure.Persistence;
using LegalMatterContractPortal.Infrastructure.Repositories;
using LegalMatterContractPortal.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LegalMatterContractPortal.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config, IHostEnvironment env)
    {
        var conn = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
        services.AddDbContext<LegalDbContext>(opts =>
        {
            opts.UseNpgsql(conn, npg => npg.MigrationsAssembly(typeof(LegalDbContext).Assembly.FullName));
            if (env.IsDevelopment()) opts.EnableSensitiveDataLogging();
        });

        services.AddScoped<IMatterRepository, MatterRepository>();
        services.AddScoped<IContractRepository, ContractRepository>();
        services.AddScoped<IDeadlineRepository, DeadlineRepository>();
        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<IApprovalRepository, ApprovalRepository>();
        services.AddScoped<IMatterBudgetRepository, MatterBudgetRepository>();
        services.AddScoped<ILookupRepository, LookupRepository>();
        services.AddScoped<IDashboardRepository, DashboardRepository>();
        services.AddScoped<IAnalyticsRepository, AnalyticsRepository>();
        services.AddScoped<IDocumentContentProvider, DocumentContentProvider>();
        return services;
    }
}
