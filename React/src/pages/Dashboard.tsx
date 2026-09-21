import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Filter, Group,
} from '@syncfusion/ej2-react-grids';
import {
  ChartComponent, SeriesCollectionDirective, SeriesDirective,
  Inject as ChartInject, LineSeries, Category, Tooltip,
  AccumulationChartComponent, AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective, Inject as AccInject,
  PieSeries, AccumulationDataLabel, AccumulationTooltip,
} from '@syncfusion/ej2-react-charts';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import { Internationalization } from '@syncfusion/ej2-base';
import {
  Briefcase, Wallet, ClipboardCheck, CalendarClock, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  getDashboardSummary, getCriticalMatters, ApiError,
} from '../services';
import { useTheme } from '../context/ThemeContext';
import type { DashboardSummary } from '../models';
import type { CriticalMatter } from '../models/api';
import { KpiCard, type KpiIconTone } from '../components/KpiCard';
import '../styles/KpiCard.css';
import '../styles/Dashboard.css';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

// Date/number labels for KPI subtitles and trend axes.
const intl = new Internationalization();

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);

/** Format a `yyyy-MM` month as `Jan 2026`. */
const fmtMonth = (yyyyMm: string): string => {
  const [y, m] = yyyyMm.split('-').map(Number);
  return intl.formatDate(new Date(y, m - 1, 1), { format: 'MMM yyyy', type: 'date' });
};

/**
 * Format a `yyyy-MM` month for a Spend Trend tick: short month name
 * (Jan, Feb, …) with the full year appended ONLY to January ticks, so the
 * year appears once per year instead of on every month.
 */
const monthTickLabel = (yyyyMm: string): string => {
  const [y, m] = yyyyMm.split('-').map(Number);
  const mon = intl.formatDate(new Date(y, m - 1, 1), { format: 'MMM', type: 'date' });
  return String(m) === '1' ? `${mon} ${y}` : mon;
};

/**
 * Derive a Spend Trend X-axis title from the data's distinct years (never a
 * hardcoded year): 1 year -> "Month"; 2 years -> "Month (2025–2026)";
 * 3+ years -> "Month (2025–2027)".
 */
const spendTrendTitle = (months: string[]): string => {
  const years = [...new Set(months.map(m => m.split('-')[0]).filter(Boolean))].sort();
  if (years.length <= 1) return 'Month';
  if (years.length === 2) return `Month (${years[0]}–${years[1]})`;
  return `Month (${years[0]}–${years[years.length - 1]})`;
};

// Spend doughnut colors, matched to the overview swatches.
const SPEND_PALETTE = [
  '#4f6bed', '#22a889', '#f2914d', '#e0575b',
  '#8a6ee0', '#3ba7c4', '#c9a227', '#d16ba5',
];

function Dashboard() {
  const navigate = useNavigate();
  const { chartTheme } = useTheme();
  const [state, setState] = useState<LoadState>('loading');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [criticalMatters, setCriticalMatters] = useState<CriticalMatter[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setErrorMsg(null);
    try {
      const [summaryData, critical] = await Promise.all([
        getDashboardSummary(),
        getCriticalMatters(),
      ]);
      setSummary(summaryData);
      setCriticalMatters(critical);
      setState(summaryData.activeMatters === 0 && critical.length === 0 ? 'empty' : 'success');
    } catch (err) {
      const message = err instanceof ApiError
        ? `${err.message}${err.problemTitle ? ` — ${err.problemTitle}` : ''}`
        : err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await load();
    };
    void run();
    return () => { cancelled = true; };
  }, [load]);

  const kpis = useMemo(() => {
    if (!summary) return null;
    const { spendYtd, budgetYtd, pendingApprovals, openDeadlines } = summary;
    const spendPct = budgetYtd > 0 ? Math.round((spendYtd / budgetYtd) * 100) : 0;
    return {
      activeMatters: summary.activeMatters,
      spend: spendYtd,
      budget: budgetYtd,
      spendPct,
      pendingApprovals,
      overdue: openDeadlines.overdue,
      dueSoon: openDeadlines.dueSoon,
    };
  }, [summary]);

  // Spend doughnut rows with matching overview colors.
  const spendByPractice = useMemo(() => {
    const rows = [...(summary?.spendByPracticeArea ?? [])].sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const data = rows.map((r, i) => ({
      ...r,
      fill: SPEND_PALETTE[i % SPEND_PALETTE.length],
      share: total > 0 ? r.amount / total : 0,
    }));
    return { data, total };
  }, [summary]);

  // KPI sparkline series.
  const sparklines = useMemo(() => ({
    activeMatters: (summary?.matterOpeningsTrend ?? []).map(o => o.opened),
    spend: (summary?.spendTrend ?? []).map(s => s.amount),
    approvals: (summary?.approvalsTrend ?? []).map(a => a.count),
    deadlines: (summary?.deadlinesTrend ?? []).map(d => d.count),
  }), [summary]);

  // Spend Trend line. The Y axis is pre-scaled to whole millions so compact
  // ticks (0, $1M, $4M) can be painted via the string labelFormat
  // ("${value}M"); the hover tooltip keeps the real dollars.
  const spendTrend = useMemo(() => {
    const rows = summary?.spendTrend ?? [];
    return rows.map(p => ({
      month: p.month,                                  // raw yyyy-MM
      label: monthTickLabel(p.month),                  // Jan 2026, Feb, Mar, ...
      amountM: Math.round(p.amount / 1e6),             // for compact Y ticks
    }));
  }, [summary]);

  // Data-driven X-axis title (year derived from the data, never hardcoded).
  const spendTrendXAxis = useMemo(
    () => ({
      valueType: 'Category' as const,
      title: spendTrendTitle(spendTrend.map(p => p.month)),
      majorGridLines: { width: 0 },
    }),
    [spendTrend],
  );

  /** Risk chips for a Critical Matters row. */
  const riskBadgesTemplate = (props: CriticalMatter) => {
    type Badge = { key: keyof CriticalMatter; label: string; tone: string };
    const badges: Badge[] = [];
    if (props.overdue)     badges.push({ key: 'overdue',     label: 'Overdue',     tone: 'risk-badge--overdue' });
    if (props.overBudget)  badges.push({ key: 'overBudget',  label: 'Over Budget', tone: 'risk-badge--over-budget' });
    if (props.escalated)   badges.push({ key: 'escalated',   label: 'Escalated',   tone: 'risk-badge--escalated' });
    if (props.stalled)     badges.push({ key: 'stalled',     label: 'Stalled',     tone: 'risk-badge--stalled' });
    if (badges.length === 0) {
      return <span className="risk-badge-row__empty">—</span>;
    }
    return (
      <div className="risk-badge-row" aria-label={`${badges.length} active risk flag${badges.length > 1 ? 's' : ''}`}>
        {badges.map(b => (
          <span key={b.key} className={`risk-badge ${b.tone}`}>{b.label}</span>
        ))}
      </div>
    );
  };

  /** In-cell progress bar + percentage label. Bar fills 0–100%, with red accent when over. */
  const budgetUtilizationTemplate = (props: CriticalMatter) => {
    const pct = props.budgetUtilizationPct;
    const fillPct = Math.max(0, Math.min(100, pct));
    const overClass = props.overBudget ? 'budget-util__bar--over' : '';
    const fillClass = props.overBudget ? 'budget-util__fill--over' : '';
    return (
      <div className="budget-util" title={`${props.spentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} of ${props.budgetAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}>
        <div className={`budget-util__bar ${overClass}`}>
          <div className={`budget-util__fill ${fillClass}`} style={{ width: `${fillPct}%` }} />
        </div>
        <span className="budget-util__pct">{pct}%</span>
      </div>
    );
  };

  /** Date + "(N days)" with red text for past-due, amber for ≤7 days, muted otherwise. */
  const nextDeadlineTemplate = (props: CriticalMatter) => {
    if (!props.nextDeadlineDate || props.daysToNextDeadline == null) {
      return <span className="next-deadline next-deadline--none">—</span>;
    }
    const days = props.daysToNextDeadline;
    const tone = days < 0
      ? 'next-deadline--due'
      : days <= 7
        ? 'next-deadline--soon'
        : 'next-deadline--future';
    const label = days < 0
      ? `overdue by ${Math.abs(days)}d`
      : days === 0
        ? 'today'
        : `in ${days}d`;
    return (
      <div className="next-deadline">
        <span className="next-deadline__date">{props.nextDeadlineDate}</span>
        <span className={`next-deadline__label ${tone}`}>{label}</span>
      </div>
    );
  };

  /** Tint Critical Matters rows by severity. */
  const queryCellInfo = (args: {
    data?: CriticalMatter;
    cell?: HTMLElement;
    rowData?: CriticalMatter;
  }) => {
    const cell = args?.cell;
    if (!cell) return;
    const row = cell.closest('tr.e-row') as HTMLElement | null;
    if (!row) return;
    const score = args?.data?.severityScore ?? args?.rowData?.severityScore ?? 0;
    row.classList.remove('e-rowedit-critical', 'e-rowedit-warning');
    if (score >= 5) row.classList.add('e-rowedit-critical');
    else if (score >= 3) row.classList.add('e-rowedit-warning');
  };

  const onRowSelected = (args: { data?: CriticalMatter }) => {
    const matterNumber = args?.data?.matterNumber;
    if (matterNumber) navigate(`/matters/${matterNumber}`);
  };

  const kpiCards: Array<{
    key: string;
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    iconTone: KpiIconTone;
    to: string;
    progress?: number;
    sparkline?: number[];
  }> = kpis === null ? [] : [
    {
      key: 'active-matters',
      title: 'Active Matters',
      value: String(kpis.activeMatters),
      subtitle: `of ${summary?.totalMatters ?? 0} total`,
      icon: <Briefcase size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'blue',
      to: '/matters',
      sparkline: sparklines.activeMatters,
    },
    {
      key: 'spend',
      title: 'Spend to Date vs Budget',
      value: fmtMoney(kpis.spend),
      subtitle: `${kpis.spendPct}% of ${fmtMoney(kpis.budget)} budget`,
      icon: <Wallet size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'green',
      to: '/analytics',
      progress: kpis.spendPct,
      sparkline: sparklines.spend,
    },
    {
      key: 'approvals',
      title: 'Pending Approvals',
      value: String(kpis.pendingApprovals),
      subtitle: 'contracts awaiting review',
      icon: <ClipboardCheck size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'orange',
      to: '/contracts?stage=InternalApproval',
      sparkline: sparklines.approvals,
    },
    {
      key: 'deadlines',
      title: 'Deadlines',
      value: String(kpis.overdue + kpis.dueSoon),
      subtitle: `${kpis.overdue} overdue · ${kpis.dueSoon} due soon`,
      icon: <CalendarClock size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'red',
      to: '/obligations',
      sparkline: sparklines.deadlines,
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Matter Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your legal portfolio</p>
      </div>

      {state === 'error' && (
        <div className="dashboard-banner dashboard-banner--error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMsg ?? 'Something went wrong loading the dashboard.'}</span>
          <button type="button" className="banner-retry" onClick={load}>
            <RefreshCw size={15} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {state === 'loading' && <DashboardSkeleton />}

      {state === 'empty' && (
        <div className="dashboard-empty">
          <Briefcase size={40} aria-hidden="true" />
          <h3>No matters yet</h3>
          <p>Matters you create will appear here with spend, deadlines, and recent activity.</p>
        </div>
      )}

      {state === 'success' && (
        <>
          {/* ---- KPI cards ---- */}
          <div className="kpi-cards kpi-strip">
            {kpiCards.map(card => (
              <KpiCard
                key={card.key}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                iconTone={card.iconTone}
                progress={card.progress}
                sparkline={card.sparkline}
                onClick={() => navigate(card.to)}
              />
            ))}
          </div>

          {/* ---- Charts ---- */}
          <div className="dashboard-charts">
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Spend by Practice Area</h3>
              </div>
              <div className="panel-body">
                <div className="spend-mix">
                  <div className="spend-mix__chart">
                    <AccumulationChartComponent
                      id="spendByPracticeChart"
                      theme={chartTheme}
                      height="260px"
                      tooltip={{ enable: true, format: '${point.x}: ${point.y}' }}
                      legendSettings={{ visible: false }}
                      enableSmartLabels={true}
                      centerLabel={{
                        text: `${fmtMoney(spendByPractice.total)}<br>Total spend`,
                        textStyle: { fontWeight: '600', size: '15px' },
                      }}
                    >
                      <AccInject services={[PieSeries, AccumulationDataLabel, AccumulationTooltip]} />
                      <AccumulationSeriesCollectionDirective>
                        <AccumulationSeriesDirective
                          dataSource={spendByPractice.data}
                          xName="practiceArea"
                          yName="amount"
                          innerRadius="70%"
                          radius="90%"
                          pointColorMapping="fill"
                          dataLabel={{ visible: false }}
                        />
                      </AccumulationSeriesCollectionDirective>
                    </AccumulationChartComponent>
                  </div>
                  <ul className="spend-mix__list" aria-label="Spend by practice area breakdown">
                    {spendByPractice.data.map(row => (
                      <li key={row.practiceArea} className="spend-mix__row">
                        <span className="spend-mix__swatch" style={{ background: row.fill }} aria-hidden="true" />
                        <span className="spend-mix__name" title={row.practiceArea}>{row.practiceArea}</span>
                        <span className="spend-mix__amount">{fmtMoney(row.amount)}</span>
                        <span className="spend-mix__pct">{Math.round(row.share * 100)}%</span>
                      </li>
                    ))}
                    {spendByPractice.data.length === 0 && (
                      <li className="spend-mix__row spend-mix__row--empty">No spend recorded yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Spend Trend</h3>
              </div>
              <div className="panel-body">
                <ChartComponent
                  id="spendTrendChart"
                  theme={chartTheme}
                  primaryXAxis={spendTrendXAxis}
                  // Y axis data is pre-scaled to whole millions (amountM). The
                  // string labelFormat "${value}M" renders compact "$4M"-style
                  // ticks; the ${point.y} tooltip token reuses the same format.
                  primaryYAxis={{
                    title: 'Spend (USD)',
                    labelFormat: '${value}M',
                    majorTickLines: { width: 0 },
                  }}
                  height="300px"
                  tooltip={{ enable: true, format: '${point.x}: ${point.y}' }}
                  chartArea={{ border: { width: 0 } }}
                >
                  <ChartInject services={[LineSeries, Category, Tooltip]} />
                  <SeriesCollectionDirective>
                    <SeriesDirective
                      dataSource={spendTrend}
                      xName="label"
                      yName="amountM"
                      type="Line"
                      name="Spend"
                      width={2}
                      marker={{ visible: true, width: 7, height: 7 }}
                    />
                  </SeriesCollectionDirective>
                </ChartComponent>
              </div>
            </div>
          </div>

          {/* ---- Critical Matters ---- */}
          <div className="dashboard-bottom">
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Critical Matters</h3>
                <span className="panel-subtitle">Ranked by severity: overdue, over budget, escalated, stalled.</span>
              </div>
              <div className="panel-body">
                <GridComponent
                  dataSource={criticalMatters}
                  allowSorting={true}
                  allowFiltering={true}
                  allowGrouping={true}
                  groupSettings={{ showDropArea: false, columns: ['riskTier'] }}
                  height="400px"
                  width="100%"
                  rowSelected={onRowSelected}
                  enableHover={true}
                  queryCellInfo={queryCellInfo}
                  dataBound={() => { /* no-op; ensures queryCellInfo fires after grouping */ }}
                >
                  <ColumnsDirective>
                    <ColumnDirective field="matterNumber" headerText="Case #" width="95" />
                    {/* 'auto' makes the Matter column absorb all remaining width so the
                        grid fills the panel (which now spans the full page width). */}
                    <ColumnDirective field="title" headerText="Matter" width="auto" />
                    <ColumnDirective field="client" headerText="Client" width="120" />
                    <ColumnDirective
                      headerText="Risk"
                      width="180"
                      template={riskBadgesTemplate}
                    />
                    <ColumnDirective
                      field="budgetUtilizationPct"
                      headerText="Budget"
                      width="125"
                      template={budgetUtilizationTemplate}
                      textAlign="Left"
                    />
                    <ColumnDirective
                      headerText="Next Deadline"
                      width="130"
                      template={nextDeadlineTemplate}
                    />
                    <ColumnDirective field="responsibleAttorney" headerText="Lead Counsel" width="115" />
                    <ColumnDirective
                      field="severityScore"
                      headerText="Score"
                      width="60"
                      textAlign="Right"
                    />
                    {/* Hidden group column — drives the default grouping only. */}
                    <ColumnDirective field="riskTier" headerText="Tier" width="0" visible={false} allowGrouping={true} />
                  </ColumnsDirective>
                  <Inject services={[Page, Sort, Filter, Group]} />
                </GridComponent>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Dashboard loading skeletons. */
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div className="kpi-cards kpi-strip">
        {[0, 1, 2, 3].map(i => (
          <KpiCard key={i} title="" value="" loading />
        ))}
      </div>

      <div className="dashboard-charts">
        {[0, 1].map(i => (
          <div key={i} className="panel">
            <div className="panel-header">
              <SkeletonComponent shape="Rectangle" width="180px" height="16px" />
            </div>
            <div className="panel-body">
              <SkeletonComponent shape="Rectangle" width="100%" height="300px" />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-bottom">
        <div className="panel">
          <div className="panel-header">
            <SkeletonComponent shape="Rectangle" width="200px" height="16px" />
          </div>
          <div className="panel-body">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-row">
                <SkeletonComponent shape="Rectangle" width="100%" height="18px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
