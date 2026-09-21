import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject,
  Legend, Tooltip, Category, DataLabel, BarSeries,
  StackingColumnSeries, SplineAreaSeries,
  AccumulationChartComponent, AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective, Inject as AccInject,
  AccumulationLegend, AccumulationDataLabel, AccumulationTooltip,
  PieSeries, FunnelSeries,
  BulletChartComponent, BulletRangeCollectionDirective, BulletRangeDirective,
  BulletTooltip, Inject as BulletInject,
} from '@syncfusion/ej2-react-charts';
import {
  HeatMapComponent, Inject as HeatMapInject, Legend as HeatMapLegend,
  Tooltip as HeatMapTooltip,
} from '@syncfusion/ej2-react-heatmap';
import {
  GridComponent, ColumnsDirective, ColumnDirective, Inject as GridInject,
  Page, Sort, Filter,
} from '@syncfusion/ej2-react-grids';
import { MultiSelectComponent, Inject as DropDownInject, CheckBoxSelection } from '@syncfusion/ej2-react-dropdowns';
import { DateRangePickerComponent } from '@syncfusion/ej2-react-calendars';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import {
  BarChart3, Wallet, Clock, FileText, AlertTriangle,
  RefreshCw, SearchX, Activity,
} from 'lucide-react';
import type { DateRangePicker } from '@syncfusion/ej2-react-calendars';
import {
  ApiError,
  getSpend, getSpendMatrix, getBudgetVsActual, getCycleTime, getDeadlineLoad,
  listContracts, getLookup,
} from '../services';
import type {
  SpendByDimension, SpendMatrixCell, BudgetVsActual, MatterCycleTime,
  DeadlineLoad, ContractSummary,
} from '../models/api';
import { useTheme } from '../context/ThemeContext';
import { KpiCard, type KpiIconTone } from '../components/KpiCard';
import { lifecycleStageFromApi } from '../utils/apiMappers';
import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABEL, type LifecycleStage } from '../models/Contract';
import { chartColors } from '../utils/colorPalette';
import '../styles/Pages.css';
import '../styles/KpiCard.css';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type GroupByDimension = 'firm' | 'practiceArea';

interface FilterState {
  dateRange?: Date[];
  firms: string[];
  practiceAreas: string[];
  contractTypes: string[];
  groupBy: GroupByDimension;
}

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
  }).format(v);

const fmtMonth = (yyyyMm: string): string => {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return yyyyMm;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const HEATMAP_PALETTE = [
  { value: 0, color: '#e0f2fe' },
  { value: 0.25, color: '#7dd3fc' },
  { value: 0.5, color: '#fbbf24' },
  { value: 0.75, color: '#f97316' },
  { value: 1, color: '#dc2626' },
];

// Dark-mode heatmap colors.
const HEATMAP_PALETTE_DARK = [
  { value: 0, color: '#1e3a8a' },
  { value: 0.25, color: '#2563eb' },
  { value: 0.5, color: '#a855f7' },
  { value: 0.75, color: '#f97316' },
  { value: 1, color: '#ef4444' },
];

function AnalyticsPage() {
  const navigate = useNavigate();
  const { theme, chartTheme } = useTheme();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: undefined,
    firms: [],
    practiceAreas: [],
    contractTypes: [],
    groupBy: 'firm',
  });

  const [spendByFirm, setSpendByFirm] = useState<SpendByDimension[]>([]);
  const [spendByMonth, setSpendByMonth] = useState<SpendByDimension[]>([]);
  const [spendMatrix, setSpendMatrix] = useState<SpendMatrixCell[]>([]);
  const [budgetRows, setBudgetRows] = useState<BudgetVsActual[]>([]);
  const [cycleRows, setCycleRows] = useState<MatterCycleTime[]>([]);
  const [deadlineLoad, setDeadlineLoad] = useState<DeadlineLoad[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [firmOptions, setFirmOptions] = useState<string[]>([]);
  const [practiceAreaOptions, setPracticeAreaOptions] = useState<string[]>([]);
  const [contractTypeOptions, setContractTypeOptions] = useState<string[]>([]);

  const dateParams = useMemo(() => {
    if (!filters.dateRange || filters.dateRange.length !== 2) return {};
    const [start, end] = filters.dateRange;
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: toIso(start), to: toIso(end) };
  }, [filters.dateRange]);

  const load = useCallback(async () => {
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const rowDimension = filters.groupBy;
      const [
        firmSpend, monthSpend, matrix, budgets, cycles, load, contractsRes, firms, practices, types,
      ] = await Promise.all([
        getSpend('firm', dateParams),
        getSpend('month', dateParams),
        getSpendMatrix(rowDimension, dateParams),
        getBudgetVsActual(),
        getCycleTime(dateParams),
        getDeadlineLoad(dateParams),
        listContracts({ page: 1, pageSize: 200 }),
        getLookup('firms'),
        getLookup('practice-areas'),
        getLookup('contract-types'),
      ]);

      setSpendByFirm(firmSpend ?? []);
      setSpendByMonth(monthSpend ?? []);
      setSpendMatrix(matrix ?? []);
      setBudgetRows(budgets ?? []);
      setCycleRows(cycles ?? []);
      setDeadlineLoad(load ?? []);
      setContracts(contractsRes.items ?? []);
      setFirmOptions((firms ?? []).map(f => f.name).sort());
      setPracticeAreaOptions((practices ?? []).map(p => p.name).sort());
      setContractTypeOptions((types ?? []).map(t => t.name).sort());

      const empty =
        (firmSpend?.length ?? 0) === 0 &&
        (budgets?.length ?? 0) === 0 &&
        (contractsRes.items?.length ?? 0) === 0;
      setLoadState(empty ? 'empty' : 'success');
    } catch (err) {
      const message = err instanceof ApiError
        ? `${err.message}${err.problemTitle ? ` — ${err.problemTitle}` : ''}`
        : err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      setLoadState('error');
    }
  }, [dateParams, filters.groupBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredContracts = useMemo(() => {
    let rows = contracts;
    if (filters.contractTypes.length > 0) {
      rows = rows.filter(c => filters.contractTypes.includes(c.contractType));
    }
    if (filters.practiceAreas.length > 0) {
      const matterNums = new Set(
        budgetRows
          .filter(b => filters.practiceAreas.includes(b.practiceArea))
          .map(b => b.matterNumber),
      );
      if (matterNums.size > 0) {
        rows = rows.filter(c => matterNums.has(c.matterNumber));
      }
    }
    return rows;
  }, [contracts, filters.contractTypes, filters.practiceAreas, budgetRows]);

  const filteredBudget = useMemo(() => {
    let rows = budgetRows;
    if (filters.practiceAreas.length > 0) {
      rows = rows.filter(b => filters.practiceAreas.includes(b.practiceArea));
    }
    return rows;
  }, [budgetRows, filters.practiceAreas]);

  const filteredSpendByFirm = useMemo(() => {
    if (filters.firms.length === 0) return spendByFirm;
    return spendByFirm.filter(s => filters.firms.includes(s.bucket));
  }, [spendByFirm, filters.firms]);

  // ---- KPI data ----
  const kpis = useMemo(() => {
    const spend = filteredSpendByFirm.reduce((s, r) => s + r.amount, 0);
    const budget = filteredBudget.reduce((s, r) => s + r.budget, 0);
    const actual = filteredBudget.reduce((s, r) => s + r.actual, 0);
    const budgetPct = budget > 0 ? Math.round((actual / budget) * 100) : 0;
    const avgCycle = cycleRows.length > 0
      ? Math.round(cycleRows.reduce((s, r) => s + r.medianDaysOpen, 0) / cycleRows.length)
      : 0;
    const activeContracts = filteredContracts.filter(c =>
      c.stage === 'Active' || c.stage === 'Executed',
    ).length;
    const deadlineTotal = deadlineLoad.reduce((s, r) => s + r.count, 0);

    return { spend, budget, actual, budgetPct, avgCycle, activeContracts, deadlineTotal };
  }, [filteredSpendByFirm, filteredBudget, cycleRows, filteredContracts, deadlineLoad]);

  // Spend by month — spline area trend
  const spendMonthChart = useMemo(
    () => spendByMonth.map(r => ({ month: fmtMonth(r.bucket), amount: r.amount })),
    [spendByMonth],
  );

  // Spend by firm/practice — horizontal bar
  const spendDimensionChart = useMemo(() => {
    const source = filters.groupBy === 'practiceArea'
      ? Object.values(
          filteredBudget.reduce((acc, b) => {
            acc[b.practiceArea] = acc[b.practiceArea] || { bucket: b.practiceArea, amount: 0, matterCount: 0 };
            acc[b.practiceArea].amount += b.actual;
            acc[b.practiceArea].matterCount += 1;
            return acc;
          }, {} as Record<string, { bucket: string; amount: number; matterCount: number }>),
        )
      : filteredSpendByFirm.map(s => ({ bucket: s.bucket, amount: s.amount, matterCount: s.matterCount }));
    return source.sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [filters.groupBy, filteredSpendByFirm, filteredBudget]);

  // Budget vs actual — bullet chart rows
  const budgetBulletData = useMemo(() => {
    let groups: Array<{ category: string; value: number; target: number }>;
    if (filters.groupBy === 'practiceArea') {
      const map = filteredBudget.reduce((acc, b) => {
        acc[b.practiceArea] = acc[b.practiceArea] || { category: b.practiceArea, value: 0, target: 0 };
        acc[b.practiceArea].value += b.actual;
        acc[b.practiceArea].target += b.budget;
        return acc;
      }, {} as Record<string, { category: string; value: number; target: number }>);
      groups = Object.values(map).sort((a, b) => b.target - a.target).slice(0, 6);
    } else {
      groups = filteredBudget
        .map(b => ({ category: b.matterNumber, value: b.actual, target: b.budget }))
        .sort((a, b) => b.target - a.target)
        .slice(0, 6);
    }
    return groups;
  }, [filteredBudget, filters.groupBy]);

  const bulletScaleMax = useMemo(() => {
    if (budgetBulletData.length === 0) return 100;
    const max = Math.max(...budgetBulletData.map(d => Math.max(d.value, d.target)));
    return max > 0 ? Math.ceil(max * 1.15) : 100;
  }, [budgetBulletData]);

  const cycleTimeData = useMemo(
    () => cycleRows
      .map(r => ({ group: r.practiceArea, medianDays: r.medianDaysOpen, matterCount: r.matterCount }))
      .sort((a, b) => b.medianDays - a.medianDays),
    [cycleRows],
  );

  const volumeByTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredContracts.forEach(c => {
      counts[c.contractType] = (counts[c.contractType] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, text: `${type}: ${count}` }))
      .sort((a, b) => b.count - a.count);
  }, [filteredContracts]);

  const lifecycleData = useMemo(() => {
    const counts: Record<LifecycleStage, number> = {
      Draft: 0, Negotiate: 0, InternalApproval: 0,
      Signature: 0, Executed: 0, Active: 0, RenewalExpiry: 0,
    };
    filteredContracts.forEach(c => {
      const stage = lifecycleStageFromApi(c.stage);
      counts[stage] += 1;
    });
    // Funnel shows pipeline flow in stage order (not sorted by count).
    return LIFECYCLE_STAGES.map(stage => ({
      stage: LIFECYCLE_STAGE_LABEL[stage],
      count: counts[stage],
    }));
  }, [filteredContracts]);

  const deadlineLoadChart = useMemo(
    () => deadlineLoad.map(d => ({
      week: d.weekStart,
      count: d.count,
      courtDate: d.courtDate,
      filing: d.filing,
      renewal: d.renewal,
      discovery: d.discovery,
    })),
    [deadlineLoad],
  );

  // Firm (or practice) × month HeatMap — pivot cells into 2D array + labels
  const heatmap = useMemo(() => {
    let cells = spendMatrix;
    if (filters.groupBy === 'firm' && filters.firms.length > 0) {
      cells = cells.filter(c => filters.firms.includes(c.row));
    }
    if (filters.groupBy === 'practiceArea' && filters.practiceAreas.length > 0) {
      cells = cells.filter(c => filters.practiceAreas.includes(c.row));
    }

    // Prefer top spend rows so the map stays readable
    const rowTotals = new Map<string, number>();
    cells.forEach(c => rowTotals.set(c.row, (rowTotals.get(c.row) ?? 0) + c.amount));
    const topRows = [...rowTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([row]) => row);

    const months = [...new Set(cells.map(c => c.column))].sort();
    const monthLabels = months.map(fmtMonth);
    const lookup = new Map(cells.map(c => [`${c.row}|${c.column}`, c]));

    const data: number[][] = topRows.map(row =>
      months.map(col => {
        const cell = lookup.get(`${row}|${col}`);
        return cell ? Number(cell.amount) : 0;
      }),
    );

    const maxAmount = Math.max(0, ...data.flat());
    const basePalette = theme === 'dark' ? HEATMAP_PALETTE_DARK : HEATMAP_PALETTE;
    const palette = basePalette.map(p => ({
      value: p.value * (maxAmount || 1),
      color: p.color,
    }));

    return {
      data,
      xLabels: monthLabels,
      yLabels: topRows,
      maxAmount,
      palette,
      empty: topRows.length === 0 || months.length === 0,
    };
  }, [spendMatrix, filters.firms, filters.practiceAreas, filters.groupBy, theme]);

  const drillRows = useMemo(() => {
    return filteredContracts.map(c => ({
      contractId: c.contractId,
      title: c.title,
      contractType: c.contractType,
      stage: c.stage,
      valueAmount: c.valueAmount,
      matterNumber: c.matterNumber,
      matterTitle: c.matterTitle,
      counterparty: c.counterparty,
      renewalDueSoon: c.renewalDueSoon,
    }));
  }, [filteredContracts]);

  const applyDateRange = useCallback((args: { value?: DateRangePicker['value'] }) => {
    const next = Array.isArray(args.value) ? args.value : undefined;
    setFilters(prev => ({ ...prev, dateRange: next }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      dateRange: undefined,
      firms: [],
      practiceAreas: [],
      contractTypes: [],
      groupBy: 'firm',
    });
  }, []);

  const onRowSelected = useCallback((args: { data?: { matterNumber?: string } }) => {
    if (args?.data?.matterNumber) {
      navigate(`/matters/${args.data.matterNumber}`);
    }
  }, [navigate]);

  const heatmapTooltip = useCallback((args: {
    xLabel?: string;
    yLabel?: string;
    value?: string | number;
    content?: string[];
  }) => {
    const amount = typeof args.value === 'number' ? args.value : Number(args.value ?? 0);
    args.content = [
      `<b>${args.yLabel ?? ''}</b>`,
      `${args.xLabel ?? ''}: ${fmtMoney(Number.isFinite(amount) ? amount : 0)}`,
    ];
  }, []);

  const kpiCards: Array<{
    key: string; title: string; value: string; subtitle: string;
    icon: React.ReactNode; iconTone: KpiIconTone; trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }> = useMemo(() => [
    {
      key: 'spend',
      title: 'Spend vs Budget',
      value: fmtMoney(kpis.actual || kpis.spend),
      subtitle: `${kpis.budgetPct}% of ${fmtMoney(kpis.budget)} budget`,
      icon: <Wallet size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'green',
      trend: kpis.budgetPct > 90 ? 'up' : 'neutral',
      trendValue: kpis.budgetPct > 90 ? 'Over target' : 'On track',
    },
    {
      key: 'cycle',
      title: 'Median Cycle Time',
      value: `${kpis.avgCycle}d`,
      subtitle: 'closed matters by practice area',
      icon: <Clock size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'orange',
    },
    {
      key: 'active',
      title: 'Active Contracts',
      value: String(kpis.activeContracts),
      subtitle: `${filteredContracts.length} total filtered`,
      icon: <FileText size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'blue',
    },
    {
      key: 'deadlines',
      title: 'Deadline Load',
      value: String(kpis.deadlineTotal),
      subtitle: 'events in selected range',
      icon: <Activity size={18} strokeWidth={1.9} aria-hidden="true" />,
      iconTone: 'red',
    },
  ], [kpis, filteredContracts.length]);

  const rowDimLabel = filters.groupBy === 'practiceArea' ? 'Practice Area' : 'Firm';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Legal Analytics</h1>
          <p className="page-subtitle">Spend, risk, and contract-lifecycle insights</p>
        </div>
      </div>

      {loadState === 'error' && (
        <div className="dashboard-banner dashboard-banner--error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMsg ?? 'Something went wrong loading analytics.'}</span>
          <button type="button" className="banner-retry" onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {loadState === 'loading' && <AnalyticsSkeleton />}

      {loadState === 'empty' && (
        <div className="dashboard-empty">
          <BarChart3 size={40} aria-hidden="true" />
          <h3>No analytics data</h3>
          <p>Contracts and invoices will appear here once data is seeded.</p>
        </div>
      )}

      {loadState === 'success' && (
        <>
          <div className="analytics-filter-bar" role="search" aria-label="Analytics filters">
            <div className="analytics-filter-bar__fields">
              <div className="analytics-filter-field">
                <DateRangePickerComponent
                  value={filters.dateRange}
                  change={applyDateRange}
                  placeholder="Date range"
                  cssClass="analytics-filter-input"
                  startDate={new Date('2023-01-01')}
                  endDate={new Date('2026-12-31')}
                />
              </div>
              <div className="analytics-filter-field">
                <MultiSelectComponent
                  dataSource={firmOptions}
                  value={filters.firms}
                  change={(args: { value?: string[] }) => setFilters(prev => ({ ...prev, firms: args.value ?? [] }))}
                  placeholder="Firms"
                  mode="CheckBox"
                  showDropDownIcon={true}
                  cssClass="analytics-filter-input"
                  width="100%"
                  popupWidth="280px"
                >
                  <DropDownInject services={[CheckBoxSelection]} />
                </MultiSelectComponent>
              </div>
              <div className="analytics-filter-field">
                <MultiSelectComponent
                  dataSource={practiceAreaOptions}
                  value={filters.practiceAreas}
                  change={(args: { value?: string[] }) => setFilters(prev => ({ ...prev, practiceAreas: args.value ?? [] }))}
                  placeholder="Practice areas"
                  mode="CheckBox"
                  showDropDownIcon={true}
                  cssClass="analytics-filter-input"
                  width="100%"
                  popupWidth="280px"
                >
                  <DropDownInject services={[CheckBoxSelection]} />
                </MultiSelectComponent>
              </div>
              <div className="analytics-filter-field">
                <MultiSelectComponent
                  dataSource={contractTypeOptions}
                  value={filters.contractTypes}
                  change={(args: { value?: string[] }) => setFilters(prev => ({ ...prev, contractTypes: args.value ?? [] }))}
                  placeholder="Contract types"
                  mode="CheckBox"
                  showDropDownIcon={true}
                  cssClass="analytics-filter-input"
                  width="100%"
                  popupWidth="280px"
                >
                  <DropDownInject services={[CheckBoxSelection]} />
                </MultiSelectComponent>
              </div>
            </div>
            <div className="analytics-filter-bar__actions">
              <span className="analytics-group-label">Group by</span>
              <div className="e-btn-group" role="group" aria-label="Group charts by">
                <ButtonComponent
                  cssClass={filters.groupBy === 'firm' ? 'e-primary' : 'e-flat'}
                  onClick={() => setFilters(prev => prev.groupBy === 'firm' ? prev : { ...prev, groupBy: 'firm' })}
                >
                  Firm
                </ButtonComponent>
                <ButtonComponent
                  cssClass={filters.groupBy === 'practiceArea' ? 'e-primary' : 'e-flat'}
                  onClick={() => setFilters(prev => prev.groupBy === 'practiceArea' ? prev : { ...prev, groupBy: 'practiceArea' })}
                >
                  Practice Area
                </ButtonComponent>
              </div>
              <ButtonComponent
                cssClass="e-outline analytics-reset-btn"
                onClick={resetFilters}
                iconCss="e-icons e-refresh"
              >
                Reset
              </ButtonComponent>
            </div>
          </div>

          <div className="kpi-cards kpi-strip" role="region" aria-label="Analytics summary">
            {kpiCards.map(card => (
              <KpiCard
                key={card.key}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                iconTone={card.iconTone}
                trend={card.trend}
                trendValue={card.trendValue}
              />
            ))}
          </div>

          {/* HeatMap: firm/practice × month spend concentration */}
          <div className="panel analytics-full-width">
            <div className="panel-header">
              <h3 className="panel-title">{rowDimLabel} × Month Spend Heatmap</h3>
              <span className="panel-subtitle">
                Hot cells mark spend concentration risk across {rowDimLabel.toLowerCase()}s and months
              </span>
            </div>
            <div className="panel-body analytics-heatmap-body">
              {heatmap.empty ? (
                <div className="dashboard-empty" role="status">
                  <SearchX size={32} aria-hidden="true" />
                  <h3>No matrix spend for the current filters</h3>
                </div>
              ) : (
                <HeatMapComponent
                  id="spendHeatMap"
                  theme={chartTheme}
                  height="420px"
                  width="100%"
                  dataSource={heatmap.data}
                  xAxis={{
                    labels: heatmap.xLabels,
                    labelRotation: 45,
                    labelIntersectAction: 'None',
                    textStyle: { size: '11px' },
                  }}
                  yAxis={{
                    labels: heatmap.yLabels,
                    textStyle: { size: '11px' },
                  }}
                  paletteSettings={{
                    type: 'Gradient',
                    palette: heatmap.maxAmount > 0
                      ? heatmap.palette
                      : (theme === 'dark' ? HEATMAP_PALETTE_DARK : HEATMAP_PALETTE),
                  }}
                  legendSettings={{
                    visible: true,
                    position: 'Bottom',
                    height: '15px',
                    width: '75%',
                    showLabel: true,
                    labelFormat: '${value}',
                  }}
                  cellSettings={{
                    border: { width: 1, color: 'var(--color-sf-border-secondary, #e5e7eb)' },
                    showLabel: false,
                  }}
                  showTooltip={true}
                  tooltipRender={heatmapTooltip}
                  renderingMode="SVG"
                >
                  <HeatMapInject services={[HeatMapLegend, HeatMapTooltip]} />
                </HeatMapComponent>
              )}
            </div>
          </div>

          {/* Spend trend — spline area */}
          <div className="panel analytics-full-width">
            <div className="panel-header">
              <h3 className="panel-title">Spend Trend by Month</h3>
            </div>
            <div className="panel-body">
              <ChartComponent
                id="spendByMonthChart"
                theme={chartTheme}
                primaryXAxis={{ valueType: 'Category', majorGridLines: { width: 0 }, labelIntersectAction: 'Rotate45' }}
                primaryYAxis={{ labelFormat: '${value}', majorTickLines: { width: 0 } }}
                tooltip={{ enable: true, format: '${point.x}: ${point.y}' }}
                legendSettings={{ visible: false }}
                chartArea={{ border: { width: 0 } }}
                height="300px"
              >
                <Inject services={[SplineAreaSeries, Category, DataLabel, Tooltip, Legend]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={spendMonthChart}
                    xName="month"
                    yName="amount"
                    name="Spend"
                    type="SplineArea"
                    opacity={0.55}
                    border={{ width: 2 }}
                    fill={chartColors.critical}
                    marker={{ visible: true, width: 6, height: 6 }}
                  />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
          </div>

          <div className="analytics-grid">
            {/* Spend by firm/practice — horizontal bar */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  Spend by {rowDimLabel}
                </h3>
              </div>
              <div className="panel-body">
                <ChartComponent
                  id="spendDimensionChart"
                  theme={chartTheme}
                  primaryXAxis={{ valueType: 'Category', majorGridLines: { width: 0 } }}
                  primaryYAxis={{ labelFormat: '${value}', majorTickLines: { width: 0 } }}
                  tooltip={{ enable: true }}
                  legendSettings={{ visible: false }}
                  chartArea={{ border: { width: 0 } }}
                  height="420px"
                >
                  <Inject services={[BarSeries, Category, DataLabel, Tooltip]} />
                  <SeriesCollectionDirective>
                    <SeriesDirective
                      dataSource={spendDimensionChart}
                      xName="bucket"
                      yName="amount"
                      type="Bar"
                      name="Spend"
                      fill={chartColors.critical}
                      cornerRadius={{ topRight: 4, bottomRight: 4 }}
                    />
                  </SeriesCollectionDirective>
                </ChartComponent>
              </div>
            </div>

            {/* Budget vs Actual — bullet scorecards */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Budget vs Actual</h3>
                <span className="panel-subtitle">Actual bar · target marker · qualitative ranges</span>
              </div>
              <div className="panel-body analytics-bullet-stack">
                {budgetBulletData.length === 0 ? (
                  <div className="dashboard-empty" role="status">
                    <SearchX size={28} aria-hidden="true" />
                    <h3>No budget rows</h3>
                  </div>
                ) : (
                  budgetBulletData.map((row, idx) => (
                    <div key={row.category} className="analytics-bullet-row">
                      <BulletChartComponent
                        id={`budgetBullet-${idx}`}
                        theme={chartTheme}
                        dataSource={[row]}
                        valueField="value"
                        targetField="target"
                        categoryField="category"
                        height="68px"
                        width="100%"
                        minimum={0}
                        maximum={bulletScaleMax}
                        interval={bulletScaleMax / 4}

                        labelFormat="${value}"
                        tooltip={{ enable: true }}
                        animation={{ enable: false }}
                        valueFill={row.value > row.target ? chartColors.high : chartColors.low}
                        targetColor="#334155"
                      >
                        <BulletRangeCollectionDirective>
                          <BulletRangeDirective end={bulletScaleMax * 0.5} color="#fecaca" opacity={0.55} />
                          <BulletRangeDirective end={bulletScaleMax * 0.85} color="#fde68a" opacity={0.55} />
                          <BulletRangeDirective end={bulletScaleMax} color="#bbf7d0" opacity={0.55} />
                        </BulletRangeCollectionDirective>
                        <BulletInject services={[BulletTooltip]} />
                      </BulletChartComponent>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cycle time — horizontal bar */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Median Cycle Time by Practice Area</h3>
              </div>
              <div className="panel-body">
                <ChartComponent
                  id="cycleTimeChart"
                  theme={chartTheme}
                  primaryXAxis={{ valueType: 'Category', majorGridLines: { width: 0 } }}
                  primaryYAxis={{ title: 'Median days', majorTickLines: { width: 0 } }}
                  tooltip={{ enable: true, format: '${point.x}: ${point.y} days' }}
                  legendSettings={{ visible: false }}
                  chartArea={{ border: { width: 0 } }}
                  height="300px"
                >
                  <Inject services={[BarSeries, Category, DataLabel, Tooltip]} />
                  <SeriesCollectionDirective>
                    <SeriesDirective
                      dataSource={cycleTimeData}
                      xName="group"
                      yName="medianDays"
                      name="Median days"
                      type="Bar"
                      fill={chartColors.medium}
                      cornerRadius={{ topRight: 4, bottomRight: 4 }}
                      dataLabel={{ visible: true, position: 'Outer' }}
                    />
                  </SeriesCollectionDirective>
                </ChartComponent>
              </div>
            </div>

            {/* Contract volume — doughnut */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Contract Volume by Type</h3>
              </div>
              <div className="panel-body">
                <AccumulationChartComponent
                  id="volumeDonutChart"
                  theme={chartTheme}
                  height="300px"
                  tooltip={{ enable: true, format: '${point.x}: ${point.y}' }}
                  legendSettings={{ visible: true, position: 'Right', textWrap: 'Wrap' }}
                  enableSmartLabels={true}
                  centerLabel={{
                    text: `${volumeByTypeData.reduce((s, r) => s + r.count, 0)}<br>Contracts`,
                    textStyle: { fontWeight: '600', size: '14px' },
                  }}
                >
                  <AccInject services={[PieSeries, AccumulationDataLabel, AccumulationTooltip, AccumulationLegend]} />
                  <AccumulationSeriesCollectionDirective>
                    <AccumulationSeriesDirective
                      dataSource={volumeByTypeData}
                      xName="type"
                      yName="count"
                      innerRadius="62%"
                      radius="85%"
                      dataLabel={{
                        visible: true,
                        name: 'text',
                        position: 'Outside',
                        connectorStyle: { length: '12px' },
                      }}
                      explode
                      explodeOffset="8%"
                    />
                  </AccumulationSeriesCollectionDirective>
                </AccumulationChartComponent>
              </div>
            </div>
          </div>

          {/* Deadline load — stacked column */}
          <div className="panel analytics-full-width">
            <div className="panel-header">
              <h3 className="panel-title">Deadline Load by Week</h3>
              <span className="panel-subtitle">Stacked by deadline type</span>
            </div>
            <div className="panel-body">
              <ChartComponent
                id="deadlineLoadChart"
                theme={chartTheme}
                primaryXAxis={{ valueType: 'Category', majorGridLines: { width: 0 }, labelIntersectAction: 'Rotate45' }}
                primaryYAxis={{ title: 'Count', majorTickLines: { width: 0 } }}
                tooltip={{ enable: true, shared: true }}
                legendSettings={{ visible: true, position: 'Bottom' }}
                chartArea={{ border: { width: 0 } }}
                height="300px"
              >
                <Inject services={[StackingColumnSeries, Category, DataLabel, Tooltip, Legend]} />
                <SeriesCollectionDirective>
                  <SeriesDirective dataSource={deadlineLoadChart} xName="week" yName="courtDate" name="Court" type="StackingColumn" fill={chartColors.high} />
                  <SeriesDirective dataSource={deadlineLoadChart} xName="week" yName="filing" name="Filing" type="StackingColumn" fill={chartColors.critical} />
                  <SeriesDirective dataSource={deadlineLoadChart} xName="week" yName="renewal" name="Renewal" type="StackingColumn" fill={chartColors.medium} />
                  <SeriesDirective dataSource={deadlineLoadChart} xName="week" yName="discovery" name="Discovery" type="StackingColumn" fill={chartColors.low} />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
          </div>

          {/* Lifecycle funnel */}
          <div className="panel analytics-full-width">
            <div className="panel-header">
              <h3 className="panel-title">Contracts by Lifecycle Stage</h3>
              <span className="panel-subtitle">Pipeline funnel from request through renewal</span>
            </div>
            <div className="panel-body analytics-funnel-body">
              <AccumulationChartComponent
                id="lifecycleFunnelChart"
                theme={chartTheme}
                height="380px"
                tooltip={{ enable: true, format: '${point.x}: ${point.y}' }}
                legendSettings={{ visible: true, position: 'Right' }}
                enableSmartLabels={true}
              >
                <AccInject services={[FunnelSeries, AccumulationDataLabel, AccumulationTooltip, AccumulationLegend]} />
                <AccumulationSeriesCollectionDirective>
                  <AccumulationSeriesDirective
                    dataSource={lifecycleData}
                    xName="stage"
                    yName="count"
                    type="Funnel"
                    width="55%"
                    height="85%"
                    neckWidth="18%"
                    neckHeight="12%"
                    gapRatio={0.04}
                    dataLabel={{
                      visible: true,
                      position: 'Outside',
                      name: 'stage',
                      connectorStyle: { length: '14px' },
                    }}
                  />
                </AccumulationSeriesCollectionDirective>
              </AccumulationChartComponent>
            </div>
          </div>

          <div className="panel analytics-full-width">
            <div className="panel-header">
              <h3 className="panel-title">Contract Drill-down</h3>
            </div>
            <div className="panel-body">
              {drillRows.length === 0 ? (
                <div className="dashboard-empty" role="status">
                  <SearchX size={36} aria-hidden="true" />
                  <h3>No contracts match the filters</h3>
                </div>
              ) : (
                <GridComponent
                  dataSource={drillRows}
                  allowPaging
                  pageSettings={{ pageSize: 10 }}
                  allowSorting
                  allowFiltering
                  filterSettings={{ type: 'Menu' }}
                  rowSelected={onRowSelected}
                  height="auto"
                >
                  <ColumnsDirective>
                    <ColumnDirective field="contractId" headerText="ID" width="90" isPrimaryKey />
                    <ColumnDirective field="title" headerText="Title" width="240" />
                    <ColumnDirective field="contractType" headerText="Type" width="150" />
                    <ColumnDirective field="stage" headerText="Stage" width="130" />
                    <ColumnDirective
                      field="valueAmount"
                      headerText="Value"
                      width="120"
                      textAlign="Right"
                      template={(p: { valueAmount?: number }) => fmtMoney(p.valueAmount ?? 0)}
                    />
                    <ColumnDirective field="matterNumber" headerText="Matter #" width="140" />
                    <ColumnDirective field="counterparty" headerText="Counterparty" width="180" />
                  </ColumnsDirective>
                  <GridInject services={[Page, Sort, Filter]} />
                </GridComponent>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="analytics-skeleton" aria-busy="true" aria-label="Loading analytics">
      <div className="kpi-cards kpi-strip">
        {[0, 1, 2, 3].map(i => (
          <KpiCard key={i} title="" value="" loading />
        ))}
      </div>
      <div className="panel analytics-full-width">
        <div className="panel-header">
          <SkeletonComponent shape="Rectangle" width="280px" height="18px" />
        </div>
        <div className="panel-body">
          <SkeletonComponent shape="Rectangle" width="100%" height="300px" />
        </div>
      </div>
      <div className="panel analytics-full-width">
        <div className="panel-header">
          <SkeletonComponent shape="Rectangle" width="220px" height="18px" />
        </div>
        <div className="panel-body">
          <SkeletonComponent shape="Rectangle" width="100%" height="280px" />
        </div>
      </div>
      <div className="analytics-grid">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="panel">
            <div className="panel-header">
              <SkeletonComponent shape="Rectangle" width="160px" height="18px" />
            </div>
            <div className="panel-body">
              <SkeletonComponent shape="Rectangle" width="100%" height="260px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnalyticsPage;
