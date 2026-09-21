// Matters grid with KPI strip and filters.

import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GridComponent, ColumnsDirective, ColumnDirective, Inject,
  Page, Sort, Filter, Toolbar, ExcelExport, ColumnChooser,
  Group, Resize, Freeze, ContextMenu, CommandColumn
} from '@syncfusion/ej2-react-grids';
import { ChipListComponent, ChipsDirective, ChipDirective } from '@syncfusion/ej2-react-buttons';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import { Briefcase, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { KpiCard } from '../KpiCard';
import type { MatterRow, MatterSummary } from '../../models/api';
import { statusClass, fmtMoney } from '../../utils/mattersHelpers';

interface MattersTabProps {
  loading: boolean;
  matters: MatterRow[];
  statusFilter?: string;
  onStatusFilterChange: (status: string | undefined) => void;
  /** Called when the user clicks "View" in the command column. */
  onViewMatter: (matterNumber: string) => void;
  /** Called when the ContextMenu triggers an action. */
  onContextMenuAction: (action: string, matterNumber: string) => void;
}

const STATUS_CHIPS = [
  { text: 'All', value: '' },
  { text: 'Active', value: 'Active' },
  { text: 'Closed', value: 'Closed' },
  { text: 'Pending', value: 'Pending' },
  { text: 'Under Review', value: 'Under Review' },
];

export function MattersTab({
  loading,
  matters,
  statusFilter,
  onStatusFilterChange,
  onViewMatter,
  onContextMenuAction,
}: MattersTabProps) {
  const navigate = useNavigate();
  const gridRef = useRef<GridComponent | null>(null);

  // ---- KPI calculations ----
  const openMatters = matters.filter(m => m.status === 'Active').length;
  const overBudget = matters.filter(m => m.overBudget).length;
  const overdue = matters.filter(m => m.overdue).length;
  const totalBudget = matters.reduce((s, m) => s + m.budgetAmount, 0);
  const totalSpent = matters.reduce((s, m) => s + m.spentAmount, 0);
  const budgetUtilPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // ---- Context menu config ----
  const contextMenuItems = useMemo(() => [
    { text: 'View Details', target: '.e-gridcontent', id: 'matters-view' },
    { text: 'Edit', target: '.e-gridcontent', id: 'matters-edit' },
    { text: 'Copy Matter #', target: '.e-gridcontent', id: 'matters-copy' },
    { text: 'Excel Export', target: '.e-gridcontent', id: 'matters-excel' },
    { text: 'PDF Export', target: '.e-gridcontent', id: 'matters-pdf' },
  ], []);

  const contextMenuClick = useCallback((args: { item: { id: string }; rowInfo?: { rowData: MatterRow } }) => {
    const matterNumber = args.rowInfo?.rowData?.matterNumber;
    if (!matterNumber) return;

    switch (args.item.id) {
      case 'matters-view':
        onViewMatter(matterNumber);
        break;
      case 'matters-edit':
        onContextMenuAction('edit', matterNumber);
        break;
      case 'matters-copy':
        navigator.clipboard.writeText(matterNumber).catch(() => {});
        break;
      case 'matters-excel':
        gridRef.current?.excelExport({ fileName: `matters-${new Date().toISOString().slice(0, 10)}.xlsx` });
        break;
      case 'matters-pdf':
        gridRef.current?.pdfExport({ fileName: `matters-${new Date().toISOString().slice(0, 10)}.pdf` });
        break;
    }
  }, [onViewMatter, onContextMenuAction]);

  // ---- Toolbar click (Excel export from toolbar button) ----
  const toolbarClick = useCallback((args: { item: { id: string } }) => {
    const id = args.item.id;
    if (id.includes('excelexport')) {
      gridRef.current?.excelExport({ fileName: `matters-${new Date().toISOString().slice(0, 10)}.xlsx` });
    }
  }, []);

  // ---- Conditional formatting: budget utilization ----
  const queryCellInfo = useCallback((args: { data: MatterRow; column?: { field?: string }; cell: HTMLElement }) => {
    if (args.column?.field === 'budgetUtilizationPct' || args.column?.field === 'spentAmount') {
      const pct = args.data.budgetUtilizationPct;
      if (pct >= 100) {
        args.cell.classList.add('budget-over');
      } else if (pct >= 75) {
        args.cell.classList.add('budget-warning');
      } else {
        args.cell.classList.add('budget-ok');
      }
    }
  }, []);

  // ---- Cell templates ----
  const statusTemplate = (props: { status: string }) => (
    <span className={`status-badge ${statusClass(props.status)}`}>{props.status}</span>
  );

  const budgetTemplate = (props: MatterRow) => (
    <div className="budget-value">
      <span className="amount">{fmtMoney(props.spentAmount)}</span>
      <span className="util-pct">/ {fmtMoney(props.budgetAmount)} ({props.budgetUtilizationPct}%)</span>
    </div>
  );

  const deadlineTemplate = (props: MatterRow) => {
    if (!props.nextDeadlineTitle) return <span className="app-text-secondary">—</span>;
    const isUrgent = typeof props.daysToNextDeadline === 'number' && props.daysToNextDeadline <= 3;
    return (
      <span style={{ color: isUrgent ? 'var(--color-sf-fg-error-primary)' : undefined }}>
        {props.nextDeadlineTitle}
        {props.daysToNextDeadline != null && (
          <span className="app-text-secondary" style={{ display: 'block', fontSize: 'var(--font-size-xs)' }}>
            {props.daysToNextDeadline === 0 ? 'Today' : `${props.daysToNextDeadline}d`}
          </span>
        )}
      </span>
    );
  };

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="tab-content">
        <div className="kpi-cards kpi-strip">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="e-card kpi-card" key={i}>
              <SkeletonComponent shape="Rectangle" width="100%" height={80} />
            </div>
          ))}
        </div>
        <div className="panel">
          <SkeletonComponent shape="Rectangle" width="100%" height={350} />
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      {/* KPI strip */}
      <div className="kpi-cards kpi-strip">
        <KpiCard
          title="Open Matters"
          value={openMatters}
          icon={<Briefcase size={18} />}
          iconTone="blue"
          subtitle={`${matters.length} total matters`}
        />
        <KpiCard
          title="Over Budget"
          value={overBudget}
          icon={<AlertTriangle size={18} />}
          iconTone="red"
          subtitle={`${budgetUtilPct}% overall utilization`}
          progress={budgetUtilPct}
        />
        <KpiCard
          title="Overdue Deadlines"
          value={overdue}
          icon={<FileText size={18} />}
          iconTone="orange"
          subtitle={overdue === 1 ? '1 matter overdue' : `${overdue} matters overdue`}
        />
        <KpiCard
          title="Total Spend"
          value={fmtMoney(totalSpent)}
          icon={<TrendingUp size={18} />}
          iconTone="green"
          subtitle={`Budget: ${fmtMoney(totalBudget)}`}
        />
      </div>

      {/* Filter bar */}
      <div className="matters-filter-bar">
        <span className="filter-label">Status</span>
        <ChipListComponent
          id="matters-status-filter"
          selection="Single"
          selectedChips={statusFilter ? [STATUS_CHIPS.findIndex(s => s.value === statusFilter)] : [0]}
          click={(e: { index?: number }) => {
            const idx = e.index ?? 0;
            const val = STATUS_CHIPS[idx]?.value ?? '';
            onStatusFilterChange(val || undefined);
          }}
        >
          <ChipsDirective>
            {STATUS_CHIPS.map((s) => (
              <ChipDirective key={s.value} text={s.text} />
            ))}
          </ChipsDirective>
        </ChipListComponent>
      </div>

      {/* Grid */}
      <div className="e-adaptive-demo">
        <GridComponent
          ref={(g: GridComponent | null) => { gridRef.current = g; }}
          dataSource={matters}
          allowPaging={true}
          pageSettings={{ pageSize: 12, pageSizes: [10, 12, 25, 50] }}
          allowSorting={true}
          allowFiltering={true}
          filterSettings={{ type: 'Menu' }}
          allowGrouping={true}
          allowExcelExport={true}
          allowReordering={false}
          allowResizing={true}
          showColumnChooser={true}
          toolbar={['Search', 'ExcelExport', 'ColumnChooser']}
          contextMenuItems={contextMenuItems}
          contextMenuClick={contextMenuClick}
          toolbarClick={toolbarClick}
          queryCellInfo={queryCellInfo}
          rowSelected={(args: { data?: { matterNumber?: string } }) => {
            const mn = args.data?.matterNumber;
            if (mn) navigate(`/matters/${mn}`);
          }}
          selectionSettings={{ type: 'Single' }}
          height="auto"
        >
          <ColumnsDirective>
            <ColumnDirective field="matterNumber" headerText="Matter #" width="130" isPrimaryKey={true} />
            <ColumnDirective field="title" headerText="Title" width="260" freeze="Left" />
            <ColumnDirective field="client" headerText="Client" width="180" />
            <ColumnDirective
              field="status"
              headerText="Status"
              width="120"
              template={statusTemplate}
              filter={{ type: 'CheckBox' }}
            />
            <ColumnDirective
              field="riskLevel"
              headerText="Risk"
              width="100"
              template={(props: { riskLevel: string }) => (
                <span className={`priority-${props.riskLevel.toLowerCase()}`}>{props.riskLevel}</span>
              )}
              filter={{ type: 'CheckBox' }}
            />
            <ColumnDirective field="responsibleAttorney" headerText="Attorney" width="170" />
            <ColumnDirective
              field="budgetUtilizationPct"
              headerText="Budget"
              width="180"
              template={budgetTemplate}
              textAlign="Right"
              sortComparer={(a: string | number | Date | boolean, b: string | number | Date | boolean) => {
                const an = typeof a === 'number' ? a : 0;
                const bn = typeof b === 'number' ? b : 0;
                return an - bn;
              }}
            />
            <ColumnDirective field="practiceArea" headerText="Practice Area" width="160" />
            <ColumnDirective field="firm" headerText="Firm" width="160" />
            <ColumnDirective
              field="openDate"
              headerText="Opened"
              width="110"
              format="MM/dd/yyyy"
            />
            <ColumnDirective
              field="nextDeadlineTitle"
              headerText="Next Deadline"
              width="180"
              template={deadlineTemplate}
            />
            <ColumnDirective
              headerText="Actions"
              width="110"
              commands={[
                {
                  buttonOption: {
                    content: 'View',
                    cssClass: 'e-flat e-primary',
                    click: (args: { rowData?: MatterRow }) => {
                      if (args.rowData?.matterNumber) {
                        onViewMatter(args.rowData.matterNumber);
                      }
                    },
                  },
                },
              ]}
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport, ColumnChooser, Group, Resize, Freeze, ContextMenu, CommandColumn ]} />
        </GridComponent>
      </div>
    </div>
  );
}

export default MattersTab;