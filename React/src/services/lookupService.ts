// Typed client for Lookup API endpoints.
// GET /api/v1/lookups/{set}

import { apiGet } from './apiClient';
import type { LookupItem } from '../models/api';

export type LookupSet =
  | 'practice-areas'
  | 'contract-types'
  | 'jurisdictions'
  | 'utbms'
  | 'staff'
  | 'firms'
  | 'statuses';

export function getLookup(set: LookupSet, signal?: AbortSignal) {
  return apiGet<LookupItem[]>(`/api/v1/lookups/${set}`, undefined, signal);
}
