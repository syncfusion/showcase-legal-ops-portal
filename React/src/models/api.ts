// API response shapes used by the React client.

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface LookupItem {
  code: string;
  name: string;
  category?: string | null;
}

export interface MatterSummary {
  matterNumber: string;
  title: string;
  client: string;
  clientType: string;
  practiceArea: string;
  matterType: string;
  responsibleAttorney: string;
  firm?: string | null;
  status: string;
  riskLevel: string;
  openDate: string;
  closeDate?: string | null;
  budgetAmount: number;
  spentAmount: number;
}

/** Dashboard Critical Matters grid row. */
export interface CriticalMatter {
  matterNumber: string;
  title: string;
  client: string;
  /** Risk band used for grouping. */
  riskTier: string;
  status: string;
  practiceArea: string;
  responsibleAttorney: string;
  overdue: boolean;
  overBudget: boolean;
  escalated: boolean;
  stalled: boolean;
  budgetAmount: number;
  spentAmount: number;
  /** Spent as a percent of budget. */
  budgetUtilizationPct: number;
  nextDeadlineTitle?: string | null;
  /** Upcoming deadline date (`yyyy-MM-dd`), if any. */
  nextDeadlineDate?: string | null;
  /** Days until the next deadline, if any. */
  daysToNextDeadline?: number | null;
  openDate: string;
  severityScore: number;
}

export interface MatterDetail extends MatterSummary {
  description: string;
  clientIndustry: string;
  responsibleAttorneyEmail: string;
  firmTier: string;
  contractCount: number;
  documentCount: number;
  eventCount: number;
  deadlineCount: number;
  invoiceCount: number;
  nextDeadline?: DeadlineSummary | null;
}

export interface DeadlineSummary {
  title: string;
  deadlineType: string;
  dueDate: string;
  status: string;
  jurisdiction: string;
  owner: string;
  matterNumber: string;
}

export interface ContractSummary {
  contractId: number;
  matterNumber: string;
  matterTitle: string;
  title: string;
  contractType: string;
  counterparty: string;
  stage: string;
  effectiveDate: string;
  renewalDate?: string | null;
  valueAmount: number;
  renewalDueSoon: boolean;
  responsibleAttorney?: string | null;
  stageEnteredAt: string;
}

/** Matter list row with budget and risk fields for the grid. */
export interface MatterRow extends MatterSummary {
  /** Spent as a percent of budget. */
  budgetUtilizationPct: number;
  /** True when spend exceeds budget. */
  overBudget: boolean;
  daysToNextDeadline?: number | null;
  nextDeadlineTitle?: string | null;
  /** From CriticalMatter or null */
  overdue?: boolean;
  escalated?: boolean;
  stalled?: boolean;
  severityScore?: number;
}

export interface DocumentNode {
  documentId: number;
  fileName: string;
  folderPath: string;
  mimeType: string;
  documentType: string;
  version: number;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
  contractId?: number | null;
  matterId: number;
  matterNumber: string;
}

export interface InvoiceSummary {
  invoiceNumber: string;
  matterNumber: string;
  firm: string;
  firmTier: string;
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  hasFlaggedItems: boolean;
  matterId: number;
}

export interface InvoiceDetail {
  invoiceNumber: string;
  matterNumber: string;
  matterTitle: string;
  matterId: number;
  firm: string;
  firmTier: string;
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  lineItemCount: number;
  flaggedLineItemCount: number;
  hasFlaggedItems: boolean;
}

export interface InvoiceLineItem {
  lineItemId: number;
  taskCode?: string | null;
  activityCode?: string | null;
  expenseCode?: string | null;
  narrative: string;
  hours?: number | null;
  rate?: number | null;
  amount: number;
  flagged: boolean;
  flagReason?: string | null;
}

/** Invoice line item shown in the detail template. */
export interface LineItemRow {
  id: string;
  lineItemId: number;
  taskCode?: string | null;
  activityCode?: string | null;
  expenseCode?: string | null;
  narrative: string;
  hours?: number | null;
  rate?: number | null;
  amount: number;
  flagged: boolean;
  flagReason?: string | null;
  disputed?: boolean;
}

export function invoiceLineItemToRow(item: InvoiceLineItem): LineItemRow {
  return {
    id: String(item.lineItemId),
    lineItemId: item.lineItemId,
    taskCode: item.taskCode,
    activityCode: item.activityCode,
    expenseCode: item.expenseCode,
    narrative: item.narrative,
    hours: item.hours,
    rate: item.rate,
    amount: item.amount,
    flagged: item.flagged,
    flagReason: item.flagReason,
  };
}

export interface ApprovalSummary {
  approvalId: number;
  subjectType: string;
  subjectId: string;
  subjectTitle?: string | null;
  queue: string;
  status: string;
  approver?: string | null;
  thresholdAmount?: number | null;
  matterNumber?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
}

export interface MatterBudget {
  budgetId: number;
  matterNumber: string;
  matterTitle: string;
  phase: string;
  period: string;
  budgetAmount: number;
  spentAmount: number;
  variance: number;
  overBudget: boolean;
}

export interface SpendByDimension {
  dimension: string;
  bucket: string;
  amount: number;
  matterCount: number;
}

/** Spend heat-map cell. */
export interface SpendMatrixCell {
  row: string;
  column: string;
  amount: number;
  matterCount: number;
}

export interface BudgetVsActual {
  matterNumber: string;
  matterTitle: string;
  budget: number;
  actual: number;
  variance: number;
  practiceArea: string;
}

export interface MatterCycleTime {
  practiceArea: string;
  matterCount: number;
  medianDaysOpen: number;
}

export interface DeadlineLoad {
  weekStart: string;
  count: number;
  courtDate: number;
  filing: number;
  renewal: number;
  discovery: number;
}
