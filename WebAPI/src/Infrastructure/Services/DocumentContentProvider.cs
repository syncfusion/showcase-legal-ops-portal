using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using LegalMatterContractPortal.Application.Services;
using LegalMatterContractPortal.Domain.Enums;
using LegalMatterContractPortal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LegalMatterContractPortal.Infrastructure.Services;

/// <summary>Streams sample PDF/DOCX bytes for a document id.</summary>
internal sealed class DocumentContentProvider(LegalDbContext db) : IDocumentContentProvider
{
    private static readonly Encoding PdfEncoding = Encoding.ASCII;

    public bool Exists(long documentId) =>
        db.Documents.AsNoTracking().Any(d => d.DocumentId == documentId);

    public (Stream Stream, string ContentType, string FileName) Open(long documentId)
    {
        var doc = db.Documents.AsNoTracking()
                      .Include(d => d.Matter)
                      .Include(d => d.Contract)
                      .FirstOrDefault(d => d.DocumentId == documentId)
                  ?? throw new InvalidOperationException($"Document {documentId} not found.");

        var sample = BuildProfessionalSample(doc);
        var (bytes, contentType) = BuildSampleBytes(doc, sample);
        return (new MemoryStream(bytes), contentType, doc.FileName);
    }

    private static (byte[] bytes, string contentType) BuildSampleBytes(
        Domain.Entities.Document doc,
        ProfessionalSample sample)
    {
        // Prefer mime type; fall back to extension so mis-seeded rows still open correctly.
        var mime = (doc.MimeType ?? string.Empty).Trim().ToLowerInvariant();
        var name = doc.FileName ?? string.Empty;
        var isPdf = mime is "application/pdf" || name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
        var isDocx = mime is "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                     || name.EndsWith(".docx", StringComparison.OrdinalIgnoreCase);
        var isPng = mime is "image/png" || name.EndsWith(".png", StringComparison.OrdinalIgnoreCase);
        var isXls = mime is "application/vnd.ms-excel"
                    || name.EndsWith(".xls", StringComparison.OrdinalIgnoreCase)
                    || name.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);

        if (isPdf) return (BuildValidPdf(sample), "application/pdf");
        if (isDocx) return (BuildValidDocx(sample), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        if (isPng) return (PngBuilder(), "image/png");
        if (isXls) return (SpreadsheetBuilder(sample), "application/vnd.ms-excel");
        return (Encoding.UTF8.GetBytes(string.Join(Environment.NewLine, sample.Body)), "text/plain");
    }

    // ── Professional sample content ──────────────────────────────────────────

    private sealed record ProfessionalSample(
        string Title,
        string Subtitle,
        string MatterNumber,
        string MatterTitle,
        string MatterType,
        string DocumentType,
        string FolderPath,
        string ContractRef,
        int Version,
        IReadOnlyList<string> Body);

    private static ProfessionalSample BuildProfessionalSample(Domain.Entities.Document doc)
    {
        // Never NRE if navigation is missing (orphaned FK / Include failure).
        var matterNumber = doc.Matter?.MatterNumber;
        if (string.IsNullOrWhiteSpace(matterNumber))
            matterNumber = doc.MatterId > 0 ? $"MAT-{doc.MatterId:D4}" : "MAT-DEMO-0000";

        var matterTitle = doc.Matter?.Title;
        if (string.IsNullOrWhiteSpace(matterTitle))
            matterTitle = "Legal Matter";

        var matterTypeName = doc.Matter is not null
            ? doc.Matter.MatterType.ToString()
            : "Advisory";

        var contractRef = doc.Contract is not null
            ? $"{doc.Contract.Title} (#{doc.Contract.ContractId})"
            : doc.ContractId is long cid
                ? $"Contract #{cid}"
                : "Matter-level document";

        var fileTitle = string.IsNullOrWhiteSpace(doc.FileName)
            ? "Legal Document"
            : Path.GetFileNameWithoutExtension(doc.FileName).Replace('_', ' ').Replace('-', ' ');

        var docType = doc.DocumentType;
        var body = BuildTypedBody(docType, matterTypeName, matterNumber, matterTitle, contractRef, fileTitle);

        return new ProfessionalSample(
            Title: fileTitle,
            Subtitle: $"{docType}  |  {matterNumber}",
            MatterNumber: matterNumber,
            MatterTitle: matterTitle,
            MatterType: matterTypeName,
            DocumentType: docType.ToString(),
            FolderPath: doc.FolderPath ?? "/",
            ContractRef: contractRef,
            Version: Math.Max(1, doc.Version),
            Body: body);
    }

    private static IReadOnlyList<string> BuildTypedBody(
        DocumentType docType,
        string matterType,
        string matterNumber,
        string matterTitle,
        string contractRef,
        string fileTitle)
    {
        return docType switch
        {
            DocumentType.Contract or DocumentType.Msa or DocumentType.SaasAgreement
                or DocumentType.ServiceAgreement or DocumentType.Nda =>
                BuildContractBody(docType, matterNumber, matterTitle, contractRef, fileTitle),

            DocumentType.Complaint or DocumentType.Motion or DocumentType.CourtFiling
                or DocumentType.Pleading or DocumentType.DepositionTranscript =>
                BuildLitigationBody(docType, matterNumber, matterTitle, matterType),

            DocumentType.Evidence =>
            [
                "1. EVIDENCE SUMMARY",
                "This exhibit package identifies materials retained for matter " + matterNumber + ".",
                "Chain-of-custody and privilege review remain the responsibility of assigned counsel.",
                string.Empty,
                "2. EXHIBIT INDEX",
                "Exhibit A  - Correspondence log (electronic)",
                "Exhibit B  - Transaction records summary",
                "Exhibit C  - Supporting schedules and annexes",
                string.Empty,
                "3. HANDLING NOTES",
                "Mark confidential or highly confidential per the governing protective order.",
                "Do not produce externally without a privilege check.",
                "Retain originals in the matter repository folder Evidence.",
            ],

            DocumentType.Correspondence or DocumentType.Email =>
            [
                "RE: " + fileTitle,
                "Matter: " + matterNumber + " — " + matterTitle,
                string.Empty,
                "Dear Counsel,",
                string.Empty,
                "We write regarding the above-referenced matter to confirm next steps and",
                "outstanding deliverables under the current engagement.",
                string.Empty,
                "Please advise on availability for a status conference next week and provide",
                "any additional materials needed for our continuing review.",
                string.Empty,
                "Respectfully,",
                "Office of Legal Operations",
                "Meridian Legal",
            ],

            DocumentType.Memo =>
            [
                "INTERNAL LEGAL MEMORANDUM",
                string.Empty,
                "TO:      Matter Lead - " + matterNumber,
                "FROM:    Office of Legal Operations",
                "RE:      " + fileTitle,
                "DATE:    " + DateTime.UtcNow.ToString("MMMM d, yyyy"),
                string.Empty,
                "I. PURPOSE",
                "This memorandum summarizes the principal legal and commercial considerations for " + matterTitle + ".",
                string.Empty,
                "II. BRIEF ANSWER",
                "On the facts available, residual risk is manageable with standard contractual",
                "controls, escalation of high-value clauses, and calendarization of material deadlines.",
                string.Empty,
                "III. DISCUSSION",
                "A. Scope and parties",
                "B. Key obligations and payment terms",
                "C. Indemnity, liability, and insurance",
                "D. Term, renewal, and termination",
                string.Empty,
                "IV. RECOMMENDATION",
                "Proceed with redlines on high-risk clauses and route for business-owner sign-off",
                "prior to execution. Track follow-ups on the matter timeline.",
            ],

            DocumentType.Spreadsheet =>
            [
                "BILLING / SCHEDULE WORKBOOK (TEXT PREVIEW)",
                "Matter: " + matterNumber,
                string.Empty,
                "Line  Description                         Amount (USD)",
                "----  ----------------------------------  -----------",
                "  1   Professional services — review            12,500",
                "  2   Document production support               3,200",
                "  3   Status conference preparation             1,750",
                "                                              -------",
                "      Subtotal                                 17,450",
                string.Empty,
                "Notes: Figures are illustrative for portal analytics and invoice review.",
            ],

            _ =>
            [
                "DOCUMENT OVERVIEW",
                "This file supports matter " + matterNumber + " (" + matterTitle + ").",
                "Matter type: " + matterType + ". Document classification: " + docType + ".",
                string.Empty,
                "PURPOSE",
                "Confirm classification, retention, and the controlling contract version,",
                "and schedule review with the responsible attorney.",
                string.Empty,
                "RELATED CONTRACT",
                contractRef,
                string.Empty,
                "NEXT ACTIONS",
                "1. Confirm document classification and retention policy.",
                "2. Link to the controlling contract version if applicable.",
                "3. Schedule review with the responsible attorney.",
            ],
        };
    }

    private static IReadOnlyList<string> BuildContractBody(
        DocumentType docType,
        string matterNumber,
        string matterTitle,
        string contractRef,
        string fileTitle)
    {
        var instrument = docType switch
        {
            DocumentType.Nda => "NON-DISCLOSURE AGREEMENT",
            DocumentType.Msa => "MASTER SERVICES AGREEMENT",
            DocumentType.SaasAgreement => "SOFTWARE-AS-A-SERVICE AGREEMENT",
            DocumentType.ServiceAgreement => "PROFESSIONAL SERVICES AGREEMENT",
            _ => "COMMERCIAL AGREEMENT",
        };

        return
        [
            instrument,
            fileTitle,
            string.Empty,
            "This Agreement is entered into as of the Effective Date by and between the",
            "parties identified in the related matter record for " + matterNumber + ".",
            string.Empty,
            "Matter:    " + matterTitle,
            "Reference: " + contractRef,
            string.Empty,
            "ARTICLE 1 — DEFINITIONS AND INTERPRETATION",
            "1.1  \"Confidential Information\" means non-public business, technical, or legal",
            "     information disclosed in connection with this engagement.",
            "1.2  \"Services\" means the deliverables described in any Statement of Work",
            "     attached hereto or referenced in the matter file.",
            string.Empty,
            "ARTICLE 2 — SCOPE OF WORK",
            "2.1  Provider shall perform the Services in a professional and workmanlike",
            "     manner consistent with industry standards for the practice area.",
            "2.2  Changes to scope require written change order approved by both parties.",
            string.Empty,
            "ARTICLE 3 — FEES AND PAYMENT",
            "3.1  Fees are as set forth in Schedule A or the applicable Statement of Work.",
            "3.2  Invoices are due net thirty (30) days unless otherwise agreed in writing.",
            string.Empty,
            "ARTICLE 4 — CONFIDENTIALITY",
            "4.1  Each party shall protect the other's Confidential Information with no less",
            "     than reasonable care and use it solely for purposes of this Agreement.",
            string.Empty,
            "ARTICLE 5 — TERM AND TERMINATION",
            "5.1  This Agreement commences on the Effective Date and continues until",
            "     completion of the Services or earlier termination as provided herein.",
            "5.2  Either party may terminate for material breach after thirty (30) days'",
            "     written notice if the breach remains uncured.",
            string.Empty,
            "ARTICLE 6 — GENERAL",
            "6.1  This Agreement constitutes the entire understanding of the parties and",
            "     supersedes prior proposals relating to its subject matter.",
            "6.2  Governing law and venue are as designated in the matter jurisdiction.",
            string.Empty,
            "IN WITNESS WHEREOF, the parties have executed this Agreement as of the",
            "Effective Date.",
        ];
    }

    private static IReadOnlyList<string> BuildLitigationBody(
        DocumentType docType,
        string matterNumber,
        string matterTitle,
        string matterType)
    {
        var caption = docType switch
        {
            DocumentType.Complaint => "COMPLAINT",
            DocumentType.Motion => "MOTION",
            DocumentType.CourtFiling => "COURT FILING",
            DocumentType.DepositionTranscript => "DEPOSITION TRANSCRIPT (EXCERPT)",
            _ => "PLEADING",
        };

        return
        [
            "IN THE [COURT OF COMPETENT JURISDICTION]",
            string.Empty,
            caption,
            "Matter No. " + matterNumber,
            "Caption: " + matterTitle,
            "Practice: " + matterType,
            string.Empty,
            "1.  This " + caption.ToLowerInvariant() + " is submitted in connection with the above-captioned",
            "    matter and the related pleadings on file.",
            string.Empty,
            "2.  PARTIES AND JURISDICTION",
            "    The parties and jurisdictional bases are as set forth in the matter intake",
            "    record and related contracts on file with Legal Operations.",
            string.Empty,
            "3.  STATEMENT OF FACTS (SAMPLE)",
            "    On or about the dates reflected in the matter timeline, the parties engaged",
            "    in transactions giving rise to the claims and defenses under review.",
            string.Empty,
            "4.  CLAIMS / RELIEF REQUESTED",
            "    Counsel seeks appropriate relief, including declaratory and/or monetary",
            "    remedies, as may be authorized by applicable law and the pleadings.",
            string.Empty,
            "5.  PRAYER",
            "    WHEREFORE, the submitting party requests that the Court grant such relief",
            "    as is just and proper.",
            string.Empty,
            "Respectfully submitted,",
            "Counsel of Record",
            "Office of Legal Operations  |  Meridian Legal",
        ];
    }

    // ── Valid PDF (branded, correct byte offsets) ────────────────────────────

    private static readonly CultureInfo PdfCulture = CultureInfo.InvariantCulture;

    private static byte[] BuildValidPdf(ProfessionalSample sample)
    {
        const float pageW = 612f;
        var inv = PdfCulture;

        string N(float v) => v.ToString("0.###", inv);

        void Rect(StringBuilder s, float r, float g, float b, float x, float y, float w, float h)
        {
            s.Append("q\n");
            s.Append(N(r)).Append(' ').Append(N(g)).Append(' ').Append(N(b)).Append(" rg\n");
            s.Append(N(x)).Append(' ').Append(N(y)).Append(' ').Append(N(w)).Append(' ').Append(N(h)).Append(" re f\n");
            s.Append("Q\n");
        }

        void Text(StringBuilder s, string font, float size, float r, float g, float b, float x, float y, string text)
        {
            var safe = ToPdfSafe(text);
            if (string.IsNullOrEmpty(safe)) return;
            s.Append("BT\n");
            s.Append('/').Append(font).Append(' ').Append(N(size)).Append(" Tf\n");
            s.Append(N(r)).Append(' ').Append(N(g)).Append(' ').Append(N(b)).Append(" rg\n");
            s.Append("1 0 0 1 ").Append(N(x)).Append(' ').Append(N(y)).Append(" Tm\n");
            s.Append('(').Append(EscapePdfLiteral(safe)).Append(") Tj\n");
            s.Append("ET\n");
        }

        float Width(string text, float size, bool bold) =>
            ToPdfSafe(text).Length * size * (bold ? 0.58f : 0.50f);

        float CenterX(string text, float size, bool bold, float left = 48, float right = 48) =>
            Math.Max(left, (pageW - Width(text, size, bold)) / 2f);

        var content = new StringBuilder();

        // Brand header bar (Meridian Legal / brand-900) + accent stripe (brand-500).
        Rect(content, 0.259f, 0.184f, 0.494f, 0, 742, pageW, 50);
        Rect(content, 0.616f, 0.463f, 0.929f, 0, 739, pageW, 3);
        Text(content, "F2", 13, 1, 1, 1, 36, 760, "MERIDIAN LEGAL");
        Text(content, "F1", 9, 1, 1, 1, 430, 760, "Contract Portal");

        var title = ToPdfSafe(sample.Title);
        var subtitle = ToPdfSafe(sample.Subtitle);
        Text(content, "F2", 18, 0.063f, 0.094f, 0.184f, CenterX(title, 18, true), 700, title);
        Text(content, "F1", 11, 0.494f, 0.337f, 0.847f, CenterX(subtitle, 11, false), 680, subtitle);

        Rect(content, 0.616f, 0.463f, 0.929f, 48, 668, pageW - 96, 1.5f);

        // Metadata block
        float y = 646;
        void Meta(string label, string value)
        {
            Text(content, "F2", 9, 0.400f, 0.447f, 0.522f, 48, y, label);
            Text(content, "F1", 10, 0.063f, 0.094f, 0.184f, 150, y, value);
            y -= 16;
        }

        Meta("MATTER", $"{sample.MatterNumber}  {sample.MatterTitle}");
        Meta("PRACTICE", sample.MatterType);
        Meta("DOC TYPE", sample.DocumentType);
        Meta("CONTRACT", sample.ContractRef);
        Meta("VERSION", $"v{sample.Version}");
        y -= 8;
        Rect(content, 0.914f, 0.922f, 0.941f, 48, y - 4, pageW - 96, 1);
        y -= 22;

        foreach (var raw in sample.Body)
        {
            if (y < 72) break;
            var line = ToPdfSafe(raw);
            var isHeading = IsDocHeading(raw);
            foreach (var wrapped in WrapPdfLine(line, isHeading ? 72 : 88))
            {
                if (y < 72) break;
                if (isHeading)
                    Text(content, "F2", 12, 0.259f, 0.184f, 0.494f, 48, y, wrapped);
                else
                    Text(content, "F1", 10.5f, 0.094f, 0.125f, 0.204f, 48, y, wrapped);
                y -= isHeading ? 18 : 14;
            }
        }

        Rect(content, 0.259f, 0.184f, 0.494f, 0, 0, pageW, 36);
        Text(content, "F1", 8, 1, 1, 1, 36, 16, "CONFIDENTIAL  |  Office of Legal Operations");
        Text(content, "F1", 8, 1, 1, 1, 430, 16, "Meridian Legal");

        var streamBytes = PdfEncoding.GetBytes(content.ToString());
        var objects = new List<byte[]>
        {
            PdfEncoding.GetBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
            PdfEncoding.GetBytes("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
            PdfEncoding.GetBytes(
                "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
                "/Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n"),
            BuildStreamObject(4, streamBytes),
            PdfEncoding.GetBytes("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"),
            PdfEncoding.GetBytes("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n"),
        };

        using var ms = new MemoryStream();
        void Write(byte[] data) => ms.Write(data, 0, data.Length);

        Write(PdfEncoding.GetBytes("%PDF-1.4\n"));
        Write(new byte[] { 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A });

        var offsets = new List<long>(objects.Count);
        foreach (var obj in objects)
        {
            offsets.Add(ms.Position);
            Write(obj);
        }

        var xrefPos = ms.Position;
        var xref = new StringBuilder();
        xref.Append("xref\n");
        xref.Append("0 ").Append(objects.Count + 1).Append('\n');
        xref.Append("0000000000 65535 f \n");
        foreach (var off in offsets)
            xref.Append(off.ToString("D10", inv)).Append(" 00000 n \n");
        xref.Append("trailer\n");
        xref.Append("<< /Size ").Append(objects.Count + 1).Append(" /Root 1 0 R >>\n");
        xref.Append("startxref\n");
        xref.Append(xrefPos).Append('\n');
        xref.Append("%%EOF\n");
        Write(PdfEncoding.GetBytes(xref.ToString()));

        return ms.ToArray();
    }

    private static IEnumerable<string> WrapPdfLine(string text, int maxChars)
    {
        if (string.IsNullOrEmpty(text))
        {
            yield return string.Empty;
            yield break;
        }
        var remaining = text;
        while (remaining.Length > maxChars)
        {
            var cut = remaining.LastIndexOf(' ', maxChars);
            if (cut <= 0) cut = maxChars;
            yield return remaining[..cut];
            remaining = remaining[cut..].TrimStart();
        }
        yield return remaining;
    }

    private static bool IsDocHeading(string line)
    {
        if (string.IsNullOrWhiteSpace(line)) return false;
        return line.StartsWith("ARTICLE", StringComparison.OrdinalIgnoreCase)
               || line.StartsWith("IN THE ", StringComparison.OrdinalIgnoreCase)
               || line is "INTERNAL LEGAL MEMORANDUM"
               || line is "DOCUMENT OVERVIEW" or "PURPOSE" or "RELATED CONTRACT" or "NEXT ACTIONS"
               || (line.Length <= 48
                   && line.Equals(line.ToUpperInvariant(), StringComparison.Ordinal)
                   && line.Any(char.IsLetter));
    }

    private static byte[] BuildStreamObject(int objectNumber, byte[] streamBytes)
    {
        var header = PdfEncoding.GetBytes(
            $"{objectNumber} 0 obj\n<< /Length {streamBytes.Length} >>\nstream\n");
        var footer = PdfEncoding.GetBytes("\nendstream\nendobj\n");
        var result = new byte[header.Length + streamBytes.Length + footer.Length];
        Buffer.BlockCopy(header, 0, result, 0, header.Length);
        Buffer.BlockCopy(streamBytes, 0, result, header.Length, streamBytes.Length);
        Buffer.BlockCopy(footer, 0, result, header.Length + streamBytes.Length, footer.Length);
        return result;
    }

    /// <summary>PDF-safe ASCII text.</summary>
    private static string ToPdfSafe(string? text)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        var sb = new StringBuilder(text.Length);
        foreach (var ch in text)
        {
            switch (ch)
            {
                case '–' or '—' or '−':
                    sb.Append('-');
                    break;
                case '‘' or '’' or '‚':
                    sb.Append('\'');
                    break;
                case '“' or '”' or '„':
                    sb.Append('"');
                    break;
                case '…':
                    sb.Append("...");
                    break;
                case '·' or '•':
                    sb.Append('-');
                    break;
                case '\t':
                    sb.Append(' ');
                    break;
                case >= (char)32 and <= (char)126:
                    sb.Append(ch);
                    break;
                default:
                    if (char.IsWhiteSpace(ch)) sb.Append(' ');
                    break;
            }
        }
        return sb.ToString();
    }

    private static string EscapePdfLiteral(string s) =>
        s.Replace("\\", "\\\\", StringComparison.Ordinal)
         .Replace("(", "\\(", StringComparison.Ordinal)
         .Replace(")", "\\)", StringComparison.Ordinal);

    // ── Valid DOCX (branded OOXML) ───────────────────────────────────────────

    private static byte[] BuildValidDocx(ProfessionalSample sample)
    {
        XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        XNamespace r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

        static XElement Paragraph(
            XNamespace ns,
            string text,
            bool bold = false,
            int fontSizeHalfPoints = 22,
            string? colorHex = null,
            string align = "left",
            int after = 120)
        {
            var pPr = new List<object>
            {
                new XElement(ns + "jc", new XAttribute(ns + "val", align)),
                new XElement(ns + "spacing",
                    new XAttribute(ns + "after", after),
                    new XAttribute(ns + "line", "276"),
                    new XAttribute(ns + "lineRule", "auto")),
            };

            var rPr = new List<object>
            {
                new XElement(ns + "rFonts",
                    new XAttribute(ns + "ascii", "Calibri"),
                    new XAttribute(ns + "hAnsi", "Calibri"),
                    new XAttribute(ns + "eastAsia", "Calibri")),
                new XElement(ns + "sz", new XAttribute(ns + "val", fontSizeHalfPoints)),
                new XElement(ns + "szCs", new XAttribute(ns + "val", fontSizeHalfPoints)),
            };
            if (bold) rPr.Add(new XElement(ns + "b"));
            if (!string.IsNullOrEmpty(colorHex))
                rPr.Add(new XElement(ns + "color", new XAttribute(ns + "val", colorHex)));

            var t = new XElement(ns + "t", text ?? string.Empty);
            if (!string.IsNullOrEmpty(text) && (text.StartsWith(' ') || text.EndsWith(' ')))
                t.SetAttributeValue(XNamespace.Xml + "space", "preserve");

            return new XElement(ns + "p",
                new XElement(ns + "pPr", pPr),
                new XElement(ns + "r", new XElement(ns + "rPr", rPr), t));
        }

        static XElement MetaTable(XNamespace ns, ProfessionalSample s)
        {
            XElement Cell(string text, bool header, int width)
            {
                var shading = header ? "422F7D" : "F9F5FF";
                var color = header ? "FFFFFF" : "101828";
                var para = Paragraph(ns, text, bold: header, fontSizeHalfPoints: header ? 18 : 20, colorHex: color, after: 40);
                return new XElement(ns + "tc",
                    new XElement(ns + "tcPr",
                        new XElement(ns + "tcW", new XAttribute(ns + "w", width), new XAttribute(ns + "type", "dxa")),
                        new XElement(ns + "shd",
                            new XAttribute(ns + "val", "clear"),
                            new XAttribute(ns + "color", "auto"),
                            new XAttribute(ns + "fill", shading)),
                        new XElement(ns + "tcMar",
                            new XElement(ns + "top", new XAttribute(ns + "w", 80), new XAttribute(ns + "type", "dxa")),
                            new XElement(ns + "left", new XAttribute(ns + "w", 120), new XAttribute(ns + "type", "dxa")),
                            new XElement(ns + "bottom", new XAttribute(ns + "w", 80), new XAttribute(ns + "type", "dxa")),
                            new XElement(ns + "right", new XAttribute(ns + "w", 120), new XAttribute(ns + "type", "dxa")))),
                    para);
            }

            var rows = new (string Label, string Value)[]
            {
                ("Matter", $"{s.MatterNumber}  {s.MatterTitle}"),
                ("Practice", s.MatterType),
                ("Document type", s.DocumentType),
                ("Contract", s.ContractRef),
                ("Version", $"v{s.Version}"),
            };

            var trs = new List<object>();
            foreach (var (label, value) in rows)
            {
                trs.Add(new XElement(ns + "tr",
                    Cell(label, header: true, width: 2400),
                    Cell(value, header: false, width: 6960)));
            }

            return new XElement(ns + "tbl",
                new XElement(ns + "tblPr",
                    new XElement(ns + "tblW", new XAttribute(ns + "w", 9360), new XAttribute(ns + "type", "dxa")),
                    new XElement(ns + "tblBorders",
                        new XElement(ns + "top", new XAttribute(ns + "val", "single"), new XAttribute(ns + "sz", 4), new XAttribute(ns + "color", "E9D7FE")),
                        new XElement(ns + "left", new XAttribute(ns + "val", "single"), new XAttribute(ns + "sz", 4), new XAttribute(ns + "color", "E9D7FE")),
                        new XElement(ns + "bottom", new XAttribute(ns + "val", "single"), new XAttribute(ns + "sz", 4), new XAttribute(ns + "color", "E9D7FE")),
                        new XElement(ns + "right", new XAttribute(ns + "val", "single"), new XAttribute(ns + "sz", 4), new XAttribute(ns + "color", "E9D7FE")),
                        new XElement(ns + "insideH", new XAttribute(ns + "val", "single"), new XAttribute(ns + "sz", 4), new XAttribute(ns + "color", "E9D7FE")),
                        new XElement(ns + "insideV", new XAttribute(ns + "val", "nil"))),
                    new XElement(ns + "tblLook",
                        new XAttribute(ns + "val", "04A0"),
                        new XAttribute(ns + "firstRow", "1"),
                        new XAttribute(ns + "firstColumn", "1"))),
                trs);
        }

        var bodyChildren = new List<object>
        {
            Paragraph(w, sample.Title, bold: true, fontSizeHalfPoints: 36, colorHex: "422F7D", align: "center", after: 80),
            Paragraph(w, sample.Subtitle, fontSizeHalfPoints: 20, colorHex: "7E56D8", align: "center", after: 240),
            MetaTable(w, sample),
            Paragraph(w, string.Empty, after: 200),
        };

        foreach (var line in sample.Body)
        {
            var heading = IsDocHeading(line);
            bodyChildren.Add(Paragraph(
                w,
                line,
                bold: heading,
                fontSizeHalfPoints: heading ? 24 : 22,
                colorHex: heading ? "422F7D" : "18212F",
                align: heading ? "left" : "both",
                after: heading ? 80 : 140));
        }

        bodyChildren.Add(new XElement(w + "sectPr",
            new XElement(w + "headerReference", new XAttribute(w + "type", "default"), new XAttribute(r + "id", "rId1")),
            new XElement(w + "footerReference", new XAttribute(w + "type", "default"), new XAttribute(r + "id", "rId2")),
            new XElement(w + "pgSz", new XAttribute(w + "w", 12240), new XAttribute(w + "h", 15840)),
            new XElement(w + "pgMar",
                new XAttribute(w + "top", 1440),
                new XAttribute(w + "right", 1440),
                new XAttribute(w + "bottom", 1440),
                new XAttribute(w + "left", 1440),
                new XAttribute(w + "header", 720),
                new XAttribute(w + "footer", 720))));

        var documentXml = new XDocument(
            new XDeclaration("1.0", "UTF-8", "yes"),
            new XElement(w + "document",
                new XAttribute(XNamespace.Xmlns + "w", w),
                new XAttribute(XNamespace.Xmlns + "r", r),
                new XElement(w + "body", bodyChildren)));

        var headerXml = $"""
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
              <w:p>
                <w:pPr>
                  <w:jc w:val="left"/>
                  <w:pBdr>
                    <w:bottom w:val="single" w:sz="12" w:space="4" w:color="9D76ED"/>
                  </w:pBdr>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:b/>
                    <w:color w:val="422F7D"/>
                    <w:sz w:val="22"/>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  </w:rPr>
                  <w:t>MERIDIAN LEGAL</w:t>
                </w:r>
                <w:r>
                  <w:rPr>
                    <w:color w:val="667085"/>
                    <w:sz w:val="20"/>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  </w:rPr>
                  <w:t xml:space="preserve">    Contract Portal</w:t>
                </w:r>
              </w:p>
            </w:hdr>
            """;

        var footerXml = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
              <w:p>
                <w:pPr>
                  <w:jc w:val="center"/>
                  <w:pBdr>
                    <w:top w:val="single" w:sz="6" w:space="4" w:color="E9D7FE"/>
                  </w:pBdr>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:color w:val="667085"/>
                    <w:sz w:val="16"/>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  </w:rPr>
                  <w:t>Confidential  |  Office of Legal Operations  |  Meridian Legal</w:t>
                </w:r>
              </w:p>
            </w:ftr>
            """;

        const string contentTypes = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
              <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
              <Default Extension="xml" ContentType="application/xml"/>
              <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
              <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
              <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
            </Types>
            """;

        const string packageRels = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
            </Relationships>
            """;

        const string documentRels = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
              <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
            </Relationships>
            """;

        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteZipEntry(zip, "[Content_Types].xml", contentTypes);
            WriteZipEntry(zip, "_rels/.rels", packageRels);
            WriteZipEntry(zip, "word/document.xml", documentXml.ToString(SaveOptions.DisableFormatting));
            WriteZipEntry(zip, "word/_rels/document.xml.rels", documentRels);
            WriteZipEntry(zip, "word/header1.xml", headerXml);
            WriteZipEntry(zip, "word/footer1.xml", footerXml);
        }

        return ms.ToArray();
    }

    private static void WriteZipEntry(ZipArchive zip, string entryName, string content)
    {
        var entry = zip.CreateEntry(entryName, CompressionLevel.Optimal);
        using var stream = entry.Open();
        using var writer = new StreamWriter(stream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        writer.Write(content);
    }

    private static byte[] PngBuilder() =>
        Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=");

    private static byte[] SpreadsheetBuilder(ProfessionalSample sample)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Field,Value");
        sb.AppendLine($"Title,\"{EscapeCsv(sample.Title)}\"");
        sb.AppendLine($"Matter,\"{EscapeCsv(sample.MatterNumber)}\"");
        sb.AppendLine($"MatterTitle,\"{EscapeCsv(sample.MatterTitle)}\"");
        sb.AppendLine($"DocumentType,\"{EscapeCsv(sample.DocumentType)}\"");
        sb.AppendLine($"Contract,\"{EscapeCsv(sample.ContractRef)}\"");
        sb.AppendLine($"Version,{sample.Version}");
        sb.AppendLine();
        sb.AppendLine("Line,Description,AmountUSD");
        sb.AppendLine("1,Professional services - review,12500");
        sb.AppendLine("2,Document production support,3200");
        sb.AppendLine("3,Status conference preparation,1750");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static string EscapeCsv(string value) =>
        (value ?? string.Empty).Replace("\"", "\"\"", StringComparison.Ordinal);
}
