// Typed client for Contract API endpoints.
// GET /api/v1/contracts

import { apiGet } from './apiClient';
import type { ContractSummary, PagedResult } from '../models/api';

export interface ListContractsParams {
  matterNumber?: string;
  stage?: string;
  renewalDueWithinDays?: number;
  type?: string;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function listContracts(params?: ListContractsParams, signal?: AbortSignal) {
  return apiGet<PagedResult<ContractSummary>>(
    '/api/v1/contracts',
    params as Record<string, string | number | boolean | undefined>,
    signal,
  );
}


