// Typed client for Matter API endpoints.
// GET /api/v1/matters, /matters/{matterNumber}, timeline, documents

import { apiGet } from './apiClient';
import type {
  DeadlineSummary,
  DocumentNode,
  MatterDetail,
  MatterSummary,
  PagedResult,
} from '../models/api';

export interface ListMattersParams {
  status?: string;
  practiceAreaId?: number;
  firmId?: number;
  clientId?: number;
  riskLevel?: string;
  matterType?: string;
  recent?: boolean;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function listMatters(params?: ListMattersParams, signal?: AbortSignal) {
  return apiGet<PagedResult<MatterSummary>>('/api/v1/matters', params as Record<string, string | number | boolean | undefined>, signal);
}

export function getMatter(matterNumber: string, signal?: AbortSignal) {
  return apiGet<MatterDetail>(
    `/api/v1/matters/${encodeURIComponent(matterNumber)}`,
    undefined,
    signal,
  );
}

export function getMatterTimeline(
  matterNumber: string,
  params?: { from?: string; to?: string; type?: string },
  signal?: AbortSignal,
) {
  return apiGet<DeadlineSummary[]>(
    `/api/v1/matters/${encodeURIComponent(matterNumber)}/timeline`,
    params,
    signal,
  );
}

export function getMatterDocuments(
  matterNumber: string,
  folderPath?: string,
  signal?: AbortSignal,
) {
  return apiGet<DocumentNode[]>(
    `/api/v1/matters/${encodeURIComponent(matterNumber)}/documents`,
    { folderPath },
    signal,
  );
}
