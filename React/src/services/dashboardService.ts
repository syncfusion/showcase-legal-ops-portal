// Dashboard API client.

import { apiGet } from './apiClient';
import type { DashboardSummary } from '../models/DashboardSummary';
import type { CriticalMatter } from '../models/api';

/** Fetch dashboard KPI totals. */
export async function getDashboardSummary(asOf?: string): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/api/v1/dashboard/summary', { asOf });
}

/** Fetch Critical Matters rows. */
export async function getCriticalMatters(signal?: AbortSignal): Promise<CriticalMatter[]> {
  return apiGet<CriticalMatter[]>('/api/v1/dashboard/critical-matters', undefined, signal);
}

