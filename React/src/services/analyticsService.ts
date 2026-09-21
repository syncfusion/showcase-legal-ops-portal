// Typed client for Analytics API endpoints.

import { apiGet } from './apiClient';
import type {
  BudgetVsActual,
  DeadlineLoad,
  MatterCycleTime,
  SpendByDimension,
  SpendMatrixCell,
} from '../models/api';

export function getSpend(
  groupBy: 'firm' | 'practiceArea' | 'month',
  params?: { from?: string; to?: string },
  signal?: AbortSignal,
) {
  return apiGet<SpendByDimension[]>(
    '/api/v1/analytics/spend',
    { groupBy, ...params },
    signal,
  );
}

export function getSpendMatrix(
  rowDimension: 'firm' | 'practiceArea' = 'firm',
  params?: { from?: string; to?: string },
  signal?: AbortSignal,
) {
  return apiGet<SpendMatrixCell[]>(
    '/api/v1/analytics/spend-matrix',
    { rowDimension, ...params },
    signal,
  );
}

export function getBudgetVsActual(
  params?: { matterNumber?: string; practiceAreaId?: number },
  signal?: AbortSignal,
) {
  return apiGet<BudgetVsActual[]>(
    '/api/v1/analytics/budget-vs-actual',
    params as Record<string, string | number | boolean | undefined>,
    signal,
  );
}

export function getCycleTime(
  params?: { practiceAreaId?: number; from?: string; to?: string },
  signal?: AbortSignal,
) {
  return apiGet<MatterCycleTime[]>(
    '/api/v1/analytics/cycle-time',
    params as Record<string, string | number | boolean | undefined>,
    signal,
  );
}

export function getDeadlineLoad(
  params?: { from?: string; to?: string },
  signal?: AbortSignal,
) {
  return apiGet<DeadlineLoad[]>(
    '/api/v1/analytics/deadline-load',
    params as Record<string, string | number | boolean | undefined>,
    signal,
  );
}
