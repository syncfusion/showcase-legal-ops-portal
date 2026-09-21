namespace LegalMatterContractPortal.Application.Services;

/// <summary>Streams sample document bytes for a document id.</summary>
public interface IDocumentContentProvider
{
    /// <summary>True when the document id exists.</summary>
    bool Exists(long documentId);

    /// <summary>Sample file stream, content type, and file name.</summary>
    (Stream Stream, string ContentType, string FileName) Open(long documentId);
}
