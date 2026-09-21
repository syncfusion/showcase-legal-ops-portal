// Map API values to UI models and labels.

import type { DeadlineSummary, DocumentNode } from '../models/api';
import {
  Deadline, DeadlineStatus, DeadlineType,
} from '../models/Deadline';
import type { LifecycleStage } from '../models/Contract';
import type { FileNode } from '../services/fileService';
import { DocumentStatus, DocumentType } from '../models/ContractDocument';
import { documentContentUrl } from '../services/apiClient';

/** Map API contract stage to a Kanban column. */
export function lifecycleStageFromApi(stage: string): LifecycleStage {
  switch (stage) {
    case 'Draft':
      return 'Draft';
    case 'InReview':
      return 'Negotiate';
    case 'InNegotiation':
      return 'Negotiate';
    case 'PendingApproval':
      return 'InternalApproval';
    case 'Executed':
      return 'Executed';
    case 'Active':
      return 'Active';
    case 'RenewalDue':
    case 'Expired':
      return 'RenewalExpiry';
    case 'Terminated':
      return 'Active';
    default:
      return 'Draft';
  }
}

/** Map API deadline type to the UI enum. */
export function mapDeadlineType(apiType: string): DeadlineType {
  switch (apiType) {
    case 'CourtDate':
    case 'Hearing':
      return DeadlineType.Court;
    case 'FilingWindow':
    case 'MotionResponse':
      return DeadlineType.Filing;
    case 'StatuteOfLimitations':
      return DeadlineType.SOL;
    case 'Renewal':
    case 'Milestone':
      return DeadlineType.Renewal;
    case 'Discovery':
    case 'Deposition':
      return DeadlineType.Filing;
    default:
      return DeadlineType.Filing;
  }
}

export function mapDeadlineStatus(apiStatus: string): DeadlineStatus {
  switch (apiStatus) {
    case 'Upcoming':
      return DeadlineStatus.Upcoming;
    case 'DueSoon':
      return DeadlineStatus.DueSoon;
    case 'Overdue':
      return DeadlineStatus.Overdue;
    case 'Completed':
      return DeadlineStatus.Completed;
    case 'Waived':
      return DeadlineStatus.Waived;
    default:
      return DeadlineStatus.Upcoming;
  }
}

function riskBandFor(status: DeadlineStatus, type: DeadlineType): Deadline['riskBand'] {
  if (status === DeadlineStatus.Overdue) return 'high';
  if (type === DeadlineType.SOL) return 'high';
  if (status === DeadlineStatus.DueSoon) return 'medium';
  return 'low';
}

/** Map API deadline rows for the scheduler. */
export function mapApiDeadlines(rows: DeadlineSummary[]): Deadline[] {
  return rows.map((d, index) => {
    const type = mapDeadlineType(d.deadlineType);
    const status = mapDeadlineStatus(d.status);
    const dueDate = new Date(`${d.dueDate}T09:00:00`);
    const ownerKey = d.owner || 'unassigned';
    return {
      id: `${d.matterNumber}-${d.dueDate}-${d.deadlineType}-${index}`,
      matterCaseNumber: d.matterNumber,
      matterTitle: d.title,
      title: d.title,
      type,
      status,
      dueDate,
      jurisdiction: d.jurisdiction || 'Unspecified',
      ownerStaffId: ownerKey,
      ownerName: d.owner || 'Unassigned',
      riskBand: riskBandFor(status, type),
    };
  });
}

/** Display label for an invoice status. */
export function formatInvoiceStatus(status: string): string {
  switch (status) {
    case 'UnderReview':
      return 'Under Review';
    default:
      return status;
  }
}

/** File Manager id without path separators. */
function fileManagerSafeId(...parts: string[]): string {
  return parts
    .map((p) =>
      String(p)
        .trim()
        .replace(/[/\\]+/g, '-')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'item',
    )
    .join('--');
}

/** Build the File Manager tree from document rows. */
export function buildDocumentTreeFromApi(docs: DocumentNode[]): FileNode[] {
  const nodes: FileNode[] = [];
  const seen = new Set<string>();

  const permission = {
    copy: true,
    download: true,
    read: true,
    write: false,
    writeContents: false,
    upload: false,
    message: 'Read-only',
  };

  const ensureFolder = (
    id: string,
    name: string,
    parentId: string | null,
    filterPath: string,
    filterId: string,
  ) => {
    if (seen.has(id)) return;
    nodes.push({
      id,
      name,
      parentId,
      isFile: false,
      size: 0,
      type: '',
      dateCreated: new Date('2023-01-01'),
      dateModified: new Date('2023-01-01'),
      filterPath,
      filterId,
      hasChild: false, // set after tree is complete
      permission,
    });
    seen.add(id);
  };

  const rootId = 'root-documents';
  ensureFolder(rootId, 'Documents', null, '', '');

  docs.forEach((doc) => {
    // Files sit directly under the Documents root.
    const parentId: string = rootId;
    const filterPath = 'Documents\\';
    const filterId = `${rootId}/`;

    const ext = doc.fileName.includes('.')
      ? `.${doc.fileName.split('.').pop()!.toLowerCase()}`
      : '';
    const created = new Date(`${doc.createdAt}T12:00:00`);
    const fileId = fileManagerSafeId('doc', String(doc.documentId));

    if (seen.has(fileId)) return;

    const contentUrl = documentContentUrl(doc.documentId);
    nodes.push({
      id: fileId,
      name: doc.fileName,
      parentId,
      isFile: true,
      size: doc.sizeBytes,
      type: ext,
      dateCreated: created,
      dateModified: created,
      filterPath,
      filterId,
      hasChild: false,
      permission,
      data: {
        documentId: String(doc.documentId),
        contractId: doc.contractId != null ? String(doc.contractId) : '',
        documentType: DocumentType.Other,
        documentTypeLabel: doc.documentType,
        status: DocumentStatus.Final,
        version: doc.version,
        uploadedBy: doc.uploadedBy,
        contentUrl,
        matterNumber: doc.matterNumber,
        description: [
          doc.matterNumber,
          doc.documentType,
          doc.contractId != null ? `Contract #${doc.contractId}` : null,
        ].filter(Boolean).join(' · '),
        tags: [doc.matterNumber, doc.documentType].filter(Boolean),
      },
    });
    seen.add(fileId);
  });

  // Accurate hasChild for navigation expand/collapse
  const childCount = new Map<string, number>();
  for (const n of nodes) {
    if (n.parentId != null) {
      childCount.set(n.parentId, (childCount.get(n.parentId) ?? 0) + 1);
    }
  }
  for (const n of nodes) {
    if (!n.isFile) {
      n.hasChild = (childCount.get(n.id) ?? 0) > 0;
    }
  }

  return nodes;
}
