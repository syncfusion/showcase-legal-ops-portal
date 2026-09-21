// Deadline used by the calendar and docket list. SOL dates are not draggable.

export enum DeadlineType {
  Court = 'Court',
  Filing = 'Filing',
  SOL = 'SOL',
  Renewal = 'Renewal',
}

export enum DeadlineStatus {
  Upcoming = 'Upcoming',
  DueSoon = 'DueSoon',
  Overdue = 'Overdue',
  Completed = 'Completed',
  Waived = 'Waived',
}

export const DEADLINE_TYPE_LABEL: Record<DeadlineType, string> = {
  [DeadlineType.Court]: 'Court',
  [DeadlineType.Filing]: 'Filing',
  [DeadlineType.SOL]: 'Statute of Limitations',
  [DeadlineType.Renewal]: 'Renewal',
};

export const DEADLINE_STATUS_LABEL: Record<DeadlineStatus, string> = {
  [DeadlineStatus.Upcoming]: 'Upcoming',
  [DeadlineStatus.DueSoon]: 'Due Soon',
  [DeadlineStatus.Overdue]: 'Overdue',
  [DeadlineStatus.Completed]: 'Completed',
  [DeadlineStatus.Waived]: 'Waived',
};

/** Deadline row for the calendar and docket list. */
export interface Deadline {
  id: string;
  /** Linked matter number. */
  matterCaseNumber: string;
  /** Linked matter title. */
  matterTitle: string;
  /** Related contract, when this is a renewal. */
  contractId?: string;
  title: string;
  type: DeadlineType;
  status: DeadlineStatus;
  /** All-day due date. */
  dueDate: Date;
  /** Court venue. */
  jurisdiction: string;
  /** Assigned staff id. */
  ownerStaffId: string;
  /** Assigned staff name. */
  ownerName: string;
  /** Risk badge for the calendar. */
  riskBand: 'low' | 'medium' | 'high';
  notes?: string;
}

/** Scheduler grouping. `None` is a single calendar. */
export type DeadlineGroupBy = 'Owner' | 'Jurisdiction' | 'None';
