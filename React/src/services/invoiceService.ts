// Typed client for Invoice API endpoints.
// GET /api/v1/invoices, /invoices/{invoiceNumber}, line-items

import { apiGet } from './apiClient';
import type {
  InvoiceLineItem,
  InvoiceSummary,
  PagedResult,
} from '../models/api';

export interface ListInvoicesParams {
  status?: string;
  firmId?: number;
  matterNumber?: string;
  flaggedOnly?: boolean;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function listInvoices(params?: ListInvoicesParams, signal?: AbortSignal) {
  return apiGet<PagedResult<InvoiceSummary>>(
    '/api/v1/invoices',
    params as Record<string, string | number | boolean | undefined>,
    signal,
  );
}

export function getInvoiceLineItems(
  invoiceNumber: string,
  flaggedOnly?: boolean,
  signal?: AbortSignal,
) {
  return apiGet<InvoiceLineItem[]>(
    `/api/v1/invoices/${encodeURIComponent(invoiceNumber)}/line-items`,
    { flaggedOnly },
    signal,
  );
}
