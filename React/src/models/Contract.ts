/** Kanban column key for a contract. */
export type LifecycleStage =
  | 'Draft'
  | 'Negotiate'
  | 'InternalApproval'
  | 'Signature'
  | 'Executed'
  | 'Active'
  | 'RenewalExpiry';

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'Draft',
  'Negotiate',
  'InternalApproval',
  'Signature',
  'Executed',
  'Active',
  'RenewalExpiry',
];

export const LIFECYCLE_STAGE_LABEL: Record<LifecycleStage, string> = {
  Draft: 'Draft',
  Negotiate: 'Negotiate / Redline',
  InternalApproval: 'Internal Approval',
  Signature: 'Signature (e-sign)',
  Executed: 'Executed',
  Active: 'Active',
  RenewalExpiry: 'Renewal / Expiry',
};

/** Value above which VP sign-off is required. */
export const DEFAULT_VP_SIGN_OFF_THRESHOLD_USD = 50_000;
