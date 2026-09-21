namespace LegalMatterContractPortal.Application.Models;

/// <summary>Standard envelope for paged list responses.</summary>
public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}

/// <summary>Shared paging, sort, and search parameters.</summary>
public class ListQuery
{
    public string? Q { get; set; }
    public string? Sort { get; set; }          // field:asc|desc
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

/// <summary>Current date used for overdue and due-soon calculations.</summary>
public static class SystemAsOf
{
    /// <summary>Today's date for deadline and renewal math.</summary>
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
}
