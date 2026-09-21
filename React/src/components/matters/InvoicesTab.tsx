// Invoice grid with line-item details, flagged filter, and export.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GridComponent, ColumnsDirective, ColumnDirective, Inject,
  Page, Sort, Filter, Toolbar, ExcelExport, ColumnChooser, Resize, DetailRow,
} from '@syncfusion/ej2-react-grids';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { statusClass, fmtMoney } from '../../utils/mattersHelpers';
import {
  getInvoiceLineItems, ApiError,
} from '../../services';
import {
  invoiceLineItemToRow,
  type LineItemRow,
} from '../../models/api';
import { type InvoiceRow } from './invoiceShared';

export type { InvoiceRow, LineItemRow };

interface InvoicesTabProps {
  loading: boolean;
  invoices: InvoiceRow[];
  /** Record of dispute overrides keyed by `invoiceNumber:lineItemId` */
  lineOverrides: Record<string, { disputed: boolean }>;
  onToggleDispute: (invoiceNumber: string, lineItemId: string) => void;
}

const lineItemCache = new Map<string, LineItemRow[]>();

interface InvoiceLineItemsDetailProps {
  invoiceNumber: string;
  lineOverrides: Record<string, { disputed: boolean }>;
  onToggleDispute: (invoiceNumber: string, lineItemId: string) => void;
}

function InvoiceLineItemsDetail({
  invoiceNumber,
  lineOverrides,
  onToggleDispute,
}: InvoiceLineItemsDetailProps) {
  const [items, setItems] = useState<LineItemRow[] | undefined>(
    () => lineItemCache.get(invoiceNumber),
  );

  useEffect(() => {
    if (lineItemCache.has(invoiceNumber)) {
      setItems(lineItemCache.get(invoiceNumber));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const fetched = await getInvoiceLineItems(invoiceNumber);
        const mapped = fetched.map(invoiceLineItemToRow);
        lineItemCache.set(invoiceNumber, mapped);
        if (!cancelled) setItems(mapped);
      } catch (err) {
        if (!(err instanceof ApiError)) {
          console.warn(`[InvoicesTab] line-item fetch failed for ${invoiceNumber}:`, err);
        }
        lineItemCache.set(invoiceNumber, []);
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceNumber]);

  const showSkeleton = items === undefined;

  return (
    <div className="invoice-detail-panel" role="region" aria-label="Invoice line items">
      <h4 className="invoice-detail-title">Line Items</h4>
      {showSkeleton ? (
        <div className="invoice-detail-skeleton" aria-busy="true" aria-live="polite">
          <SkeletonComponent shape="Rectangle" width="100%" height={18} />
          <SkeletonComponent shape="Rectangle" width="100%" height={18} />
          <SkeletonComponent shape="Rectangle" width="100%" height={18} />
          <SkeletonComponent shape="Rectangle" width="100%" height={18} />
        </div>
      ) : (
        <GridComponent
          id={`invoice-lines-${invoiceNumber}`}
          dataSource={items}
          allowPaging={false}
          allowSorting={true}
          height="auto"
          gridLines="Both"
        >
          <ColumnsDirective>
            <ColumnDirective field="narrative" headerText="Narrative" width="280" />
            <ColumnDirective field="taskCode" headerText="Task" width="90" textAlign="Center" />
            <ColumnDirective field="activityCode" headerText="Activity" width="100" textAlign="Center" />
            <ColumnDirective field="hours" headerText="Hours" width="90" textAlign="Right" />
            <ColumnDirective
              field="rate"
              headerText="Rate"
              width="110"
              textAlign="Right"
              template={(p: { rate?: number }) => fmtMoney(p.rate ?? 0)}
            />
            <ColumnDirective
              field="amount"
              headerText="Amount"
              width="120"
              textAlign="Right"
              template={(p: { amount?: number }) => fmtMoney(p.amount ?? 0)}
            />
            <ColumnDirective
              field="flagged"
              headerText="Flagged"
              width="100"
              template={(p: { flagged: boolean; flagReason?: string }) =>
                p.flagged ? (
                  <span className="flagged-cell" title={p.flagReason ?? ''}>
                    <ShieldAlert size={14} aria-hidden="true" /> Flagged
                  </span>
                ) : (
                  <span>-</span>
                )
              }
            />
            <ColumnDirective
              headerText="Dispute"
              width="110"
              template={(p: LineItemRow) => {
                const key = `${invoiceNumber}:${p.id}`;
                const disputed = lineOverrides[key]?.disputed ?? p.disputed ?? false;
                return (
                  <button
                    type="button"
                    className={`dispute-toggle ${disputed ? 'disputed' : ''}`}
                    onClick={() => onToggleDispute(invoiceNumber, p.id)}
                    aria-pressed={disputed}
                  >
                    {disputed ? (
                      <><CheckCircle2 size={13} aria-hidden="true" /> Disputed</>
                    ) : (
                      <><XCircle size={13} aria-hidden="true" /> Dispute</>
                    )}
                  </button>
                );
              }}
            />
          </ColumnsDirective>
          <Inject services={[Sort]} />
        </GridComponent>
      )}
    </div>
  );
}

export function InvoicesTab({
  loading,
  invoices,
  lineOverrides,
  onToggleDispute,
}: InvoicesTabProps) {
  const gridRef = useRef<GridComponent | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const filteredInvoices = useMemo(() => {
    if (!flaggedOnly) return invoices;
    return invoices.filter(inv => {
      const cached = lineItemCache.get(inv.invoiceNumber);
      const hasFlaggedRow = cached
        ? cached.some(li => li.flagged || li.disputed)
        : false;
      const hasDisputedOverride = Object.keys(lineOverrides).some(
        key => key.startsWith(`${inv.invoiceNumber}:`) && lineOverrides[key]?.disputed,
      );
      return inv.hasFlaggedItems || hasFlaggedRow || hasDisputedOverride;
    });
  }, [invoices, flaggedOnly, lineOverrides]);

  const toolbarClick = useCallback((args: { item: { id: string } }) => {
    if (args.item.id.includes('excelexport')) {
      gridRef.current?.excelExport({ fileName: `invoices-${new Date().toISOString().slice(0, 10)}.xlsx` });
    }
  }, []);

  const toolbarItems = useMemo(() => ['Search', 'ExcelExport'], []);

  const invoiceStatusTemplate = (props: { displayStatus?: string; status?: string }) => {
    const label = props.displayStatus ?? props.status ?? '';
    return <span className={`status-badge ${statusClass(label)}`}>{label}</span>;
  };

  const invoiceAmountTemplate = (props: { totalAmount?: number; currency?: string }) =>
    fmtMoney(props.totalAmount ?? 0, props.currency ?? 'USD');

  const invoiceDateTemplate = (props: { invoiceDate?: string | Date }) => {
    if (!props.invoiceDate) return '-';
    return new Date(props.invoiceDate).toLocaleDateString();
  };

  const detailTemplate = useCallback(
    (props: { invoiceNumber?: string; id?: string }) => {
      const invoiceNumber = props.invoiceNumber ?? props.id ?? '';
      return (
        <InvoiceLineItemsDetail
          invoiceNumber={invoiceNumber}
          lineOverrides={lineOverrides}
          onToggleDispute={onToggleDispute}
        />
      );
    },
    [lineOverrides, onToggleDispute],
  );

  if (loading) {
    return (
      <div className="tab-content">
        <div className="panel">
          <div className="panel-body" style={{ padding: 'var(--spacing-48) 0', textAlign: 'center' }}>
            Loading invoices...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="invoice-controls">
        <button
          type="button"
          className={`chip ${flaggedOnly ? 'active' : ''}`}
          onClick={() => setFlaggedOnly(v => !v)}
          aria-pressed={flaggedOnly}
        >
          Flagged only
        </button>
        {filteredInvoices.length !== invoices.length && (
          <span className="filter-active-badge">
            {filteredInvoices.length} of {invoices.length}
          </span>
        )}
      </div>

      <GridComponent
        ref={(g: GridComponent | null) => { gridRef.current = g; }}
        cssClass="invoices-grid"
        dataSource={filteredInvoices}
        allowPaging={true}
        pageSettings={{ pageSize: 12, pageSizes: [10, 12, 25, 50] }}
        allowSorting={true}
        allowFiltering={true}
        filterSettings={{ type: 'Menu' }}
        allowGrouping={false}
        allowExcelExport={true}
        allowReordering={false}
        allowResizing={true}
        showColumnChooser={true}
        toolbar={toolbarItems as unknown as string[]}
        toolbarClick={toolbarClick}
        detailTemplate={detailTemplate}
        editSettings={{ allowEditing: false, allowAdding: false, allowDeleting: false, mode: 'Normal' }}
        selectionSettings={{ type: 'Single' }}
        height="auto"
      >
        <ColumnsDirective>
          <ColumnDirective field="invoiceNumber" headerText="Invoice #" width="150" isPrimaryKey={true} />
          <ColumnDirective field="firmName" headerText="Law Firm" width="240" />
          <ColumnDirective field="matterNumber" headerText="Matter #" width="140" />
          <ColumnDirective
            field="displayStatus"
            headerText="Status"
            width="130"
            template={invoiceStatusTemplate}
            filter={{ type: 'CheckBox' }}
          />
          <ColumnDirective
            field="totalAmount"
            headerText="Total"
            width="140"
            textAlign="Right"
            template={invoiceAmountTemplate}
          />
          <ColumnDirective
            field="invoiceDate"
            headerText="Invoice Date"
            width="130"
            template={invoiceDateTemplate}
          />
          <ColumnDirective field="periodStart" headerText="Period Start" width="130" format="MM/dd/yyyy" />
          <ColumnDirective field="periodEnd" headerText="Period End" width="130" format="MM/dd/yyyy" />
        </ColumnsDirective>
        <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport, ColumnChooser, Resize, DetailRow]} />
      </GridComponent>
    </div>
  );
}

export default InvoicesTab;
