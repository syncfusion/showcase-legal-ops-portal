// Typed client for Deadline API endpoints.
// GET /api/v1/deadlines

import { apiGet } from './apiClient';
import type { DeadlineSummary } from '../models/api';

export interface ListDeadlinesParams {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  ownerStaffId?: number;
  upcoming?: boolean;
  overdue?: boolean;
  dueSoon?: boolean;
}

export function listDeadlines(params?: ListDeadlinesParams, signal?: AbortSignal) {
  return apiGet<DeadlineSummary[]>(
    '/api/v1/deadlines',
    params as Record<string, string | number | boolean | undefined>,
    signal,
  );
}
