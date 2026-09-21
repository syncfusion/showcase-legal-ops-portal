using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Enums;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Application.Services;

namespace LegalMatterContractPortal.Api.Endpoints;

public static class MatterEndpoints
{
    public static void MapMatterEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/matters").WithTags("Matters");

        g.MapGet("/", async (IMatterRepository repo,
            string? status, int? practiceAreaId, long? firmId, long? clientId,
            string? riskLevel, string? matterType, bool? recent,
            string? q, string? sort, int? page, int? pageSize, bool? includeSpent,
            CancellationToken ct) =>
        {
            try
            {
                // Map string status → filter enum (allow Active|Closed|Rejected|All).
                MatterStatusFilter? filter = null;
                if (!string.IsNullOrWhiteSpace(status) &&
                    Enum.TryParse<MatterStatusFilter>(status, true, out var f)) filter = f;
                var result = await repo.ListAsync(new MatterListQuery
                {
                    Status = filter,
                    PracticeAreaId = practiceAreaId,
                    FirmId = firmId,
                    ClientId = clientId,
                    RiskLevel = riskLevel,
                    MatterType = matterType,
                    Recent = recent,
                    Q = q,
                    Sort = sort,
                    Page = page ?? 1,
                    PageSize = pageSize ?? 25,
                    IncludeSpent = includeSpent ?? false
                }, ct);
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                // Surface real failure (e.g. DB connectivity) instead of a generic 500 shell.
                return TypedResults.Problem(
                    detail: ex.ToString(),
                    title: $"ListMatters failed: {ex.Message}",
                    statusCode: 500,
                    type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.6.1");
            }
        })
         .WithName("ListMatters")
         .WithDescription("Paged list of matters with filters: status (Active|Closed|Rejected|All), practiceAreaId, firmId, clientId, riskLevel, matterType, recent (last 90 days), q (search), sort (field:asc|desc), page, pageSize, includeSpent (default false: skip per-matter Σ invoice.total).")
         .Produces<PagedResult<MatterSummaryDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        g.MapGet("/{matterNumber}", async (string matterNumber, IMatterRepository repo, CancellationToken ct) =>
        {
            var dto = await repo.GetByMatterNumberAsync(matterNumber, ct);
            return dto is null ? NotFound(matterNumber) : Results.Ok(dto);
        })
         .WithName("GetMatterDetail")
         .WithDescription("Matter detail: summary strip with counts of contracts, documents, events, deadlines, invoices, and the next upcoming deadline.")
         .Produces<MatterDetailDto>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status404NotFound);

        g.MapGet("/{matterNumber}/timeline", async (string matterNumber, DateOnly? from, DateOnly? to, string? type, IMatterRepository repo, CancellationToken ct) =>
        {
            if (!repo.MatterExists(matterNumber)) return NotFound(matterNumber);
            return Results.Ok(await repo.GetTimelineAsync(matterNumber, from, to, type, ct));
        })
         .WithName("GetMatterTimeline")
         .WithDescription("Deadline timeline for a matter (title, type, due date, status, jurisdiction, owner). Optional from/to (ISO-8601) and type filter.")
         .Produces<IReadOnlyList<DeadlineSummaryDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status404NotFound);

        g.MapGet("/{matterNumber}/documents", async (string matterNumber, string? folderPath, IMatterRepository repo, CancellationToken ct) =>
        {
            if (!repo.MatterExists(matterNumber)) return NotFound(matterNumber);
            return Results.Ok(await repo.GetDocumentsAsync(matterNumber, folderPath, ct));
        })
         .WithName("GetMatterDocuments")
         .WithDescription("Document tree metadata for a matter. Optional folderPath substring filter.")
         .Produces<IReadOnlyList<DocumentNodeDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static IResult NotFound(string matterNumber) => TypedResults.Problem(
        $"No matter was found for number '{matterNumber}'.",
        statusCode: 404,
        type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.5");
}
