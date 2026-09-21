using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Application.Repositories;

namespace LegalMatterContractPortal.Api.Endpoints;

public static class ContractEndpoints
{
    public static void MapContractEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/contracts").WithTags("Contracts");

        g.MapGet("/", async (string? matterNumber, string? stage, int? renewalDueWithinDays, string? type,
            string? q, string? sort, int? page, int? pageSize, IContractRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.ListAsync(new ContractListQuery
            {
                MatterNumber = matterNumber,
                Stage = stage,
                RenewalDueWithinDays = renewalDueWithinDays,
                Type = type,
                Q = q,
                Sort = sort,
                Page = page ?? 1,
                PageSize = pageSize ?? 25
            }, ct)))
         .WithName("ListContracts")
         .WithDescription("Paged contract list. Filters: matterNumber, stage, renewalDueWithinDays, type, q (search).")
         .Produces<PagedResult<ContractSummaryDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        g.MapGet("/{contractId:long}", async (long contractId, IContractRepository repo, CancellationToken ct) =>
        {
            var dto = await repo.GetByIdAsync(contractId, ct);
            return dto is null ? Problem404($"Contract {contractId} not found.") : Results.Ok(dto);
        })
         .WithName("GetContractDetail")
         .WithDescription("Contract detail: includes related document and deadline counts.")
         .Produces<ContractDetailDto>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static IResult Problem404(string detail) => TypedResults.Problem(
        detail,
        statusCode: 404,
        type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.5");
}
