import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileManagerComponent,
  Inject,
  NavigationPane,
  DetailsView,
  Toolbar,
} from '@syncfusion/ej2-react-filemanager';
import {
  PdfViewerComponent,
  Toolbar as PdfToolbar,
  Magnification,
  Navigation as PdfNavigation,
  LinkAnnotation,
  BookmarkView,
  ThumbnailView,
  Print,
  TextSelection,
  TextSearch,
  Annotation,
  Inject as PdfInject,
} from '@syncfusion/ej2-react-pdfviewer';
import {
  DocumentEditorContainerComponent,
  Toolbar as DocEditorToolbar,
  Ribbon,
} from '@syncfusion/ej2-react-documenteditor';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import { AlertTriangle, RefreshCw, FileText, FileWarning } from 'lucide-react';
import {
  ApiError,
  listMatters,
  getMatterDocuments,
  listDeadlines,
  documentContentUrl,
  PDF_VIEWER_RESOURCE_URL,
  DOC_EDITOR_SERVICE_URL,
  FileNode,
} from '../services';
import type {
  DocumentNode, MatterSummary, DeadlineSummary,
} from '../models/api';
import { buildDocumentTreeFromApi } from '../utils/apiMappers';
import { DocumentStatus } from '../models';
import { KpiCard, type KpiIconTone } from '../components/KpiCard';
import { toTitleCase } from '../utils/casing';
import '../styles/DocumentsPage.css';
import '../styles/KpiCard.css';

DocumentEditorContainerComponent.Inject(DocEditorToolbar, Ribbon);

type LoadState = 'loading' | 'success' | 'empty' | 'error';

interface SelectedDocument {
  documentId: string;
  contractId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'other';
  version: number;
  status: DocumentStatus;
  uploadedBy: string;
  /** Absolute API content URL — professional sample from DocumentContentProvider. */
  contentUrl: string;
  /** Path actually loaded in PDF Viewer (API URL or local sample fallback). */
  pdfDocumentPath?: string;
  description?: string;
  documentTypeLabel?: string;
  matterNumber?: string;
  /** ISO createdAt of the underlying API document, for the Context panel. */
  createdAt?: string;
}

function DocumentsPage() {
  const navigate = useNavigate();
  const docEditorRef = useRef<DocumentEditorContainerComponent | null>(null);
  const pdfViewerRef = useRef<PdfViewerComponent | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matters, setMatters] = useState<MatterSummary[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentNode[]>([]);
  const [overlayFiles, setOverlayFiles] = useState<FileNode[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Related deadlines for the selected document's matter — feeds the Context panel.
  const [relatedDeadlines, setRelatedDeadlines] = useState<DeadlineSummary[]>([]);
  const [relatedDeadlinesLoading, setRelatedDeadlinesLoading] = useState(false);

  const matterOptions = useMemo(
    () => matters.map(m => ({ text: `${m.matterNumber} — ${m.title}`, value: m.matterNumber })),
    [matters],
  );

  const loadMatters = useCallback(async () => {
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const res = await listMatters({ status: 'Active', page: 1, pageSize: 100, sort: 'openDate:desc' });
      const items = res.items ?? [];
      setMatters(items);
      const first = items[0]?.matterNumber ?? '';
      setSelectedMatter(first);
      if (!first) {
        setDocuments([]);
        setOverlayFiles([]);
        setLoadState('empty');
        return;
      }
      const docs = await getMatterDocuments(first);
      setDocuments(docs ?? []);
      setOverlayFiles(buildDocumentTreeFromApi(docs ?? []));
      setSelectedDocument(null);
      setLoadState((docs?.length ?? 0) === 0 ? 'empty' : 'success');
    } catch (err) {
      const message = err instanceof ApiError
        ? `${err.message}${err.problemTitle ? ` — ${err.problemTitle}` : ''}`
        : err instanceof Error ? err.message : 'Unknown error';
      // Matters list failure blocks the page (not PDF Viewer itself).
      setErrorMsg(
        `Matters API failed (required before PDF/DOCX preview). ${message}. `
        + 'Confirm the API is running on the Vite proxy target (default http://localhost:5186) and PostgreSQL is up.',
      );
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void loadMatters();
  }, [loadMatters]);

  const loadDocumentsForMatter = useCallback(async (matterNumber: string) => {
    if (!matterNumber) return;
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const docs = await getMatterDocuments(matterNumber);
      setDocuments(docs ?? []);
      setOverlayFiles(buildDocumentTreeFromApi(docs ?? []));
      setSelectedDocument(null);
      setRelatedDeadlines([]);
      setLoadState((docs?.length ?? 0) === 0 ? 'empty' : 'success');
    } catch (err) {
      const message = err instanceof ApiError
        ? `${err.message}${err.problemTitle ? ` — ${err.problemTitle}` : ''}`
        : err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(`Could not load documents for ${matterNumber}: ${message}`);
      setLoadState('error');
    }
  }, []);

  const fileType = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.docx')) return 'docx';
    if (lower.endsWith('.xlsx')) return 'xlsx';
    if (lower.endsWith('.zip')) return 'zip';
    return 'file';
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const selectDocument = (fileNode?: FileNode, preview = false) => {
    if (!fileNode?.isFile || !fileNode.data) {
      return;
    }
    const ext = fileType(fileNode.name);
    const previewType: 'pdf' | 'docx' | 'other' =
      ext === 'pdf' || ext === 'docx' ? ext : 'other';
    const contentUrl =
      fileNode.data.contentUrl
      || documentContentUrl(fileNode.data.documentId);
    const matterNumber =
      fileNode.data.matterNumber
      || documents.find(d => String(d.documentId) === fileNode.data?.documentId)?.matterNumber
      || selectedMatter;
    const typeLabel = fileNode.data.documentTypeLabel;

    if (matterNumber) {
      setRelatedDeadlinesLoading(true);
      listDeadlines()
        .then((dls) => setRelatedDeadlines((dls ?? []).filter(d => d.matterNumber === matterNumber)))
        .catch(() => setRelatedDeadlines([]))
        .finally(() => setRelatedDeadlinesLoading(false));
    } else {
      setRelatedDeadlines([]);
    }

    setSelectedDocument({
      documentId: fileNode.data.documentId,
      contractId: fileNode.data.contractId,
      fileName: fileNode.name,
      fileType: previewType,
      version: fileNode.data.version,
      status: fileNode.data.status,
      uploadedBy: typeof fileNode.data.uploadedBy === 'string'
        ? fileNode.data.uploadedBy
        : 'Unknown',
      contentUrl,
      pdfDocumentPath: previewType === 'pdf' ? contentUrl : undefined,
      matterNumber,
      documentTypeLabel: typeLabel,
      createdAt: documents.find(d => String(d.documentId) === fileNode.data?.documentId)?.createdAt,
      description:
        fileNode.data.description
        || [matterNumber, typeLabel].filter(Boolean).join(' · '),
    });

    if (!preview) return;

    if (previewType !== 'pdf' && previewType !== 'docx') {
      showToast(`"${fileNode.name}" cannot be previewed.`);
      return;
    }
    setDocxError(null);
    setDocxLoading(previewType === 'docx');
    setPreviewVisible(true);
  };

  /** Open the selected DOCX in the document editor. */
  const loadDocxIntoEditor = useCallback(async (doc: SelectedDocument) => {
    const container = docEditorRef.current;
    if (!container?.documentEditor) {
      setDocxError('Document Editor is not ready.');
      setDocxLoading(false);
      return;
    }
    setDocxLoading(true);
    setDocxError(null);
    try {
      const response = await fetch(doc.contentUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document (${response.status} ${response.statusText})`);
      }
      const buffer = await response.arrayBuffer();
      // OOXML packages start with PK (ZIP). Guard against HTML error pages.
      const header = new Uint8Array(buffer.slice(0, 2));
      if (header[0] !== 0x50 || header[1] !== 0x4b) {
        throw new Error(
          'API did not return a DOCX package. Restart the API so DocumentContentProvider serves valid OOXML.',
        );
      }
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const file = new File(
        [blob],
        doc.fileName.toLowerCase().endsWith('.docx') ? doc.fileName : `${doc.fileName}.docx`,
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      );
      await container.documentEditor.openAsync(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open DOCX in Document Editor.';
      setDocxError(message);
      showToast(`DOCX open failed: ${message}`);
    } finally {
      setDocxLoading(false);
    }
  }, []);

  const handleDocEditorCreated = useCallback(() => {
    if (selectedDocument?.fileType !== 'docx') return;
    // Defer one frame so container.documentEditor is fully wired after mount.
    window.requestAnimationFrame(() => {
      void loadDocxIntoEditor(selectedDocument);
    });
  }, [selectedDocument, loadDocxIntoEditor]);


  const handleMenuClick = (args: { item?: { text?: string }; fileDetails?: FileNode | FileNode[] }) => {
    const text = args?.item?.text;
    const fileNode = Array.isArray(args?.fileDetails)
      ? args.fileDetails?.[0]
      : (args?.fileDetails as FileNode);
    if (!text || !fileNode) return;
    if (text === 'Preview') {
      selectDocument(fileNode, true);
    } else if (text === 'Set as Current') {
      showToast(`"${fileNode.name}" marked as current version.`);
    } else if (text === 'Upload New Version') {
      showToast(`Upload a new version of "${fileNode.name}".`);
    } else if (text === 'Delete Draft') {
      const ok = window.confirm(`Delete draft "${fileNode.name}"?`);
      if (ok) {
        setOverlayFiles((prev) => prev.filter((n) => n.id !== fileNode.id));
        showToast(`"${fileNode.name}" removed from this session.`);
      }
    } else if (text === 'Download') {
      if (fileNode.data?.documentId) {
        window.open(documentContentUrl(fileNode.data.documentId), '_blank');
      }
    }
  };

  const handleMenuOpen = (args: { items?: Array<{ id?: string; iconCss?: string }> }) => {
    (args.items || []).forEach((item) => {
      const key = (item.id || '').split('_').pop();
      switch (key) {
        case 'preview':
          item.iconCss = 'e-icons e-eye';
          break;
        case 'upload-version':
          item.iconCss = 'e-icons e-circle-plus';
          break;
        case 'set-current':
          item.iconCss = 'e-icons e-check';
          break;
        case 'delete-draft':
          item.iconCss = 'e-icons e-trash';
          break;
        default:
          break;
      }
    });
  };

  const handleDialogClose = () => {
    setPreviewVisible(false);
    setDocxError(null);
    setDocxLoading(false);
    docEditorRef.current = null;
    pdfViewerRef.current = null;
  };



  // Memoize KPI counts when the document list changes.
  const kpis = useMemo(() => {
    const total = documents.length;
    const pdfCount = documents.filter(d => d.fileName.toLowerCase().endsWith('.pdf')).length;
    const docxCount = documents.filter(d => d.fileName.toLowerCase().endsWith('.docx')).length;
    const flagged = documents.filter(d =>
      d.documentType?.toLowerCase().includes('nda') ||
      d.documentType?.toLowerCase().includes('msa') ||
      d.documentType?.toLowerCase().includes('saas'),
    ).length;
    return { total, pdfCount, docxCount, flagged };
  }, [documents]);

  const kpiCards: Array<{
    key: string; title: string; value: string; subtitle: string;
    icon: React.ReactNode; iconTone: KpiIconTone;
  }> = useMemo(() => [
    {
      key: 'total',
      title: 'Total Documents',
      value: String(kpis.total),
      subtitle: `Matter ${selectedMatter || '—'}`,
      icon: <FileText size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'blue',
    },
    {
      key: 'pdf',
      title: 'PDF Documents',
      value: String(kpis.pdfCount),
      subtitle: 'PDF Viewer previewable',
      icon: <FileText size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'red',
    },
    {
      key: 'docx',
      title: 'DOCX Documents',
      value: String(kpis.docxCount),
      subtitle: 'Document Editor previewable',
      icon: <FileText size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'purple',
    },
    {
      key: 'flagged',
      title: 'Flagged for Review',
      value: String(kpis.flagged),
      subtitle: 'High-risk contract types',
      icon: <FileWarning size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'orange',
    },
  ], [kpis, selectedMatter]);

  const latestVersionForSelected = useMemo(() => {
    if (!selectedDocument) return null;
    const sameDoc = documents.filter(d =>
      String(d.documentId) === selectedDocument.documentId,
    );
    if (!sameDoc.length) return selectedDocument.version;
    return Math.max(...sameDoc.map(d => d.version));
  }, [selectedDocument, documents]);

  const fmtDate = useCallback((iso?: string) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }).format(new Date(`${iso}T12:00:00`));
    } catch {
      return iso;
    }
  }, []);

  /** Resize the preview viewer after the dialog opens. */
  const handleDialogOpen = useCallback(() => {
    const relayout = () => {
      docEditorRef.current?.resize?.();
      window.dispatchEvent(new Event('resize'));
    };
    window.requestAnimationFrame(relayout);
    window.setTimeout(relayout, 150);
  }, []);

  const previewHeader = selectedDocument
    ? selectedDocument.fileType === 'docx'
      ? `Document Editor — ${selectedDocument.fileName}`
      : `PDF Preview — ${selectedDocument.fileName}`
    : 'Preview';

  if (loadState === 'error' && !matters.length) {
    return (
      <div className="page documents-page">
        <div className="panel" role="alert">
          <div className="panel-body panel-body--inline-alert">
            <AlertTriangle size={20} aria-hidden="true" />
            <span>{errorMsg ?? 'Could not load documents.'}</span>
            <button type="button" className="btn btn-primary" onClick={() => void loadMatters()}>
              <RefreshCw size={14} aria-hidden="true" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page documents-page">
      <div className="page-header">
        <div>
          <h1>Document Repository</h1>
          <p className="page-subtitle">
            Browse and preview matter documents.
          </p>
        </div>
        <div className="page-actions">
          <div className="documents-matter-select">
            <DropDownListComponent
              dataSource={matterOptions}
              fields={{ text: 'text', value: 'value' }}
              value={selectedMatter}
              placeholder="Select matter"
              cssClass="documents-matter-input"
              width="100%"
              popupWidth="100%"
              change={(args: { value?: string }) => {
                const value = args.value ?? '';
                setSelectedMatter(value);
                void loadDocumentsForMatter(value);
              }}
            />
          </div>
        </div>
      </div>

      {loadState === 'loading' && (
        <div className="panel">
          <div className="panel-body">
            <SkeletonComponent shape="Rectangle" width="100%" height={480} />
          </div>
        </div>
      )}

      {loadState === 'error' && (
        <div className="panel" role="alert">
          <div className="panel-body panel-body--inline-alert">
            <AlertTriangle size={20} aria-hidden="true" />
            <span>{errorMsg}</span>
            <button type="button" className="btn btn-primary" onClick={() => void loadDocumentsForMatter(selectedMatter)}>
              <RefreshCw size={14} aria-hidden="true" /> Retry
            </button>
          </div>
        </div>
      )}

      {(loadState === 'success' || loadState === 'empty') && (
        <>
        <div className="kpi-cards kpi-strip documents-kpi-strip" aria-label="Document statistics">
          {kpiCards.map(card => (
            <KpiCard
              key={card.key}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              iconTone={card.iconTone}
            />
          ))}
        </div>

        <div className="documents-layout panel">
          <div className="documents-file-manager">
            {loadState === 'empty' ? (
              <div className="panel-body documents-empty-body">
                <p>No documents found for matter <strong>{selectedMatter}</strong>.</p>
              </div>
            ) : (
              <FileManagerComponent
                id="document-file-manager"
                key={selectedMatter}
                fileSystemData={overlayFiles as unknown as Record<string, object>[]}
                view="Details"
                height="640px"
                allowDragAndDrop={false}
                allowMultiSelection={false}
                showFileExtension={true}
                toolbarSettings={{
                  items: ['Refresh', 'Details'],
                }}
                contextMenuSettings={{
                  file: [
                    'Preview',
                    '|',
                    'Download',
                    'Upload New Version',
                    'Set as Current',
                    'Delete Draft',
                    '|',
                    'Details',
                  ],
                  folder: ['Open', '|', 'Details', 'Refresh'],
                  layout: ['View', 'Refresh', '|', 'Details', '|', 'SelectAll'],
                }}
                menuClick={handleMenuClick}
                menuOpen={handleMenuOpen}
                fileSelect={(args: { action?: string; fileDetails?: FileNode | FileNode[] }) => {
                  if (args?.action === 'unselect') return;
                  const node = Array.isArray(args?.fileDetails)
                    ? args.fileDetails[0]
                    : (args?.fileDetails as FileNode);
                  if (node?.isFile) {
                    selectDocument(node, false);
                  }
                }}
                fileOpen={(args: { fileDetails?: FileNode | FileNode[] }) => {
                  const node = Array.isArray(args?.fileDetails)
                    ? args.fileDetails[0]
                    : (args?.fileDetails as FileNode);
                  if (node?.isFile) {
                    selectDocument(node, true);
                  }
                }}
              >
                <Inject services={[NavigationPane, DetailsView, Toolbar]} />
              </FileManagerComponent>
            )}
          </div>

          <aside className="documents-hint" aria-label="Document context">
            {selectedDocument ? (
              <div className="documents-context-panel">
                <h3 className="documents-context-title">{selectedDocument.fileName}</h3>

                <div className="documents-context-section">
                  <span className="documents-context-label">Current Version</span>
                  <span className="documents-context-value">
                    v{selectedDocument.version}
                    {latestVersionForSelected != null
                      && latestVersionForSelected !== selectedDocument.version
                      ? ` (latest v${latestVersionForSelected})`
                      : ' (latest)'}
                  </span>
                </div>

                <div className="documents-context-section">
                  <span className="documents-context-label">Contract</span>
                  <span className="documents-context-value">
                    {selectedDocument.contractId ? `CON-${selectedDocument.contractId}` : '—'}
                  </span>
                </div>

                <div className="documents-context-section">
                  <span className="documents-context-label">Matter</span>
                  {selectedDocument.matterNumber ? (
                    <button
                      type="button"
                      className="documents-context-link"
                      onClick={() => {
                        const mn = selectedDocument.matterNumber!;
                        handleDialogClose?.();
                        navigate(`/matters/${mn}`);
                      }}
                    >
                      {selectedDocument.matterNumber} →
                    </button>
                  ) : (
                    <span className="documents-context-value">—</span>
                  )}
                </div>

                <div className="documents-context-section">
                  <span className="documents-context-label">Uploaded By</span>
                  <span className="documents-context-value">
                    {toTitleCase(selectedDocument.uploadedBy)}
                    {selectedDocument.createdAt
                      ? ` · ${fmtDate(selectedDocument.createdAt)}`
                      : ''}
                  </span>
                </div>

                {selectedDocument.documentTypeLabel && (
                  <div className="documents-context-section">
                    <span className="documents-context-label">Doc Type</span>
                    <span className="documents-context-value">
                      {toTitleCase(selectedDocument.documentTypeLabel)}
                    </span>
                  </div>
                )}

                {selectedDocument.description && (
                  <div className="documents-context-section">
                    <span className="documents-context-label">Description</span>
                    <span className="documents-context-value documents-context-description">
                      {selectedDocument.description}
                    </span>
                  </div>
                )}

                <div className="documents-context-section documents-context-deadlines">
                  <span className="documents-context-label">Related Deadlines</span>
                  {relatedDeadlinesLoading ? (
                    <SkeletonComponent shape="Text" width="100%" height="14px" />
                  ) : relatedDeadlines.length === 0 ? (
                    <span className="documents-context-value documents-context-muted">
                      No upcoming deadlines.
                    </span>
                  ) : (
                    <ul className="documents-context-deadline-list">
                      {relatedDeadlines.slice(0, 5).map((d, i) => (
                        <li key={`${d.title}-${i}`} className="documents-context-deadline-item">
                          <span className="documents-context-deadline-date">
                            {fmtDate(d.dueDate)}
                          </span>
                          <span className="documents-context-deadline-title">{d.title}</span>
                          <span className={`status-badge status-${(d.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {toTitleCase(d.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>
            ) : (
              <div className="documents-hint-card">
                <div className="documents-hint-icon" aria-hidden="true">📄</div>
                <h3>Click a file to view details</h3>
                <ul className="documents-hint-list">
                  <li>Single-click shows metadata in this panel.</li>
                  <li>
                    <span className="documents-hint-tag documents-hint-tag-pdf">PDF</span>
                    Double-click to preview in PDF Viewer.
                  </li>
                  <li>
                    <span className="documents-hint-tag documents-hint-tag-docx">DOCX</span>
                    Double-click to open in Document Editor.
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </div>
        </>
      )}

      {previewVisible && selectedDocument && (
        <DialogComponent
          id="doc-preview-dialog"
          visible={previewVisible}
          header={previewHeader}
          width="92vw"
          height="92vh"
          showCloseIcon={true}
          close={handleDialogClose}
          open={handleDialogOpen}
          isModal={true}
          animationSettings={{ effect: 'Fade' }}
          cssClass="doc-preview-dialog"
        >
          <div className="doc-preview-body">
            <div className="doc-preview-chrome">
              <div className="doc-preview-chrome-meta" aria-label="Document metadata">
                {selectedDocument.contractId ? (
                  <span className="doc-preview-chrome-text">
                    CON-{selectedDocument.contractId}
                  </span>
                ) : (
                  <span className="doc-preview-chrome-muted">No contract</span>
                )}
                <span className="doc-preview-chrome-sep" aria-hidden="true">·</span>
                <span className="doc-preview-chrome-text">
                  v{selectedDocument.version}
                  {latestVersionForSelected != null
                    && latestVersionForSelected !== selectedDocument.version
                    ? ` · latest v${latestVersionForSelected}`
                    : ' · latest'}
                </span>
                <span className="doc-preview-chrome-sep" aria-hidden="true">·</span>
                <span className={`status-badge status-${selectedDocument.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {toTitleCase(selectedDocument.status)}
                </span>
                {selectedDocument.matterNumber && (
                  <>
                    <span className="doc-preview-chrome-sep" aria-hidden="true">·</span>
                    <button
                      type="button"
                      className="doc-preview-meta-link"
                      aria-label={`Open matter ${selectedDocument.matterNumber}`}
                      onClick={() => {
                        const mn = selectedDocument.matterNumber!;
                        handleDialogClose();
                        navigate(`/matters/${mn}`);
                      }}
                    >
                      {selectedDocument.matterNumber} →
                    </button>
                  </>
                )}
                <span className="doc-preview-chrome-sep" aria-hidden="true">·</span>
                <span className="doc-preview-chrome-text doc-preview-chrome-nowrap">
                  {toTitleCase(selectedDocument.uploadedBy)}
                  {selectedDocument.createdAt ? ` · ${fmtDate(selectedDocument.createdAt)}` : ''}
                </span>
              </div>
            </div>

            {selectedDocument.fileType === 'pdf' && (
              <div className="doc-preview-viewer">
                <PdfViewerComponent
                  key={`${selectedDocument.documentId}-${selectedDocument.pdfDocumentPath ?? selectedDocument.contentUrl}`}
                  ref={(instance: PdfViewerComponent | null) => {
                    pdfViewerRef.current = instance;
                  }}
                  id={`standalone-pdf-viewer-${selectedDocument.documentId}`}
                  documentPath={selectedDocument.pdfDocumentPath ?? selectedDocument.contentUrl}
                  resourceUrl={PDF_VIEWER_RESOURCE_URL}
                  serviceUrl=""
                  enableToolbar={true}
                  enableNavigation={true}
                  enableMagnification={true}
                  enableTextSearch={true}
                  enableTextSelection={true}
                  enablePrint={true}
                  enableDownload={true}
                  enableAnnotation={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <PdfInject
                    services={[
                      PdfToolbar,
                      Magnification,
                      PdfNavigation,
                      LinkAnnotation,
                      BookmarkView,
                      ThumbnailView,
                      Print,
                      TextSelection,
                      TextSearch,
                      Annotation,
                    ]}
                  />
                </PdfViewerComponent>
              </div>
            )}

            {selectedDocument.fileType === 'docx' && (
              <div className="doc-preview-viewer doc-preview-docx">
                {docxLoading && (
                  <div className="doc-preview-loading" role="status" aria-live="polite">
                    <SkeletonComponent shape="Rectangle" width="100%" height={48} />
                    <p>Opening document in Document Editor…</p>
                  </div>
                )}
                {docxError && (
                  <div className="doc-preview-error" role="alert">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <span>{docxError}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void loadDocxIntoEditor(selectedDocument)}
                    >
                      Retry
                    </button>
                  </div>
                )}
                <DocumentEditorContainerComponent
                  key={selectedDocument.documentId}
                  id={`docx-editor-${selectedDocument.documentId}`}
                  ref={(instance: DocumentEditorContainerComponent | null) => {
                    docEditorRef.current = instance;
                  }}
                  height="100%"
                  serviceUrl={DOC_EDITOR_SERVICE_URL}
                  enableToolbar={true}
                  toolbarMode="Ribbon"
                  ribbonLayout="Classic"
                  showPropertiesPane={true}
                  created={handleDocEditorCreated}
                />
              </div>
            )}
          </div>
        </DialogComponent>
      )}

      {toastMessage && (
        <div className="documents-toast" role="alert">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;
