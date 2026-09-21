// Dashboard summary from GET /api/v1/dashboard/summary.

export interface DeadlinesSummary {
  total: number;
  overdue: number;
  dueSoon: number;
  upcoming: number;
}

export interface SpendByPracticeArea {
  practiceArea: string;
  amount: number;
  matterCount: number;
}

export interface SpendTrendPoint {
  /** Month as `yyyy-MM`. */
  month: string;
  amount: number;
}

export interface MatterOpeningsTrendPoint {
  /** Month as `yyyy-MM`. */
  month: string;
  opened: number;
  closed: number;
}

export interface TrendPoint {
  /** Month as `yyyy-MM`. */
  month: string;
  count: number;
}

export interface DashboardSummary {
  activeMatters: number;
  /** All-status matter count. */
  totalMatters: number;
  mattersOpenedYtd: number;
  pendingApprovals: number;
  spendYtd: number;
  budgetYtd: number;
  openDeadlines: DeadlinesSummary;
  spendByPracticeArea: SpendByPracticeArea[];
  spendTrend: SpendTrendPoint[];
  matterOpeningsTrend: MatterOpeningsTrendPoint[];
  /** Monthly approval counts for the KPI sparkline. */
  approvalsTrend: TrendPoint[];
  /** Monthly deadline counts for the KPI sparkline. */
  deadlinesTrend: TrendPoint[];
  overdueDeadlines: number;
  renewalsDueWithin60Days: number;
  flaggedInvoices: number;
}
