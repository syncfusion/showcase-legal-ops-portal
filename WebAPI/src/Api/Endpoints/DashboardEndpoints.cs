using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Application.Repositories;

namespace LegalMatterContractPortal.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/dashboard").WithTags("Dashboard");

        g.MapGet("/summary", async (IDashboardRepository repo, DateOnly? asOf, CancellationToken ct) =>
            Results.Ok(await repo.GetSummaryAsync(asOf, ct)))
         .WithName("GetDashboardSummary")
         .WithDescription("Dashboard KPIs: active matters, spend YTD vs budget, pending approvals, deadlines; spend by practice area; spend trend; openings.")
         .Produces<DashboardSummaryDto>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status500InternalServerError);

        g.MapGet("/critical-matters", async (IDashboardRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.GetCriticalMattersAsync(ct)))
         .WithName("GetCriticalMatters")
         .WithDescription("Critical matters ranked by risk severity: overdue deadlines, over-budget, escalated approvals, stalled activity. Returns up to 50 non-closed matters sorted by SeverityScore desc, then DaysToNextDeadline asc.")
         .Produces<IReadOnlyList<CriticalMatterDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status500InternalServerError);
    }
}
