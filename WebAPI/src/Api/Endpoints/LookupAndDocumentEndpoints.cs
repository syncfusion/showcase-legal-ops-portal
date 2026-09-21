using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Repositories;
using LegalMatterContractPortal.Application.Services;

namespace LegalMatterContractPortal.Api.Endpoints;

public static class LookupAndDocumentEndpoints
{
    public static void MapLookupAndDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        // Lookups for dropdowns and filters.
        var lookups = app.MapGroup("/api/v1/lookups").WithTags("Lookups");
        lookups.MapGet("/{set}", async (string set, ILookupRepository repo, CancellationToken ct) =>
        {
            try { return Results.Ok(await repo.GetAsync(set, ct)); }
            catch (ArgumentException ex) { return TypedResults.Problem(ex.Message, statusCode: 400, type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.1"); }
        })
         .WithName("GetLookup")
         .WithDescription("Reference data. set ∈ { practice-areas, contract-types, jurisdictions, utbms, staff, firms, statuses }.")
         .Produces<IReadOnlyList<LookupItemDto>>(StatusCodes.Status200OK)
         .ProducesProblem(StatusCodes.Status400BadRequest);

        // Sample PDF/DOCX content for the document viewers.
        var documents = app.MapGroup("/api/v1/documents").WithTags("Documents");
        documents.MapGet("/{documentId:long}/content", (long documentId, IDocumentContentProvider provider, HttpContext http) =>
        {
            try
            {
                if (!provider.Exists(documentId))
                {
                    return TypedResults.Problem(
                        $"Document '{documentId}' does not exist.",
                        statusCode: 404,
                        type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.5");
                }

                var (stream, contentType, fileName) = provider.Open(documentId);
                var safeName = string.IsNullOrWhiteSpace(fileName)
                    ? $"document-{documentId}"
                    : fileName.Replace("\"", string.Empty, StringComparison.Ordinal);

                // Inline disposition so PDF Viewer / Document Editor can stream the body.
                http.Response.Headers.ContentDisposition = $"inline; filename=\"{safeName}\"";
                http.Response.Headers.CacheControl = "no-store";
                http.Response.Headers["X-Content-Type-Options"] = "nosniff";

                return Results.File(stream, contentType, enableRangeProcessing: true);
            }
            catch (Exception ex)
            {
                return TypedResults.Problem(
                    detail: ex.ToString(),
                    title: $"Failed to open document content for id {documentId}: {ex.Message}",
                    statusCode: 500,
                    type: "https://datatracker.ietf.org/doc/html/rfc9110#section-15.6.1");
            }
        })
         .WithName("GetDocumentContent")
         .WithDescription("Streams a generated professional sample file (PDF/DOCX/PNG/XLSX) for a seeded document id. Content reflects matter/document type. Supports HTTP Range.")
         .Produces(StatusCodes.Status200OK, contentType: "application/pdf")
         .ProducesProblem(StatusCodes.Status404NotFound);
    }
}
