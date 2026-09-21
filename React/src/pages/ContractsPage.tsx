import {
  useCallback, useEffect, useMemo, useRef, useState,
  type ReactElement,
} from 'react';
import {
  KanbanComponent, ColumnsDirective, ColumnDirective,
  StackedHeadersDirective, StackedHeaderDirective,
} from '@syncfusion/ej2-react-kanban';
import { SkeletonComponent, ToastComponent } from '@syncfusion/ej2-react-notifications';
import {
  ButtonComponent, ChipListComponent, ChipsDirective, ChipDirective,
} from '@syncfusion/ej2-react-buttons';
import { MultiSelectComponent, Inject as DropDownInject, CheckBoxSelection } from '@syncfusion/ej2-react-dropdowns';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ShieldAlert, RotateCcw, UserCog, Briefcase,
  CircleDollarSign, Inbox, RefreshCw, FilterX,
  Lock, CalendarClock, PenLine,
} from 'lucide-react';
import { ApiError, listContracts } from '../services';
import {
  DEFAULT_VP_SIGN_OFF_THRESHOLD_USD,
  LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABEL,
  type LifecycleStage,
} from '../models/Contract';
import type { ContractSummary } from '../models/api';
import { usePersona, type Persona } from '../context/PersonaContext';
import {
  daysInStage,
  formatUsd, isForwardTransition,
} from '../utils/lifecycle';
import { lifecycleStageFromApi } from '../utils/apiMappers';
import { KpiCard, type KpiIconTone } from '../components/KpiCard';
import '../styles/Pages.css';
import '../styles/ContractsPage.css';
import '../styles/KpiCard.css';

// Types and constants.

type LoadState = 'loading' | 'success' | 'empty' | 'error';

type ToastKind = 'info' | 'warning' | 'error' | 'success';

/** Session overlay for a dragged contract. */
interface SessionOverlayEntry {
  contractId: string;
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  movedAt: string;
  reason?: string;
  reasonCategory?: string;
}

const OVERLAY_STORAGE_KEY = 'mlp:contracts-overlay';
const OVERLAY_VERSION = 1;

interface PersistedOverlay {
  version: number;
  entries: SessionOverlayEntry[];
}

function loadOverlay(): SessionOverlayEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedOverlay;
    if (parsed.version !== OVERLAY_VERSION || !Array.isArray(parsed.entries)) return [];
    return parsed.entries;
  } catch {
    return [];
  }
}

function saveOverlay(entries: SessionOverlayEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedOverlay = { version: OVERLAY_VERSION, entries };
    window.localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Kanban card for one contract. */
interface KanbanRow {
  Key: string;
  Id: string;
  Status: LifecycleStage;
  SwimlaneKey: string;
  Title: string;
  ContractTitle: string;
  ContractType: string;
  Value: number;
  ValueFormatted: string;
  Counterparty: string;
  Attorney: string;
  AttorneyInitials: string;
  DaysInStage: number;
  IsVpRequired: boolean;
  IsOverdue: boolean;
  IsAtRisk: boolean;
  IsSessionMove: boolean;
  CardClass: string;
  RenewalLabel: string | null;
  RenewalDateFormatted: string | null;
  Contract: ContractSummary;
  BaseStage: LifecycleStage;
}

/** Swimlane key from contract type. */
function swimlaneKey(contractType: string): string {
  return contractType.replace(/\s+/g, '-');
}

/** Board filters. Empty means all. */
interface Filters {
  contractTypes: string[];
  stages: LifecycleStage[];
}

const EMPTY_FILTERS: Filters = { contractTypes: [], stages: [] };

/** Parse a lifecycle stage from a query param. */
function parseStageParam(value: string | null): LifecycleStage | null {
  if (!value) return null;
  return (LIFECYCLE_STAGES as readonly string[]).includes(value)
    ? (value as LifecycleStage)
    : null;
}



function ContractsPage() {
  const { persona, setPersona, canApprove } = usePersona();
  const kanbanRef = useRef<KanbanComponent | null>(null);
  const toastRef = useRef<ToastComponent | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(DEFAULT_VP_SIGN_OFF_THRESHOLD_USD);
  const [overlay, setOverlay] = useState<SessionOverlayEntry[]>(() => loadOverlay());
  const [liveMessage, setLiveMessage] = useState<string>('');
  const [baseContracts, setBaseContracts] = useState<ContractSummary[]>([]);

  // Seed filters from `?stage=` / `?type=` query params.
  const [filters, setFilters] = useState<Filters>(() => {
    const stage = parseStageParam(searchParams.get('stage'));
    const type = searchParams.get('type');
    return {
      contractTypes: type ? [type] : [],
      stages: stage ? [stage] : [],
    };
  });

  // Stage after applying the session overlay.
  const stageForContract = useCallback((c: ContractSummary): LifecycleStage => {
    const base = lifecycleStageFromApi(c.stage);
    if (overlay.length === 0) return base;
    let latest: SessionOverlayEntry | undefined;
    overlay.forEach(entry => {
      if (entry.contractId !== String(c.contractId)) return;
      if (!latest || latest.movedAt < entry.movedAt) latest = entry;
    });
    return latest?.toStage ?? base;
  }, [overlay]);

  // Build the rows the Kanban consumes.
  const rows = useMemo<KanbanRow[]>(() => {
    return baseContracts.map(c => {
      const baseStage = lifecycleStageFromApi(c.stage);
      const stage = stageForContract(c);
      const stageDays = daysInStage(c.stageEnteredAt);
      const days = stageDays > 0 ? stageDays : daysInStage(c.effectiveDate);
      const vp = c.valueAmount > threshold;
      const isAtRisk = (stage === 'RenewalExpiry' || c.renewalDueSoon) && days >= 30 && days < 60;
      const isOverdue = stage === 'RenewalExpiry' && days >= 60;
      const isSessionMove = overlay.some(o => o.contractId === String(c.contractId));

      const cardClass = [
        'contract-card',
        isOverdue ? 'is-overdue' : '',
        !isOverdue && isAtRisk ? 'is-at-risk' : '',
      ].filter(Boolean).join(' ');

      // Compute attorney initials from full name.
      const attorneyName = c.responsibleAttorney ?? '';
      const initials = attorneyName
        ? attorneyName.split(' ').filter(Boolean).map(p => p[0]).join('')
        : '—';

      // Compute renewal countdown label (only for RenewalExpiry stage).
      let renewalLabel: string | null = null;
      let renewalDateFormatted: string | null = null;
      if (c.renewalDate) {
        const rd = new Date(c.renewalDate);
        const today = new Date();
        const diffMs = rd.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          renewalLabel = `${diffDays}d to renewal`;
        } else if (diffDays === 0) {
          renewalLabel = 'Renewal today';
        } else {
          renewalLabel = `Overdue by ${Math.abs(diffDays)}d`;
        }
        renewalDateFormatted = rd.toLocaleDateString('en-US', {
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        });
      }

      return {
        Key: String(c.contractId),
        Id: `CON-${c.contractId}`,
        Status: stage,
        SwimlaneKey: swimlaneKey(c.contractType),
        Title: c.counterparty || c.title || '—',
        ContractTitle: c.title,
        ContractType: c.contractType,
        Value: c.valueAmount,
        ValueFormatted: formatUsd(c.valueAmount),
        Counterparty: c.counterparty || 'Unassigned',
        Attorney: attorneyName,
        AttorneyInitials: initials,
        DaysInStage: days,
        IsVpRequired: vp,
        IsOverdue: isOverdue,
        IsAtRisk: isAtRisk,
        IsSessionMove: isSessionMove,
        CardClass: cardClass,
        RenewalLabel: renewalLabel,
        RenewalDateFormatted: renewalDateFormatted,
        Contract: c,
        BaseStage: baseStage,
      };
    });
  }, [baseContracts, overlay, threshold, stageForContract]);

  // Distinct contract types present in the data for the filter dropdown.
  const contractTypeOptions = useMemo(() => {
    return Array.from(new Set(baseContracts.map(c => c.contractType))).sort();
  }, [baseContracts]);

  const hasActiveFilters = (
    filters.contractTypes.length > 0 ||
    filters.stages.length > 0
  );

  // Rows after type and stage filters.
  const filteredRows = useMemo<KanbanRow[]>(() => {
    return rows.filter(row => {
      if (filters.contractTypes.length > 0 && !filters.contractTypes.includes(row.ContractType)) {
        return false;
      }
      if (filters.stages.length > 0 && !filters.stages.includes(row.Status)) {
        return false;
      }
      return true;
    });
  }, [rows, filters]);

  // ---- KPI strip metrics (computed from the full board, not filtered rows) ----
  const kpis = useMemo(() => {
    if (rows.length === 0) {
      return {
        pendingSignatureCount: 0,
        overdueCount: 0,
        atRiskCount: 0,
        pendingVpCount: 0,
        inFlightValue: 0,
      };
    }
    const pendingSignatureCount = rows.filter(r => r.Status === 'Signature').length;
    const overdueCount = rows.filter(r => r.IsOverdue).length;
    const atRiskCount = rows.filter(r => !r.IsOverdue && r.IsAtRisk).length;
    const pendingVpCount = rows.filter(r => r.IsVpRequired && !r.IsOverdue).length;
    const inFlightValue = rows
      .filter(r => r.Status !== 'Executed' && r.Status !== 'Active')
      .reduce((sum, r) => sum + r.Value, 0);
    return { pendingSignatureCount, overdueCount, atRiskCount, pendingVpCount, inFlightValue };
  }, [rows]);

  // ---- Return-to-Draft dialog state ----
  const [returnDialog, setReturnDialog] = useState<{
    contractId: string;
    fromStage: LifecycleStage;
  } | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnCategory, setReturnCategory] = useState<string>('Revision needed');

  const RETURN_CATEGORIES = useMemo(
    () => ['Revision needed', 'Terms changed', 'Stakeholder objection', 'Incomplete data'],
    [],
  );

  const load = useCallback(async () => {
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const res = await listContracts({ page: 1, pageSize: 200, sort: 'renewalDate:asc' });
      const items = res.items ?? [];
      setBaseContracts(items);
      setLoadState(items.length === 0 ? 'empty' : 'success');
    } catch (err) {
      const message = err instanceof ApiError
        ? `${err.message}${err.problemTitle ? ` — ${err.problemTitle}` : ''}`
        : err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Persist the overlay whenever it changes.
  useEffect(() => {
    saveOverlay(overlay);
  }, [overlay]);

  // ---- Toast helpers (via Syncfusion ToastComponent ref) ----
  const showToast = useCallback((kind: ToastKind, message: string) => {
    if (toastRef.current) {
      void toastRef.current.show({
        content: message,
        cssClass: `e-toast-${kind}`,
        icon: kind === 'success' ? 'e-icons e-success' :
          kind === 'warning' ? 'e-icons e-warning' :
          kind === 'error' ? 'e-icons e-error' : 'e-icons e-info',
        timeOut: 4000,
      });
    }
    setLiveMessage(message);
  }, []);

  // Decide whether a card drop is allowed for the current persona.
  const evaluateDrop = useCallback((
    card: KanbanRow,
    fromStage: LifecycleStage,
    toStage: LifecycleStage,
  ): { allowed: boolean; reason?: string; returnToDraft?: boolean } => {
    if (fromStage === toStage) return { allowed: true };

    // Forward-only — allow backward only to Draft (Return-to-Draft).
    if (!isForwardTransition(fromStage, toStage)) {
      if (toStage === 'Draft') {
        return { allowed: true, returnToDraft: true };
      }
      return { allowed: false, reason: 'Only forward moves are permitted on the lifecycle board.' };
    }

    // Attorney cannot advance past Internal Approval
    if (!canApprove) {
      const toIndex = LIFECYCLE_STAGES.indexOf(toStage);
      if (toIndex > LIFECYCLE_STAGES.indexOf('InternalApproval')) {
        return {
          allowed: false,
          reason: 'Your role (Attorney) can advance cards up to Internal Approval. ' +
            'A Legal Ops Manager must sign off on later transitions.',
        };
      }
    }

    // VP sign-off gate
    const approvalIndex = LIFECYCLE_STAGES.indexOf('InternalApproval');
    const signatureIndex = LIFECYCLE_STAGES.indexOf('Signature');
    const fromIndex = LIFECYCLE_STAGES.indexOf(fromStage);
    const toIndex = LIFECYCLE_STAGES.indexOf(toStage);
    const isApprovalToSignature = fromIndex === approvalIndex && toIndex === signatureIndex;

    if (isApprovalToSignature && card.IsVpRequired && !canApprove) {
      return {
        allowed: false,
        reason:
          `VP sign-off required for contracts over ${formatUsd(threshold)}. ` +
          'A Legal Ops Manager must clear the gate before signature.',
      };
    }

    return { allowed: true };
  }, [canApprove, threshold]);

  // ---- Kanban event handlers ----
  const handleDragStart = useCallback((args: { data?: KanbanRow[]; cancel?: boolean }) => {
    if (!args?.data?.length) return;
    const card = args.data[0];
    // Block drag from terminal stages
    if (card.Status === 'Executed' || card.Status === 'Active' || card.Status === 'RenewalExpiry') {
      args.cancel = true;
    }
  }, []);

  const handleDragStop = useCallback((args: {
    data?: KanbanRow[];
    element?: HTMLElement | HTMLElement[];
    event?: MouseEvent;
    cancel?: boolean;
    dropIndex?: number;
  }) => {
    if (!args?.data?.length) return;
    const card = args.data[0];
    // Destination column is already on the card after the drop.
    const toStage = card.Status;
    const fromStage = stageForContract(card.Contract);
    if (toStage === fromStage) return;

    const decision = evaluateDrop(card, fromStage, toStage);
    if (!decision.allowed) {
      // Snap the card back to its previous column.
      card.Status = fromStage;
      args.cancel = true;
      const kind: ToastKind = decision.reason?.includes('VP sign-off') ? 'warning' :
        decision.reason?.includes('Attorney') ? 'info' : 'warning';
      showToast(kind, decision.reason ?? 'Move not allowed.');
      return;
    }

    // Return-to-Draft asks for a reason before saving.
    if (toStage === 'Draft' && fromStage !== 'Draft') {
      card.Status = fromStage;
      args.cancel = true;
      setReturnReason('');
      setReturnCategory(RETURN_CATEGORIES[0]);
      setReturnDialog({ contractId: String(card.Contract.contractId), fromStage });
      return;
    }

    // Save the move in the session overlay.
    setOverlay(prev => [
      ...prev,
      {
        contractId: String(card.Contract.contractId),
        fromStage,
        toStage,
        movedAt: new Date().toISOString(),
      },
    ]);
    showToast(
      'success',
      `Moved CON-${card.Contract.contractId} from ${LIFECYCLE_STAGE_LABEL[fromStage]} to ${LIFECYCLE_STAGE_LABEL[toStage]}.`,
    );
  }, [evaluateDrop, showToast, stageForContract, RETURN_CATEGORIES]);

  // Kanban card contents.
  const cardTemplate = useCallback((props: KanbanRow): ReactElement => (
    <div className={props.CardClass} data-testid={`contract-card-${props.Key}`}>
      <div className="contract-card__header">
        <span className="contract-card__id">{props.Id}</span>
        <span className="contract-card__value">{props.ValueFormatted}</span>
      </div>
      <div className="contract-card__title" title={props.ContractTitle}>{props.Title}</div>
      {(props.IsVpRequired || props.IsOverdue || props.IsAtRisk || props.IsSessionMove) && (
        <div className="contract-card__badges">
          {props.IsVpRequired && (
            <span className="contract-card__badge badge-vp"
              title="VP sign-off required (value exceeds the VP threshold)">
              <Lock size={11} aria-hidden="true" /> VP sign-off
            </span>
          )}
          {props.IsOverdue && (
            <span className="contract-card__badge badge-overdue">
              <AlertTriangle size={11} aria-hidden="true" /> Overdue
            </span>
          )}
          {!props.IsOverdue && props.IsAtRisk && (
            <span className="contract-card__badge badge-at-risk">
              <AlertTriangle size={11} aria-hidden="true" /> At risk
            </span>
          )}
          {props.IsSessionMove && (
            <span className="contract-card__badge badge-session"
              title="This move is a session-overlay edit (not persisted server-side)">
              Session edit
            </span>
          )}
        </div>
      )}
      {props.RenewalLabel && props.Status === 'RenewalExpiry' && (
        <div className="contract-card__renewal">
          <span className={`contract-card__renewal-pill ${props.IsOverdue ? 'is-overdue' : props.IsAtRisk ? 'is-at-risk' : ''}`}>
            <CalendarClock size={11} aria-hidden="true" />
            {props.RenewalLabel}
          </span>
          <span className="contract-card__renewal-date">{props.RenewalDateFormatted}</span>
        </div>
      )}
      <div className="contract-card__footer">
        <span className="contract-card__attorney"
          title={props.Attorney || 'No responsible attorney assigned'}>
          <span className="contract-card__attorney-avatar" aria-hidden="true">
            {props.AttorneyInitials}
          </span>
          <span className="contract-card__attorney-name">
            {props.Attorney || 'Unassigned'}
          </span>
        </span>
        <span className="contract-card__days" title="Days in current stage">
          <CalendarClock size={13} aria-hidden="true" className="contract-card__clock" />
          {props.DaysInStage}d
        </span>
      </div>
    </div>
  ), []);

  const handleCardClick = useCallback((_args: { data?: KanbanRow[]; event?: MouseEvent }) => {
    // Board is the primary surface; card click does not navigate away.
  }, []);

  const handleCardDoubleClick = useCallback((args: { cancel?: boolean }) => {
    // Suppress the built-in Kanban card editor — there is no contract detail page.
    args.cancel = true;
  }, []);

  const resetOverlay = useCallback(() => {
    setOverlay([]);
    showToast('info', 'Session changes cleared. All cards reverted to seeded data.');
  }, [showToast]);

  // Keep the stage filter in the URL.
  const syncStageParam = useCallback((stages: LifecycleStage[]) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // Keep a single-stage filter in the URL.
      if (stages.length === 1) {
        next.set('stage', stages[0]);
      } else {
        next.delete('stage');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleTypesChange = useCallback((value: string[]) => {
    setFilters(prev => ({ ...prev, contractTypes: value }));
  }, []);

  const handleStagesChange = useCallback((value: LifecycleStage[]) => {
    setFilters(prev => ({ ...prev, stages: value }));
    syncStageParam(value);
  }, [syncStageParam]);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('stage');
      next.delete('type');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Announce the filtered result count to assistive tech when filters change.
  useEffect(() => {
    if (loadState !== 'success') return;
    if (hasActiveFilters) {
      setLiveMessage(
        `${filteredRows.length} contract${filteredRows.length === 1 ? '' : 's'} match the active filters.`,
      );
    }
  }, [filteredRows.length, hasActiveFilters, loadState]);

  // ---- Render ----

  if (loadState === 'error') {
    return (
      <div className="page contracts-page">
        <div className="page-header">
          <div>
            <h1>Contracts</h1>
            <p className="page-subtitle">End-to-end contract lifecycle board</p>
          </div>
        </div>
        <div className="contracts-error" role="alert">
          <AlertTriangle size={36} aria-hidden="true" />
          <h3>Could not load contracts</h3>
          <p>{errorMsg ?? 'There was a problem loading the lifecycle board. Please try again.'}</p>
          <ButtonComponent
            cssClass="e-primary"
            onClick={() => void load()}
          >
            <RefreshCw size={14} aria-hidden="true" className="btn-icon-gap" />
            Retry
          </ButtonComponent>
        </div>
      </div>
    );
  }

  return (
    <div className="page contracts-page">
      <div className="page-header">
        <div>
          <h1>Contract Lifecycle Management</h1>
          <p className="page-subtitle">
            Drag cards to advance contracts through the lifecycle. VP-gated moves
            require manager sign-off.
          </p>
        </div>
        <div className="page-actions">
          {overlay.length > 0 && (
            <div className="session-changes-chip" role="status" aria-live="polite">
              <span>
                {overlay.length} session change{overlay.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                className="session-reset-btn"
                onClick={resetOverlay}
                aria-label="Reset session changes"
                title="Reset session changes"
              >
                <RotateCcw size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <PersonaToggle persona={persona} setPersona={setPersona} />
          <ThresholdControl threshold={threshold} setThreshold={setThreshold} />
        </div>
      </div>

      <div className="contracts-sr-live" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      {loadState === 'loading' && <ContractsSkeleton />}

      {loadState === 'empty' && (
        <div className="contracts-empty" role="status">
          <Inbox size={40} aria-hidden="true" />
          <h3>No contracts yet</h3>
          <p>
            Once contracts are added, the lifecycle board will appear here with
            stages and swimlanes.
          </p>
        </div>
      )}

      {loadState === 'success' && (
        <>
          {/* KPI strip — headline metrics for the contract portfolio. */}
          <div className="contracts-kpi-strip" aria-label="Contract portfolio metrics">
            <KpiCard
              title="Pending signature"
              value={kpis.pendingSignatureCount}
              icon={<PenLine size={18} strokeWidth={1.9} aria-hidden="true" />}
              iconTone={kpis.pendingSignatureCount > 0 ? 'blue' : 'neutral'}
            />
            <KpiCard
              title="Overdue renewals"
              value={kpis.overdueCount}
              icon={<AlertTriangle size={18} strokeWidth={1.9} aria-hidden="true" />}
              iconTone={kpis.overdueCount > 0 ? 'red' : 'neutral'}
            />
            <KpiCard
              title="At risk"
              value={kpis.atRiskCount}
              icon={<AlertTriangle size={18} strokeWidth={1.9} aria-hidden="true" />}
              iconTone={kpis.atRiskCount > 0 ? 'orange' : 'neutral'}
            />
            <KpiCard
              title="Pending VP sign-off"
              value={kpis.pendingVpCount}
              icon={<Lock size={18} strokeWidth={1.9} aria-hidden="true" />}
              iconTone={kpis.pendingVpCount > 0 ? 'purple' : 'neutral'}
            />
            <KpiCard
              title="In-flight value"
              value={formatUsd(kpis.inFlightValue)}
              icon={<CircleDollarSign size={18} strokeWidth={1.9} aria-hidden="true" />}
              iconTone="blue"
            />
          </div>

          <div className="contracts-filter-bar" role="search" aria-label="Contract board filters">
            <div className="contracts-filter-field">
              <MultiSelectComponent
                dataSource={contractTypeOptions as string[]}
                value={filters.contractTypes}
                change={(args: { value?: string[] }) => handleTypesChange(args.value ?? [])}
                placeholder="Contract types"
                mode="CheckBox"
                showDropDownIcon={true}
                showClearButton={false}
                cssClass="contracts-filter-input"
                width="100%"
                popupWidth="100%"
                aria-label="Filter by contract type"
              >
                <DropDownInject services={[CheckBoxSelection]} />
              </MultiSelectComponent>
            </div>
            <ContractsFilterChips
              filters={filters}
              onToggle={handleStagesChange}
            />
            {hasActiveFilters && (
              <div className="contracts-filter-bar__actions">
                <ButtonComponent
                  cssClass="e-outline contracts-filter-reset"
                  onClick={resetFilters}
                >
                  <FilterX size={14} aria-hidden="true" className="btn-icon-gap" />
                  Clear filters
                </ButtonComponent>
              </div>
            )}
          </div>

          {filteredRows.length === 0 && hasActiveFilters ? (
            <div className="contracts-empty" role="status">
              <FilterX size={40} aria-hidden="true" />
              <h3>No contracts match these filters</h3>
              <p>
                Try widening the contract type or lifecycle stage selection to
                see the full board again.
              </p>
              <ButtonComponent cssClass="e-primary" onClick={resetFilters}>
                <FilterX size={14} aria-hidden="true" className="btn-icon-gap" />
                Clear filters
              </ButtonComponent>
            </div>
          ) : (
          <div className="contracts-kanban" role="region" aria-label="Contract lifecycle board">
          <KanbanComponent
            ref={(k: KanbanComponent | null) => { kanbanRef.current = k; }}
            id="contracts-kanban"
            dataSource={filteredRows}
            keyField="Status"
            cardSettings={{
              headerField: 'Id',
              contentField: 'Title',
              template: cardTemplate,
              selectionType: 'Single',
              showHeader: false,
            }}
            swimlaneSettings={{
              keyField: 'SwimlaneKey',
              textField: 'ContractType',
              showItemCount: true,
            }}
            allowDragAndDrop={true}
            dragStart={handleDragStart}
            dragStop={handleDragStop}
            cardClick={handleCardClick}
            cardDoubleClick={handleCardDoubleClick}
            height="auto"
            width="100%"
          >
            <ColumnsDirective>
              {LIFECYCLE_STAGES.map(stage => {
                return (
                  <ColumnDirective
                    key={stage}
                    keyField={stage}
                    headerText={LIFECYCLE_STAGE_LABEL[stage]}
                    showItemCount={true}
                    allowDrag={stage !== 'Executed' && stage !== 'Active'}
                    allowDrop={true}
                  />
                );
              })}
            </ColumnsDirective>
            <StackedHeadersDirective>
              <StackedHeaderDirective
                text="Drafting"
                keyFields="Draft"
              />
              <StackedHeaderDirective
                text="Negotiation & approval"
                keyFields="Negotiate,InternalApproval,Signature"
              />
              <StackedHeaderDirective
                text="In-force"
                keyFields="Executed,Active,RenewalExpiry"
              />
            </StackedHeadersDirective>
          </KanbanComponent>
          </div>
          )}
        </>
      )}

      {!canApprove && loadState === 'success' && (
        <div className="contracts-error-banner" role="note" aria-live="polite">
          <ShieldAlert size={16} aria-hidden="true" />
          <span>
            <strong>Attorney persona:</strong> you can advance cards up to{' '}
            <em>Internal Approval</em>. The VP sign-off gate and later transitions
            require the Legal Ops Manager persona.
          </span>
        </div>
      )}

      {/* Return-to-Draft dialog — captures a reason + category when a card is
          dragged backwards into Draft.
          Conditional mount (not just visible={false}): Syncfusion's DialogComponent
          portals its overlay wrapper into a global container on first render even
          when `visible` is false, which detaches a DOM anchor from the React fiber tree
          and breaks commitPlacement for adjacent siblings (the
          "insertBefore: node is not a child" crash). Only mount when needed — same
          pattern as DocumentsPage preview dialog. */}
      {returnDialog !== null && (
        <ReturnToDraftDialog
          open={true}
          contractId={returnDialog.contractId}
          fromStage={returnDialog.fromStage}
          reason={returnReason}
          category={returnCategory}
          categories={RETURN_CATEGORIES}
          onReasonChange={setReturnReason}
          onCategoryChange={setReturnCategory}
          onClose={() => setReturnDialog(null)}
          onConfirm={() => {
            setOverlay(prev => [
              ...prev,
              {
                contractId: returnDialog.contractId,
                fromStage: returnDialog.fromStage,
                toStage: 'Draft',
                movedAt: new Date().toISOString(),
                reason: returnReason.trim() || undefined,
                reasonCategory: returnCategory,
              },
            ]);
            showToast(
              'success',
              `Returned CON-${returnDialog.contractId} to Draft.`,
            );
            setReturnDialog(null);
          }}
        />
      )}

      {/* Toast notifications via Syncfusion ToastComponent. */}
      <ToastComponent
        ref={(t: ToastComponent | null) => { toastRef.current = t; }}
        id="contracts-toast"
        position={{ X: 'Center', Y: 'Bottom' }}
        showCloseButton={true}
        width={360}
      />
    </div>
  );
}

// Sub-components.

function PersonaToggle({
  persona,
  setPersona,
}: {
  persona: Persona;
  setPersona: (p: Persona) => void;
}) {
  return (
    <div
      className="persona-toggle"
      role="group"
      aria-label="Active persona"
      title="Demo-only — toggles permission denied states for the Attorney persona"
    >
      <button
        type="button"
        className={persona === 'manager' ? 'is-active' : ''}
        onClick={() => setPersona('manager')}
        aria-pressed={persona === 'manager'}
        title="Legal Ops Manager — can clear VP sign-off gate and advance to Signature"
      >
        <Briefcase size={13} aria-hidden="true" /> Manager
      </button>
      <button
        type="button"
        className={persona === 'attorney' ? 'is-active' : ''}
        onClick={() => setPersona('attorney')}
        aria-pressed={persona === 'attorney'}
        title="LegalTech Attorney — view + advance up to Internal Approval only"
      >
        <UserCog size={13} aria-hidden="true" /> Attorney
      </button>
    </div>
  );
}

function ThresholdControl({
  threshold,
  setThreshold,
}: {
  threshold: number;
  setThreshold: (n: number) => void;
}) {
  return (
    <div className="threshold-control" title="VP sign-off threshold (USD)">
      <label htmlFor="vp-threshold">
        <CircleDollarSign size={13} aria-hidden="true" /> VP gate
      </label>
      <input
        id="vp-threshold"
        type="number"
        className="threshold-input"
        min="0"
        step="5000"
        value={threshold}
        onChange={(e) => {
          const next = Number(e.target.value);
          setThreshold(Number.isFinite(next) && next >= 0 ? next : 0);
        }}
        aria-label="VP sign-off threshold in USD"
      />
    </div>
  );
}

function ContractsSkeleton() {
  return (
    <div className="contracts-skeleton" role="status" aria-label="Loading contract lifecycle board">
      <SkeletonComponent shape="Rectangle" width="100%" height="32px" />
      <div className="contracts-skeleton__columns">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="contracts-skeleton__column" key={i}>
            <SkeletonComponent shape="Text" width="60%" height="14px" />
            <SkeletonComponent shape="Rectangle" width="100%" height="72px" />
            <SkeletonComponent shape="Rectangle" width="100%" height="72px" />
            <SkeletonComponent shape="Rectangle" width="100%" height="72px" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Stage filter chips.

function ContractsFilterChips({
  filters,
  onToggle,
}: {
  filters: Filters;
  onToggle: (stages: LifecycleStage[]) => void;
}) {
  const chipData = LIFECYCLE_STAGES.map(stage => ({
    text: LIFECYCLE_STAGE_LABEL[stage],
    value: stage,
  }));

  const handleClick = (args: { index?: number }) => {
    if (typeof args?.index !== 'number') return;
    const stage = chipData[args.index].value;
    const active = filters.stages.includes(stage)
      ? filters.stages.filter(s => s !== stage)
      : [...filters.stages, stage];
    onToggle(active);
  };

  return (
    <div className="contracts-filter-chips" role="group" aria-label="Filter by lifecycle stage">
      <ChipListComponent
        id="contracts-stage-chips"
        selection="Multiple"
        cssClass="contracts-stage-chips"
        selectedChips={
          filters.stages
            .map(s => LIFECYCLE_STAGES.indexOf(s))
            .filter(i => i >= 0)
        }
        click={handleClick}
      >
        <ChipsDirective>
          {chipData.map(chip => (
            <ChipDirective
              key={chip.value}
              text={chip.text}
              value={chip.value}
              cssClass="contracts-stage-chip"
              htmlAttributes={{
                'aria-pressed': String(filters.stages.includes(chip.value)),
                'role': 'button',
                'tabindex': '0',
              }}
            />
          ))}
        </ChipsDirective>
      </ChipListComponent>
    </div>
  );
}

// Reason dialog for a return-to-draft move.

function ReturnToDraftDialog({
  open,
  contractId,
  fromStage,
  reason,
  category,
  categories,
  onReasonChange,
  onCategoryChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  contractId: string | null;
  fromStage: LifecycleStage | null;
  reason: string;
  category: string;
  categories: string[];
  onReasonChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogComponent
      id="return-to-draft-dialog"
      visible={open}
      header="Return to Draft"
      showCloseIcon={true}
      isModal={true}
      width={420}
      close={onClose}
      buttons={[
        {
          click: onClose,
          buttonModel: { cssClass: 'e-outline', content: 'Cancel' },
        },
        {
          click: onConfirm,
          buttonModel: {
            cssClass: 'e-primary',
            content: 'Confirm Return to Draft',
            isPrimary: true,
          },
        },
      ]}
    >
      <div className="return-draft-form">
        <p className="return-draft-form__intro">
          Moving <strong>CON-{contractId}</strong> back to Draft from{' '}
          {fromStage ? LIFECYCLE_STAGE_LABEL[fromStage] : '…'}.
          Please provide a reason for this regression.
        </p>
        <div className="return-draft-form__field">
          <label className="return-draft-form__label">Category</label>
          <div className="return-draft-form__categories" role="radiogroup" aria-label="Reason category">
            {categories.map(cat => (
              <label key={cat} className="return-draft-form__radio">
                <input
                  type="radio"
                  name="return-category"
                  value={cat}
                  checked={category === cat}
                  onChange={() => onCategoryChange(cat)}
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="return-draft-form__field">
          <label className="return-draft-form__label" htmlFor="return-reason">
            Reason (optional)
          </label>
          <textarea
            id="return-reason"
            className="return-draft-form__textarea"
            rows={3}
            placeholder="Explain why this contract is being returned to Draft…"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        </div>
      </div>
    </DialogComponent>
  );
}

export default ContractsPage;
