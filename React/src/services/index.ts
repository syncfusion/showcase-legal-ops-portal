export {
  PDF_VIEWER_RESOURCE_URL,
  DOC_EDITOR_SERVICE_URL,
} from './fileService';
export type { FileNode } from './fileService';

// API infrastructure
export { ApiError, apiGet, documentContentUrl, API_BASE_URL } from './apiClient';

// API-backed domain services
export { getDashboardSummary, getCriticalMatters } from './dashboardService';
export {
  listMatters, getMatter, getMatterTimeline, getMatterDocuments,
} from './matterService';
export type { ListMattersParams } from './matterService';
export { listContracts } from './contractService';
export type { ListContractsParams } from './contractService';
export { listDeadlines } from './deadlineService';
export type { ListDeadlinesParams } from './deadlineService';
export {
  listInvoices, getInvoiceLineItems,
} from './invoiceService';
export type { ListInvoicesParams } from './invoiceService';
export {
  getSpend, getSpendMatrix, getBudgetVsActual, getCycleTime, getDeadlineLoad,
} from './analyticsService';
export { getLookup } from './lookupService';
export type { LookupSet } from './lookupService';
