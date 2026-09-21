using LegalMatterContractPortal.Application.Dtos;
using LegalMatterContractPortal.Application.Enums;
using LegalMatterContractPortal.Application.Models;

namespace LegalMatterContractPortal.Application.Repositories;

public sealed class MatterListQuery : ListQuery
{
    public MatterStatusFilter? Status { get; set; }
    public int? PracticeAreaId { get; set; }
    public long? FirmId { get; set; }
    public long? ClientId { get; set; }
    public string? RiskLevel { get; set; }
    public string? MatterType { get; set; }
    public bool? Recent { get; set; }  // last 90 days opened
    // When true, include per-matter spend. The matters grid does not need this aggregate.
    public bool? IncludeSpent { get; set; }
}

public interface IMatterRepository
{
    Task<PagedResult<MatterSummaryDto>> ListAsync(MatterListQuery query, CancellationToken ct = default);
    Task<MatterDetailDto?> GetByMatterNumberAsync(string matterNumber, CancellationToken ct = default);
    Task<IReadOnlyList<DeadlineSummaryDto>> GetTimelineAsync(string matterNumber, DateOnly? from, DateOnly? to, string? type, CancellationToken ct = default);
    Task<IReadOnlyList<DocumentNodeDto>> GetDocumentsAsync(string matterNumber, string? folderPath, CancellationToken ct = default);
    bool MatterExists(string matterNumber);
}
