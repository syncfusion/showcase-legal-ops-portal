import {
  type LifecycleStage,
  LIFECYCLE_STAGES,
} from '../models/Contract';

/** Days spent in the current contract stage. Invalid dates return 0. */
export function daysInStage(updatedAt: Date | string | null | undefined): number {
  if (updatedAt == null || updatedAt === '') return 0;
  const last = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(last.getTime()) || last.getUTCFullYear() < 2000) return 0;
  const diff = Date.now() - last.getTime();
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** True when the drop moves the contract one stage forward. */
export function isForwardTransition(from: LifecycleStage, to: LifecycleStage): boolean {
  const fromIndex = LIFECYCLE_STAGES.indexOf(from);
  const toIndex = LIFECYCLE_STAGES.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex > fromIndex;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
