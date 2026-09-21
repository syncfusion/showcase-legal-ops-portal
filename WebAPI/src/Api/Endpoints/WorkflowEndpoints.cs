using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Application.Services;

namespace LegalMatterContractPortal.Api.Endpoints;

public static class WorkflowEndpoints
{
    public static void MapWorkflowEndpoints(this IEndpointRouteBuilder app)
    {
        // Deadlines (Scheduler)
        var deadlines = app.MapGroup("/api/v1/deadlines").WithTags("Deadlines");
        deadlines.MapGet("/", async (DateOnly? from, DateOnly? to, string? status, string? type,
            long? ownerStaffId, bool? upcoming, bool? overdue, bool? dueSoon, IDeadlineRepository repo, CancellationToken ct) =>
        {
            if (from.HasValue && to.HasValue && from > to) return BadRequest("'from' must be earlier than or equal to 'to'.");
            return Results.Ok(await repo.ListAsync(new DeadlineListQuery
            {
                From = from, To = to, Status = status, Type = type,
                OwnerStaffId = ownerStaffId,
                Upcoming = upcoming ?? false, Overdue = overdue ?? false, DueSoon = dueSoon ?? false
            }, ct));
        })
         .WithName("ListDeadlines")
         .WithDescription("Deadlines for the Scheduler. Filters: from/to (ISO-8601), status, type (deadlineType), ownerStaffId, upcoming, overdue, dueSoon.")
         .Produces<IReadOnlyList<DeadlineSummaryDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        // Invoices
        var invoices = app.MapGroup("/api/v1/invoices").WithTags("Invoices");
        invoices.MapGet("/", async (string? status, long? firmId, string? matterNumber, bool? flaggedOnly,
            string? q, string? sort, int? page, int? pageSize, IInvoiceRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.ListAsync(new InvoiceListQuery
            {
                Status = status, FirmId = firmId, MatterNumber = matterNumber, FlaggedOnly = flaggedOnly ?? false,
                Q = q, Sort = sort, Page = page ?? 1, PageSize = pageSize ?? 25
            }, ct)))
         .WithName("ListInvoices")
         .WithDescription("Paged invoice list. Filters: status (Received|UnderReview|Flagged|Approved|Rejected|Paid), firmId, matterNumber, flaggedOnly, q (search).")
         .Produces<PagedResult<InvoiceSummaryDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        invoices.MapGet("/{invoiceNumber}", async (string invoiceNumber, IInvoiceRepository repo, CancellationToken ct) =>
        {
            var dto = await repo.GetByInvoiceNumberAsync(invoiceNumber, ct);
            return dto is null ? NotFound($"Invoice '{invoiceNumber}' not found.") : Results.Ok(dto);
        })
         .WithName("GetInvoiceDetail")
         .WithDescription("Invoice detail with totals and flagged line-item counts.")
         .Produces<InvoiceDetailDto>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status404NotFound);

        invoices.MapGet("/{invoiceNumber}/line-items", async (string invoiceNumber, bool? flaggedOnly, IInvoiceRepository repo, CancellationToken ct) =>
        {
            if (await repo.GetByInvoiceNumberAsync(invoiceNumber, ct) is null) return NotFound($"Invoice '{invoiceNumber}' not found.");
            return Results.Ok(await repo.GetLineItemsAsync(invoiceNumber, flaggedOnly ?? false, ct));
        })
         .WithName("GetInvoiceLineItems")
         .WithDescription("UTBMS-coded line items for an invoice. flaggedOnly=true returns just the flagged rows.")
         .Produces<IReadOnlyList<InvoiceLineItemDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status404NotFound);

        // Approvals (Kanban)
        var approvals = app.MapGroup("/api/v1/approvals").WithTags("Approvals");
        approvals.MapGet("/", async (string? queue, string? status, string? subjectType, long? approverStaffId,
            IApprovalRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.ListAsync(new ApprovalListQuery
            {
                Queue = queue, Status = status, SubjectType = subjectType, ApproverStaffId = approverStaffId
            }, ct)))
         .WithName("ListApprovals")
         .WithDescription("Approval queue for the Kanban. Filters: queue (InvoiceReview|ContractExecution|MatterIntake|BudgetOverrun), status (Pending|Approved|Rejected|Escalated), subjectType (Invoice|Contract|Matter), approverStaffId.")
         .Produces<IReadOnlyList<ApprovalSummaryDto>>(StatusCodes.Status200OK);

        // Budgets
        var budgets = app.MapGroup("/api/v1/budgets").WithTags("Budgets");
        budgets.MapGet("/", async (string? matterNumber, bool? overBudgetOnly, IMatterBudgetRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.ListAsync(new BudgetListQuery { MatterNumber = matterNumber, OverBudgetOnly = overBudgetOnly ?? false }, ct)))
         .WithName("ListBudgets")
         .WithDescription("Matter budgets. Filters: matterNumber, overBudgetOnly=true (over-budget matters).")
         .Produces<IReadOnlyList<MatterBudgetDto>>(StatusCodes.Status200OK);
    }

    private static IResult NotFound(string detail) => TypedResults.Problem(
        detail,
        statusCode: 404,
        type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.5");
    private static IResult BadRequest(string detail) => TypedResults.Problem(
        detail,
        statusCode: 400,
        type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.1");
}
