// Matters page — grid, invoices, and New Matter dialog.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TabComponent, TabItemDirective, TabItemsDirective } from '@syncfusion/ej2-react-navigations';
import { SkeletonComponent, ToastUtility } from '@syncfusion/ej2-react-notifications';
import { Briefcase, AlertTriangle, RefreshCw, Plus, RotateCcw } from 'lucide-react';
import {
  ApiError, listMatters, listInvoices,
  getCriticalMatters, getLookup,
} from '../services';
import type { MatterSummary, MatterRow, LookupItem } from '../models/api';
import { formatInvoiceStatus } from '../utils/apiMappers';
import { MattersTab } from '../components/matters/MattersTab';
import { InvoicesTab, type InvoiceRow } from '../components/matters/InvoicesTab';
import { NewMatterDialog, type NewMatterFormValues } from '../components/matters/NewMatterDialog';
import '../styles/Pages.css';
import '../styles/MattersPage.css';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type TabKey = 'matters' | 'invoices';

interface MatterEditChange {
  field: string;
  previous: unknown;
  current: unknown;
}

interface SessionMatterEdit {
  id: string;
  changes: Record<string, MatterEditChange>;
}

interface SessionLineOverride {
  invoiceNumber: string;
  lineItemId: string;
  disputed: boolean;
}

function countSessionChanges(
  matterEdits: Record<string, SessionMatterEdit>,
  lineOverrides: Record<string, SessionLineOverride>,
): number {
  let count = 0;
  Object.values(matterEdits).forEach(edit => {
    count += Object.keys(edit.changes).length;
  });
  count += Object.values(lineOverrides).filter(o => o.disputed).length;
  return count;
}

// Cache lookup lists in sessionStorage for 60s.
const LOOKUP_CACHE_TTL_MS = 60_000;
const LOOKUP_CACHE_PREFIX = 'mlp:lookup:';

function readLookupCache(type: string): LookupItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LOOKUP_CACHE_PREFIX + type);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; items: LookupItem[] };
    if (!parsed || typeof parsed.ts !== 'number' || !Array.isArray(parsed.items)) return null;
    if (Date.now() - parsed.ts > LOOKUP_CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeLookupCache(type: string, items: LookupItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      LOOKUP_CACHE_PREFIX + type,
      JSON.stringify({ ts: Date.now(), items }),
    );
  } catch {
    // sessionStorage may be full or disabled — non-fatal.
  }
}

function MattersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get('status') ?? undefined;
  const initialTab = (searchParams.get('tab') as TabKey) ?? 'matters';

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [mattersBase, setMattersBase] = useState<MatterRow[]>([]);
  const [invoicesBase, setInvoicesBase] = useState<InvoiceRow[]>([]);
  const [lookups, setLookups] = useState<{ practiceAreas: LookupItem[]; staff: LookupItem[]; firms: LookupItem[] }>({
    practiceAreas: [],
    staff: [],
    firms: [],
  });

  const [matterEdits, setMatterEdits] = useState<Record<string, SessionMatterEdit>>({});
  const [lineOverrides, setLineOverrides] = useState<Record<string, SessionLineOverride>>({});

  const [newMatterOpen, setNewMatterOpen] = useState(false);

  const showToast = useCallback((message: string, kind: 'Success' | 'Information' = 'Success') => {
    ToastUtility.show(message, kind, 4000);
  }, []);

  const load = useCallback(async () => {
    setLoadState(prev => (prev === 'success' || prev === 'empty' ? prev : 'loading'));
    setErrorMsg(null);
    try {
      const matterStatus = statusFilter && /^(Active|Closed|Rejected|All)$/i.test(statusFilter)
        ? statusFilter
        : undefined;

      // Lookups come from a 60-second sessionStorage cache so revisiting the
      // Matters page during a session skips 3 round-trips.
      const lookupTypes = ['practice-areas', 'staff', 'firms'] as const;
      const cachedLookups: Partial<Record<typeof lookupTypes[number], LookupItem[]>> = {};
      const freshLookups: (typeof lookupTypes[number])[] = [];
      for (const t of lookupTypes) {
        const cached = readLookupCache(t);
        if (cached) {
          cachedLookups[t] = cached;
        } else {
          freshLookups.push(t);
        }
      }

      const [mattersRes, invoicesRes, criticalMatters, ...remainingPairs] = await Promise.all([
        listMatters({
          status: matterStatus,
          sort: 'openDate:desc',
          page: 1,
          pageSize: 50,
        }),
        listInvoices({
          page: 1,
          pageSize: 50,
          sort: 'invoiceDate:desc',
        }),
        getCriticalMatters().catch(() => []),
        ...freshLookups.map(t => getLookup(t).catch(() => [] as LookupItem[])),
      ]);

      // Merge the freshly fetched lookups back into the cache map.
      const lookupMap: Record<typeof lookupTypes[number], LookupItem[]> = {
        'practice-areas': cachedLookups['practice-areas'] ?? [],
        'staff': cachedLookups['staff'] ?? [],
        'firms': cachedLookups['firms'] ?? [],
      };
      freshLookups.forEach((t, i) => {
        const fetched = remainingPairs[i] as LookupItem[];
        lookupMap[t] = fetched;
        writeLookupCache(t, fetched);
      });
      const practiceAreas = lookupMap['practice-areas'];
      const staff = lookupMap['staff'];
      const firms = lookupMap['firms'];

      // Attach risk flags and spend from the critical-matters list.
      const criticalByNumber = new Map(criticalMatters.map(c => [c.matterNumber, c]));

      const enriched: MatterRow[] = (mattersRes.items ?? []).map(m => {
        const c = criticalByNumber.get(m.matterNumber);
        const critSpent = c?.spentAmount ?? 0;
        const effectiveSpent = critSpent > 0 ? critSpent : m.spentAmount;
        const pct = c?.budgetUtilizationPct
          ?? (m.budgetAmount > 0
            ? Math.round((effectiveSpent / m.budgetAmount) * 100)
            : 0);
        return {
          ...m,
          spentAmount: effectiveSpent,
          budgetUtilizationPct: pct,
          overBudget: c?.overBudget ?? effectiveSpent > m.budgetAmount,
          daysToNextDeadline: c?.daysToNextDeadline ?? null,
          nextDeadlineTitle: c?.nextDeadlineTitle ?? null,
          overdue: c?.overdue ?? false,
          escalated: c?.escalated ?? false,
          stalled: c?.stalled ?? false,
          severityScore: c?.severityScore ?? 0,
        };
      });

      const summaries = invoicesRes.items ?? [];
      // Load line items on row expand, not on first page load.
      const withLines: InvoiceRow[] = summaries.map(inv => ({
        ...inv,
        id: inv.invoiceNumber,
        firmName: inv.firm,
        displayStatus: formatInvoiceStatus(inv.status),
        currency: 'USD',
        lineItems: [],
      }));

      setMattersBase(enriched);
      setInvoicesBase(withLines);
      setLookups({ practiceAreas, staff, firms });
      const empty = (mattersRes.items?.length ?? 0) === 0 && withLines.length === 0;
      setLoadState(empty ? 'empty' : 'success');
    } catch (err) {
      const message = err instanceof ApiError
        ? `${err.message}${err.problemTitle ? ` — ${err.problemTitle}` : ''}`
        : err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      setLoadState('error');
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Apply session matter edits + client-side status filter for non-API status values.
  const mattersData = useMemo<MatterRow[]>(() => {
    let rows = mattersBase.map(m => {
      const edit = matterEdits[m.matterNumber];
      if (!edit) return m;
      const patched = { ...m } as MatterSummary & Record<string, unknown>;
      Object.entries(edit.changes).forEach(([field, change]) => {
        patched[field] = change.current;
      });
      return patched as MatterSummary;
    });
    if (statusFilter && !/^(Active|Closed|Rejected|All)$/i.test(statusFilter)) {
      rows = rows.filter(m => m.status.toLowerCase() === statusFilter.toLowerCase());
    }
    return rows as MatterRow[];
  }, [mattersBase, matterEdits, statusFilter]);

  const invoicesData = invoicesBase;

  const resetSessionChanges = useCallback(() => {
    setMatterEdits({});
    setLineOverrides({});
  }, []);

  const recordMatterEdit = useCallback(
    (matterNumber: string, field: string, previous: unknown, current: unknown) => {
      if (previous === current) return;
      setMatterEdits(prev => {
        const existing = prev[matterNumber] ?? { id: matterNumber, changes: {} };
        return {
          ...prev,
          [matterNumber]: {
            ...existing,
            changes: {
              ...existing.changes,
              [field]: { field, previous, current },
            },
          },
        };
      });
    },
    [],
  );

  /** Switch the Matters / Invoices tab. */
  const handleTabSelected = useCallback(
    (args: { selectedIndex?: number }) => {
      const index = args.selectedIndex ?? 0;
      const tab: TabKey = index === 0 ? 'matters' : 'invoices';
      setActiveTab(tab);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (tab === 'matters') {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const handleViewMatter = useCallback(
    (matterNumber: string) => {
      navigate(`/matters/${matterNumber}`);
    },
    [navigate],
  );

  const handleContextMenuAction = useCallback((action: string, matterNumber: string) => {
    if (action === 'edit') {
      showToast(`Edit action recorded for matter ${matterNumber}.`, 'Information');
    }
  }, [showToast]);

  const onMatterActionComplete = useCallback(
    (args: {
      requestType?: string;
      data?: MatterSummary;
      previousData?: MatterSummary;
      columnName?: string;
    }) => {
      if (args.requestType === 'save' && args.data && args.previousData && args.columnName) {
        const previous = (args.previousData as unknown as Record<string, unknown>)[args.columnName];
        const current = (args.data as unknown as Record<string, unknown>)[args.columnName];
        recordMatterEdit(args.data.matterNumber, args.columnName, previous, current);
      }
    },
    [recordMatterEdit],
  );

  const toggleLineDispute = useCallback((invoiceNumber: string, lineItemId: string) => {
    const key = `${invoiceNumber}:${lineItemId}`;
    setLineOverrides(prev => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          invoiceNumber,
          lineItemId,
          disputed: !(existing?.disputed ?? false),
        },
      };
    });
  }, []);

  const handleCreate = useCallback((values: NewMatterFormValues) => {
    const dateStr = values.openDate.toISOString().slice(0, 10);
    const newMatter: MatterSummary = {
      matterNumber: `MAT-${String(Date.now()).slice(-6)}`,
      title: values.title,
      client: 'Demo Client',
      clientType: 'Corporate',
      practiceArea: values.practiceArea,
      matterType: 'General',
      responsibleAttorney: values.responsibleAttorney || 'Unassigned',
      firm: values.firm || null,
      status: 'Active',
      riskLevel: values.riskLevel,
      openDate: dateStr,
      closeDate: null,
      budgetAmount: values.budgetAmount,
      spentAmount: 0,
    };
    setMattersBase(prev => [{ ...newMatter, budgetUtilizationPct: 0, overBudget: false, daysToNextDeadline: null, nextDeadlineTitle: null, overdue: false, escalated: false, stalled: false, severityScore: 0 }, ...prev]);
  }, []);

  const sessionChangeCount = useMemo(
    () => countSessionChanges(matterEdits, lineOverrides),
    [matterEdits, lineOverrides],
  );

  return (
    <div className="page matters-page">
      <div className="page-header">
        <div>
          <h1>Matters</h1>
          <p className="page-subtitle">Manage legal matters, invoices, and line-item reviews</p>
        </div>
        <div className="page-actions">
          {sessionChangeCount > 0 && (
            <div className="session-changes-chip" role="status" aria-live="polite">
              <span>{sessionChangeCount} session change{sessionChangeCount === 1 ? '' : 's'}</span>
              <button
                type="button"
                className="session-reset-btn"
                onClick={resetSessionChanges}
                aria-label="Reset session changes"
                title="Reset session changes"
              >
                <RotateCcw size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setNewMatterOpen(true)}>
            <Plus size={16} aria-hidden="true" /> New Matter
          </button>
        </div>
      </div>

      {loadState === 'error' && (
        <div className="dashboard-banner dashboard-banner--error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMsg ?? 'Could not load the matter register. Please try again.'}</span>
          <button type="button" className="banner-retry" onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {loadState === 'loading' && <MattersSkeleton />}

      {loadState === 'empty' && (
        <div className="panel empty-state" role="status">
          <div className="panel-body">
            <Briefcase size={40} aria-hidden="true" />
            <h3>No matters found</h3>
            <p>Create a new matter to see the register in action.</p>
          </div>
        </div>
      )}

      {loadState === 'success' && (
        <>
          <TabComponent
            selectedItem={activeTab === 'matters' ? 0 : 1}
            selected={handleTabSelected}
            animation={{ previous: { effect: 'None' }, next: { effect: 'None' } }}
          >
            <TabItemsDirective>
              <TabItemDirective
                header={{ text: 'Matters' }}
                content={() => (
                  <MattersTab
                    loading={false}
                    matters={mattersData}
                    statusFilter={statusFilter}
                    onStatusFilterChange={(status) => {
                      const next = new URLSearchParams(searchParams);
                      if (status) {
                        next.set('status', status);
                      } else {
                        next.delete('status');
                      }
                      setSearchParams(next, { replace: true });
                    }}
                    onViewMatter={handleViewMatter}
                    onContextMenuAction={handleContextMenuAction}
                  />
                )}
              />
              <TabItemDirective
                header={{ text: 'Invoices' }}
                content={() => (
                  <InvoicesTab
                    loading={false}
                    invoices={invoicesData}
                    lineOverrides={lineOverrides}
                    onToggleDispute={toggleLineDispute}
                  />
                )}
              />
            </TabItemsDirective>
          </TabComponent>

          <NewMatterDialog
            visible={newMatterOpen}
            onClose={() => setNewMatterOpen(false)}
            onCreate={handleCreate}
            practiceAreas={lookups.practiceAreas}
            staff={lookups.staff}
            firms={lookups.firms}
          />
        </>
      )}
    </div>
  );
}

function MattersSkeleton() {
  return (
    <>
      <div className="kpi-cards kpi-strip">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="kpi-card" key={i}>
            <SkeletonComponent shape="Rectangle" width="100%" height={80} />
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-body">
          <SkeletonComponent shape="Rectangle" width="100%" height={350} />
        </div>
      </div>
    </>
  );
}

export default MattersPage;
