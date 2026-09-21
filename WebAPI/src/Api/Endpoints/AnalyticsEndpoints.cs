using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Repositories;

namespace LegalMatterContractPortal.Api.Endpoints;

public static class AnalyticsEndpoints
{
    public static void MapAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/analytics").WithTags("Analytics");

        g.MapGet("/spend", async (string groupBy, DateOnly? from, DateOnly? to, IAnalyticsRepository repo, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(groupBy)) return BadRequest("groupBy is required.");
            try { return Results.Ok(await repo.GetSpendAsync(groupBy, from, to, ct)); }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
        })
         .WithName("GetSpend")
         .WithDescription("Send aggregation. groupBy ∈ { firm, practiceArea, month }. Optional from/to date range (ISO-8601).")
         .Produces<IReadOnlyList<SpendByDimensionDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        g.MapGet("/spend-matrix", async (string? rowDimension, DateOnly? from, DateOnly? to, IAnalyticsRepository repo, CancellationToken ct) =>
        {
            try { return Results.Ok(await repo.GetSpendMatrixAsync(rowDimension ?? "firm", from, to, ct)); }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
        })
         .WithName("GetSpendMatrix")
         .WithDescription("Firm (or practice area) × month spend matrix for heatmaps. rowDimension ∈ { firm, practiceArea }. Optional from/to (ISO-8601).")
         .Produces<IReadOnlyList<SpendMatrixCellDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        g.MapGet("/budget-vs-actual", async (string? matterNumber, int? practiceAreaId, IAnalyticsRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.GetBudgetVsActualAsync(matterNumber, practiceAreaId, ct)))
         .WithName("GetBudgetVsActual")
         .WithDescription("Budget vs actual spend per matter. Filters: matterNumber, practiceAreaId.")
         .Produces<IReadOnlyList<BudgetVsActualDto>>(StatusCodes.Status200OK);

        g.MapGet("/cycle-time", async (int? practiceAreaId, DateOnly? from, DateOnly? to, IAnalyticsRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.GetCycleTimeAsync(practiceAreaId, from, to, ct)))
         .WithName("GetCycleTime")
         .WithDescription("Median matter cycle-time by practice area for closed matters. Filters: practiceAreaId, from/to (ISO-8601).")
         .Produces<IReadOnlyList<MatterCycleTimeDto>>(StatusCodes.Status200OK);

        g.MapGet("/deadline-load", async (DateOnly? from, DateOnly? to, IAnalyticsRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.GetDeadlineLoadAsync(from, to, ct)))
         .WithName("GetDeadlineLoad")
         .WithDescription("Deadline load per ISO week. Optional from/to (ISO-8601).")
         .Produces<IReadOnlyList<DeadlineLoadDto>>(StatusCodes.Status200OK);
    }

    private static IResult BadRequest(string detail) => TypedResults.Problem(
        detail,
        statusCode: 400,
        type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.1");
}
