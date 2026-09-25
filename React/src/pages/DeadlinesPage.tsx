// Deadlines calendar page (KPI strip, filters, docket, scheduler).
// SOL deadlines are non-draggable. Attorney persona is view-only.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScheduleComponent, Day, Week, Month, Agenda, DragAndDrop, Resize,
  Inject, ViewsDirective, ViewDirective, ResourcesDirective, ResourceDirective,
  type ActionEventArgs,
} from '@syncfusion/ej2-react-schedule';
import { ListViewComponent } from '@syncfusion/ej2-react-lists';
import { MultiSelectComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent, ChipListComponent, ChipsDirective, ChipDirective } from '@syncfusion/ej2-react-buttons';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { SkeletonComponent, ToastUtility } from '@syncfusion/ej2-react-notifications';
import { AlertTriangle, Calendar, RefreshCw } from 'lucide-react';

import { ApiError, listDeadlines, getLookup } from '../services';
import {
  Deadline, DeadlineType, DeadlineStatus,
  DEADLINE_TYPE_LABEL, DEADLINE_STATUS_LABEL, DeadlineGroupBy,
} from '../models';
import { mapApiDeadlines } from '../utils/apiMappers';
import { KpiCard } from '../components/KpiCard';
import '../styles/DeadlinesPage.css';

// As-of date anchor for the demo (matches seed data).
const AS_OF_DATE = new Date('2026-07-28T09:00:00');
const DUE_SOON_DAYS = 7;
const UPCOMING_DAYS = 30;

// KPI traffic-light mapping to KpiCard icon tones.
type KpiTone = 'red' | 'orange' | 'blue';

// Per-type legend CSS classes (semantic-token classes only — no hex).
const TYPE_CSS: Record<DeadlineType, string> = {
  [DeadlineType.Court]:   'deadline-type--court',
  [DeadlineType.Filing]:  'deadline-type--filing',
  [DeadlineType.SOL]:     'deadline-type--sol',
  [DeadlineType.Renewal]: 'deadline-type--renewal',
};

const TYPE_ICON: Record<DeadlineType, string> = {
  [DeadlineType.Court]:   'e-icon-orders',
  [DeadlineType.Filing]:  'e-icon-doc-1',
  [DeadlineType.SOL]:     'e-icon-warning',
  [DeadlineType.Renewal]: 'e-icon-refresh',
};

// Scheduler event shape built from a Deadline.
interface DeadlineEvent {
  Id: string;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  IsAllDay: boolean;
  DeadlineType: DeadlineType;
  DeadlineStatus: DeadlineStatus;
  RiskBand: Deadline['riskBand'];
  MatterCaseNumber: string;
  MatterTitle: string;
  ContractId?: string;
  Jurisdiction: string;
  OwnerStaffId: string;
  OwnerName: string;
  Notes?: string;
  // SOL deadlines are non-draggable.
  IsReadOnly: boolean;
  cssClass: string;
  OwnerId: string;
  JurisdictionId: string;
}

interface DocketRow {
  id: string;
  text: string;
  matterNumber: string;
  matterTitle: string;
  jurisdiction: string;
  ownerName: string;
  dueDate: string;
  type: DeadlineType;
  typeLabel: string;
  riskBand: Deadline['riskBand'];
}

// Demo personas: Legal Ops (can edit) and Attorney (view-only). Client-only.
type Persona = 'LegalOps' | 'Attorney';
const PERSONA_LABEL: Record<Persona, string> = {
  LegalOps: 'Legal Ops Manager',
  Attorney: 'Attorney',
};

// Session overlay for a dragged deadline.
interface RescheduleOverlayEntry {
  deadlineId: string;
  fromISO: string;
  toISO: string;
  movedAt: string;
  movedBy: Persona;
}

type LoadState = 'loading' | 'success' | 'empty' | 'error';

export default function DeadlinesPage() {
  const navigate = useNavigate();
  const scheduleRef = useRef<ScheduleComponent | null>(null);

  const quickInfoDialogRef = useRef<DialogComponent | null>(null);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allDeadlines, setAllDeadlines] = useState<Deadline[]>([]);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);

  //---- Filter state --------------------------------------------------------
  const [typeFilter, setTypeFilter] = useState<DeadlineType[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeadlineStatus[] | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string[] | null>(null);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string[] | null>(null);

  //---- Persona (demo affordance) ------------------------------------------
  const [persona, setPersona] = useState<Persona>('LegalOps');
  const canEdit = persona === 'LegalOps';

  //---- Group-by dimension (Owner / Jurisdiction / None) -------------------
  const [groupBy, setGroupBy] = useState<DeadlineGroupBy>('None');

  //---- Quick Info popup (controlled Dialog — opened from ListView / Scheduler) -
  const [activeEvent, setActiveEvent] = useState<DeadlineEvent | null>(null);
  const [quickInfoOpen, setQuickInfoOpen] = useState(false);
  const activeEventRef = useRef<DeadlineEvent | null>(null);

  //---- Reschedule overlay (session only — never persists) -----------------
  const [overlay, setOverlay] = useState<RescheduleOverlayEntry[]>([]);

  //---- Toast helper --------------------------------------------------------
  const showToast = useCallback((kind: 'success' | 'info' | 'warning' | 'error', msg: string) => {
    ToastUtility.show({
      content: msg,
      cssClass: `e-toast-${kind} deadlines-toast`,
      timeOut: 3500,
      position: { X: 'Right', Y: 'Bottom' },
      showCloseButton: true,
    });
  }, []);

  const load = useCallback(async () => {
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const from = '2026-01-01';
      const to = '2026-12-31';
      const [rows, jur] = await Promise.all([
        listDeadlines({ from, to }),
        getLookup('jurisdictions'),
      ]);
      const mapped = mapApiDeadlines(rows ?? []);
      setAllDeadlines(mapped);
      // Prefer distinct jurisdictions from deadlines; fall back to lookup.
      const fromData = Array.from(new Set(mapped.map(d => d.jurisdiction).filter(Boolean))).sort();
      setJurisdictions(
        fromData.length > 0
          ? fromData
          : (jur ?? []).map(j => j.name).sort(),
      );
      setLoadState(mapped.length === 0 ? 'empty' : 'success');
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

  const summary = useMemo(() => {
    const total = allDeadlines.length;
    const overdue = allDeadlines.filter(d => d.status === DeadlineStatus.Overdue).length;
    const dueSoon = allDeadlines.filter(d => d.status === DeadlineStatus.DueSoon).length;
    const upcoming = allDeadlines.filter(d => d.status === DeadlineStatus.Upcoming).length;
    return { total, overdue, dueSoon, upcoming };
  }, [allDeadlines]);

  // Owners derived from deadline rows so resource IDs match filter keys.
  const owners = useMemo(() => {
    const map = new Map<string, string>();
    allDeadlines.forEach(d => {
      if (d.ownerStaffId) map.set(d.ownerStaffId, d.ownerName || d.ownerStaffId);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDeadlines]);

  //---- Filtered deadlines (applies type/status/owner/jurisdiction) --------
  const filteredDeadlines = useMemo(() => {
    return allDeadlines.filter(d => {
      if (typeFilter && !typeFilter.includes(d.type)) return false;
      if (statusFilter && !statusFilter.includes(d.status)) return false;
      if (ownerFilter && !ownerFilter.includes(d.ownerStaffId)) return false;
      if (jurisdictionFilter && !jurisdictionFilter.includes(d.jurisdiction)) return false;
      return true;
    });
  }, [allDeadlines, typeFilter, statusFilter, ownerFilter, jurisdictionFilter]);

  //---- Scheduler events (filtered) ----------------------------------------
  const scheduleEvents = useMemo<DeadlineEvent[]>(() => {
    return filteredDeadlines.map(d => {
      const end = new Date(d.dueDate);
      end.setHours(end.getHours() + 1);
      const cssParts: string[] = [
        TYPE_CSS[d.type],
        `deadline-status--${d.status.toLowerCase()}`,
        `deadline-risk--${d.riskBand}`,
      ];
      if (d.status === DeadlineStatus.Overdue) cssParts.push('deadline-overdue');
      if (d.type === DeadlineType.SOL) cssParts.push('deadline-sol');
      return {
        Id: d.id,
        Subject: d.title,
        StartTime: new Date(d.dueDate),
        EndTime: end,
        IsAllDay: true,
        DeadlineType: d.type,
        DeadlineStatus: d.status,
        RiskBand: d.riskBand,
        MatterCaseNumber: d.matterCaseNumber,
        MatterTitle: d.matterTitle,
        ContractId: d.contractId,
        Jurisdiction: d.jurisdiction,
        OwnerStaffId: d.ownerStaffId,
        OwnerName: d.ownerName,
        Notes: d.notes,
        IsReadOnly: !canEdit || d.type === DeadlineType.SOL,
        cssClass: cssParts.join(' '),
        OwnerId: d.ownerStaffId,
        JurisdictionId: d.jurisdiction,
      };
    });
  }, [filteredDeadlines, canEdit]);

  const eventSettings = useMemo(() => ({
    dataSource: scheduleEvents,
    // Custom quick-info dialog instead of the built-in editor.
    allowEditing: false,
    allowAdding: !canEdit ? false : true,
    fields: {
      id: 'Id',
      subject: { title: 'Deadline', name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      isAllDay: { name: 'IsAllDay' },
    },
  }), [scheduleEvents, canEdit]);

  // Ungrouped scheduler is full width.
  const group = useMemo(
    () => (groupBy === 'None' ? undefined : { resources: [groupBy === 'Owner' ? 'Owners' : 'Jurisdictions'] }),
    [groupBy],
  );

  const ownerResourceData = useMemo(
    () => owners.map(u => ({ OwnerText: u.name, Id: u.id, OwnerColor: 'var(--color-sf-brand-600)' })),
    [owners],
  );
  const jurisdictionResourceData = useMemo(
    () => jurisdictions.map(j => ({ JurText: j, Id: j, JurColor: 'var(--color-sf-brand-500)' })),
    [jurisdictions],
  );

  //---- Drag intercept (dragStop → overlay) --------------------------------
  const handleDragStop = useCallback((args: { data?: { [k: string]: any } | any[]; cancel?: boolean; event?: MouseEvent }) => {
    const dataAny = args.data as any;
    const ev: DeadlineEvent | undefined = Array.isArray(dataAny) ? dataAny[0] : dataAny;
    if (!ev) return;

    // Reject blocked drags (SOL is non-draggable for every persona;
    // attorney persona is view-only).
    if (ev.DeadlineType === DeadlineType.SOL) {
      args.cancel = true;
      showToast('warning', 'Statute of Limitations is a computed deadline — not movable.');
      return;
    }
    if (!canEdit) {
      args.cancel = true;
      showToast('info', 'Reschedule requires Legal Ops — request via the Matter.');
      return;
    }

    // Persist the simulated move to the session overlay.
    const fromISO = ev.StartTime instanceof Date ? ev.StartTime.toISOString() : String(ev.StartTime);
    const toISO = (args as any)?.event?.StartTime instanceof Date
      ? (args as any).event.StartTime.toISOString()
      : new Date().toISOString();
    setOverlay(prev => [
      ...prev,
      {
        deadlineId: ev.Id,
        fromISO,
        toISO,
        movedAt: new Date().toISOString(),
        movedBy: persona,
      },
    ]);
    showToast(
      'success',
      `Rescheduled "${ev.Subject}".`,
    );
  }, [canEdit, persona, showToast]);

  // Block drag entirely for read-only events at the actionBegin level as a
  // belt-and-suspenders (e.g. SOL bracelets via Resize too).
  const handleActionBegin = useCallback((args: ActionEventArgs) => {
    if (args.requestType === 'eventDrag' || args.requestType === 'eventResize') {
      const dataAny = args.data as any;
      const ev: DeadlineEvent | undefined = Array.isArray(dataAny) ? dataAny[0] : dataAny;
      if (ev && ev.IsReadOnly) {
        args.cancel = true;
      }
    }
  }, []);

  //---- Quick Info popup (custom Dialog instead of default editor) ---------
  const openQuickInfo = useCallback((ev: DeadlineEvent) => {
    activeEventRef.current = ev;
    setActiveEvent(ev);
    setQuickInfoOpen(true);
  }, []);

  const closeQuickInfo = useCallback(() => {
    setQuickInfoOpen(false);
  }, []);

  const handleEventClick = useCallback((args: { event?: any }) => {
    const ev = args.event as DeadlineEvent | undefined;
    if (!ev) return;
    openQuickInfo(ev);
  }, [openQuickInfo]);

  const daysOverdueOrUntil = useCallback((ev: DeadlineEvent): string => {
    const ms = ev.StartTime.getTime() - AS_OF_DATE.getTime();
    const days = Math.round(ms / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Due today';
    return `Due in ${days} day${days === 1 ? '' : 's'}`;
  }, []);

  //---- KPI click-throughs (status filter on the Scheduler) ----------------
  const applyStatusFilter = useCallback((status: DeadlineStatus | null) => {
    setStatusFilter(status ? [status] : null);
  }, []);

  //---- Type-key chip toggle (key doubles as filter) -----------------------
  const toggleTypeChip = useCallback((t: DeadlineType) => {
    setTypeFilter(prev => {
      if (!prev) return [t];
      return prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
    });
  }, []);

  const resetFilters = useCallback(() => {
    setTypeFilter(null);
    setStatusFilter(null);
    setOwnerFilter(null);
    setJurisdictionFilter(null);
  }, []);

  //---- Type color-key counts (derive from the filter result) --------------
  const typeCounts = useMemo(() => {
    const map: Record<DeadlineType, number> = {
      [DeadlineType.Court]: 0,
      [DeadlineType.Filing]: 0,
      [DeadlineType.SOL]: 0,
      [DeadlineType.Renewal]: 0,
    };
    filteredDeadlines.forEach(d => { map[d.type]++; });
    return map;
  }, [filteredDeadlines]);

  //---- Upcoming docket (Next-30-days DueSoon / Upcoming list) ------------
  const upcomingDocket = useMemo(() => {
    const from = new Date(AS_OF_DATE);
    from.setHours(0, 0, 0, 0);
    const to = new Date(AS_OF_DATE);
    to.setDate(to.getDate() + UPCOMING_DAYS);
    return allDeadlines.filter(d => {
      if (d.status !== DeadlineStatus.DueSoon && d.status !== DeadlineStatus.Upcoming) return false;
      return d.dueDate >= from && d.dueDate <= to;
    });
  }, [allDeadlines]);

  const listViewData = useMemo<DocketRow[]>(
    () =>
      upcomingDocket
        .slice()
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .map(d => ({
          id: d.id,
          text: d.title,
          matterNumber: d.matterCaseNumber,
          matterTitle: d.matterTitle,
          jurisdiction: d.jurisdiction,
          ownerName: d.ownerName,
          dueDate: d.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          type: d.type,
          typeLabel: DEADLINE_TYPE_LABEL[d.type],
          riskBand: d.riskBand,
        })),
    [upcomingDocket],
  );

  const handleDocketRowClick = useCallback((args: { data?: DocketRow; text?: string }) => {
    const data = args?.data;
    if (!data?.id) return;
    const ev = scheduleEvents.find(e => e.Id === data.id);
    if (ev) {
      openQuickInfo(ev);
      return;
    }
    const deadline = allDeadlines.find(d => d.id === data.id);
    if (!deadline) return;
    openQuickInfo({
      Id: deadline.id,
      Subject: deadline.title,
      StartTime: new Date(deadline.dueDate),
      EndTime: new Date(deadline.dueDate),
      IsAllDay: true,
      DeadlineType: deadline.type,
      DeadlineStatus: deadline.status,
      RiskBand: deadline.riskBand,
      MatterCaseNumber: deadline.matterCaseNumber,
      MatterTitle: deadline.matterTitle,
      ContractId: deadline.contractId,
      Jurisdiction: deadline.jurisdiction,
      OwnerStaffId: deadline.ownerStaffId,
      OwnerName: deadline.ownerName,
      Notes: deadline.notes,
      IsReadOnly: !canEdit || deadline.type === DeadlineType.SOL,
      cssClass: '',
      OwnerId: deadline.ownerStaffId,
      JurisdictionId: deadline.jurisdiction,
    });
  }, [scheduleEvents, allDeadlines, canEdit, openQuickInfo]);

  /** Docket list row. */
  const docketItemTemplate = useCallback((data: DocketRow): ReactElement => (
    <div className="docket-item">
      <div className="docket-item__top">
        <span className="docket-item__matter">{data.matterNumber}</span>
        <span className="docket-item__date">{data.dueDate}</span>
      </div>
      <div className="docket-item__title" title={data.text}>{data.text}</div>
      <div className="docket-item__meta">
        <span className={`docket-item__type ${TYPE_CSS[data.type]}`}>
          <span className={`e-icons ${TYPE_ICON[data.type]}`} aria-hidden="true" />
          {data.typeLabel}
        </span>
        <span className={`docket-item__risk docket-item__risk--${data.riskBand}`}>
          {data.riskBand}
        </span>
      </div>
    </div>
  ), []);

  //---- Toolbar handlers ----------------------------------------------------
  const goToday = useCallback(() => {
    if (scheduleRef.current) {
      (scheduleRef.current as any).selectedDate = new Date();
      (scheduleRef.current as any).dataBind();
    }
  }, []);

  const printCalendar = useCallback(() => {
    scheduleRef.current?.print();
  }, []);

  const exportICal = useCallback(() => {
    (scheduleRef.current as any)?.exportToICalendar?.();
  }, []);

  //---- Quick Info action: open matter / contract --------------------------
  const openMatter = useCallback(() => {
    const ev = activeEventRef.current;
    const mn = ev?.MatterCaseNumber?.trim();
    const path = mn ? `/matters/${mn}` : '/matters';
    closeQuickInfo();
    navigate(path);
  }, [navigate, closeQuickInfo]);

  // Open Matter from the portaled quick-info dialog.
  useEffect(() => {
    const onDocClick = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('#deadlines-open-matter') || el.closest('.deadlines-quickinfo .deadlines-link')) {
        openMatter();
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [openMatter]);

  const openContract = useCallback(() => {
    if (!activeEvent?.ContractId) return;
    navigate('/contracts');
  }, [activeEvent, navigate]);

  //---- Quick Info actions (Legal Ops only) -------------------------------
  const rescheduleViaQuickInfo = useCallback(() => {
    if (!activeEvent || !canEdit) return;
    if (activeEvent.DeadlineType === DeadlineType.SOL) {
      showToast('warning', 'Statute of Limitations is a computed deadline — not movable.');
      return;
    }
    // For demo, simply opening the overlay record with today's date-time.
    // The full edit-Date dialog will be wired in a follow-up pass.
    setOverlay(prev => [
      ...prev,
      {
        deadlineId: activeEvent.Id,
        fromISO: activeEvent.StartTime.toISOString(),
        toISO: activeEvent.StartTime.toISOString(),
        movedAt: new Date().toISOString(),
        movedBy: persona,
      },
    ]);
    showToast('success', 'Reschedule captured.');
    closeQuickInfo();
  }, [activeEvent, canEdit, persona, showToast, closeQuickInfo]);

  const markComplete = useCallback(() => {
    if (!activeEvent || !canEdit) return;
    // Simulated write — we only record a status change in the overlay.
    setOverlay(prev => [
      ...prev,
      {
        deadlineId: activeEvent.Id,
        fromISO: activeEvent.DeadlineStatus,
        toISO: DeadlineStatus.Completed,
        movedAt: new Date().toISOString(),
        movedBy: persona,
      } as any,
    ]);
    showToast('success', 'Marked complete.');
    closeQuickInfo();
  }, [activeEvent, canEdit, persona, showToast, closeQuickInfo]);

  //---- Lookup arrays for the filter MultiSelects (Type is via legend chips) -
  const statusListItems = useMemo(
    () => Object.values(DeadlineStatus).map(s => ({ id: s, text: DEADLINE_STATUS_LABEL[s] })),
    [],
  );
  const ownerListItems = useMemo(
    () => owners.map(o => ({ id: o.id, text: o.name })),
    [owners],
  );
  const jurisdictionListItems = useMemo(
    () => jurisdictions.map(j => ({ id: j, text: j })),
    [jurisdictions],
  );

  //---- Session changes chip (overlay count) -------------------------------
  const sessionChangesCount = overlay.length;
  const resetSession = useCallback(() => setOverlay([]), []);

  //---- KPI definitions (no progress bar; just title + value) -------------
  const kpis: { title: string; value: number; tone: KpiTone; onClick: () => void; }[] = [
    {
      title: 'Overdue', value: summary.overdue, tone: 'red',
      onClick: () => applyStatusFilter(DeadlineStatus.Overdue),
    },
    {
      title: `Due ≤ ${DUE_SOON_DAYS}d`, value: summary.dueSoon, tone: 'orange',
      onClick: () => applyStatusFilter(DeadlineStatus.DueSoon),
    },
    {
      title: 'Open', value: summary.total, tone: 'blue',
      onClick: () => applyStatusFilter(null),
    },
  ];

  //---- Any filters applied? (drives "Reset filters" chip + filtered-empty) -
  const hasFilters =
    !!typeFilter || !!statusFilter || !!ownerFilter || !!jurisdictionFilter;
  const filteredEmpty = filteredDeadlines.length === 0 && hasFilters;

  if (loadState === 'error') {
    return (
      <div className="page deadlines-page">
        <div className="page-header">
          <div>
            <h1>Deadlines &amp; Calendar</h1>
            <p className="page-subtitle">Court / Filing / Statute of Limitations / Renewal — across all matters and contracts</p>
          </div>
          <div className="deadlines-header__actions">
            <div className="deadlines-persona" role="group" aria-label="Demo persona">
              <ButtonComponent
                cssClass="e-flat"
                type={persona === 'LegalOps' ? 'primary' : 'flat'}
                onClick={() => setPersona('LegalOps')}
                disabled={persona === 'LegalOps'}
              >
                Legal Ops
              </ButtonComponent>
              <ButtonComponent
                cssClass="e-flat"
                type={persona === 'Attorney' ? 'primary' : 'flat'}
                onClick={() => setPersona('Attorney')}
                disabled={persona === 'Attorney'}
              >
                Attorney
              </ButtonComponent>
            </div>
            {sessionChangesCount > 0 && (
              <button className="deadlines-session-chip" onClick={resetSession} title="Reset session changes">
                <span className="e-icons e-circle-trangle-2-a" aria-hidden="true" />
                Session changes: {sessionChangesCount}
              </button>
            )}
          </div>
        </div>
        <div className="dashboard-banner dashboard-banner--error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMsg ?? 'Could not load deadlines.'}</span>
          <button type="button" className="banner-retry" onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (loadState === 'loading') {
    return (
      <div className="page deadlines-page">
        <div className="page-header">
          <div>
            <h1>Deadlines &amp; Calendar</h1>
            <p className="page-subtitle">Loading docket…</p>
          </div>
        </div>
        <div className="kpi-cards">
          {[0, 1, 2].map(i => (
            <div className="kpi-card" key={i}>
              <SkeletonComponent shape="Rectangle" width="100%" height={72} />
            </div>
          ))}
        </div>
        <SkeletonComponent shape="Rectangle" width="100%" height={420} />
      </div>
    );
  }

  return (
    <div className="page deadlines-page">
      <div className="page-header">
        <div>
          <h1>Deadlines &amp; Calendar</h1>
          <p className="page-subtitle">Court / Filing / Statute of Limitations / Renewal — across all matters and contracts</p>
        </div>

        <div className="deadlines-header__actions">
          {/* Persona switcher (demo affordance; no server call) */}
          <div className="deadlines-persona" role="group" aria-label="Demo persona">
            <ButtonComponent
              cssClass="e-flat"
              type={persona === 'LegalOps' ? 'primary' : 'flat'}
              onClick={() => setPersona('LegalOps')}
              disabled={persona === 'LegalOps'}
            >
              Legal Ops
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-flat"
              type={persona === 'Attorney' ? 'primary' : 'flat'}
              onClick={() => setPersona('Attorney')}
              disabled={persona === 'Attorney'}
            >
              Attorney
            </ButtonComponent>
          </div>

          {sessionChangesCount > 0 && (
            <button className="deadlines-session-chip" onClick={resetSession} title="Reset session changes">
              <span className="e-icons e-circle-trangle-2-a" aria-hidden="true" />
              Session changes: {sessionChangesCount}
            </button>
          )}
        </div>
      </div>

      {/* ===== KPI strip ===== */}
      <div className="deadlines-kpi-strip" role="region" aria-label="Deadlines KPI strip">
        {kpis.map(k => (
          <KpiCard
            key={k.title}
            title={k.title}
            value={k.value}
            icon={<Calendar size={18} aria-hidden="true" />}
            iconTone={k.tone}
            onClick={k.onClick}
          />
        ))}
      </div>

      {/* ===== Filter row (Type is toggled via legend chips below) ===== */}
      <div className="deadlines-filter-row" role="search" aria-label="Filter deadlines">
        <div className="deadlines-filter-row__fields">
          <div className="deadlines-filter-field">
            <MultiSelectComponent
              id="dl-status-filter"
              placeholder="Status"
              dataSource={statusListItems}
              fields={{ text: 'text', value: 'id' }}
              mode="CheckBox"
              value={statusFilter ?? []}
              change={(e: any) => setStatusFilter((e.value as DeadlineStatus[]) ?? null)}
              showClearButton
              floatLabelType="Never"
              cssClass="deadlines-filter-input"
              width="100%"
              popupWidth="100%"
              popupHeight="240px"
              aria-label="Filter by status"
            />
          </div>
          <div className="deadlines-filter-field">
            <MultiSelectComponent
              id="dl-owner-filter"
              placeholder="Owner"
              dataSource={ownerListItems}
              fields={{ text: 'text', value: 'id' }}
              mode="CheckBox"
              value={ownerFilter ?? []}
              change={(e: any) => setOwnerFilter((e.value as string[]) ?? null)}
              showClearButton
              floatLabelType="Never"
              cssClass="deadlines-filter-input"
              width="100%"
              popupWidth="100%"
              popupHeight="240px"
              aria-label="Filter by owner"
            />
          </div>
          <div className="deadlines-filter-field">
            <MultiSelectComponent
              id="dl-jurisdiction-filter"
              placeholder="Jurisdiction"
              dataSource={jurisdictionListItems}
              fields={{ text: 'text', value: 'id' }}
              mode="CheckBox"
              value={jurisdictionFilter ?? []}
              change={(e: any) => setJurisdictionFilter((e.value as string[]) ?? null)}
              showClearButton
              floatLabelType="Never"
              cssClass="deadlines-filter-input"
              width="100%"
              popupWidth="100%"
              popupHeight="240px"
              aria-label="Filter by jurisdiction"
            />
          </div>
        </div>
        {hasFilters && (
          <div className="deadlines-filter-row__actions">
            <button className="deadlines-reset-chip" onClick={resetFilters} title="Clear all filters">
              <span className="e-icons e-close" aria-hidden="true" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* ===== Type color-key (legend) — Syncfusion ChipList, filter chip mode ===== */}
      <div className="deadlines-type-key" role="region" aria-label="Deadline type legend">
        <ChipListComponent
          id="deadlines-type-key"
          selection="Multiple"
          cssClass="deadlines-type-key__list"
          selectedChips={
            (typeFilter ?? [])
              .map(t => (Object.keys(TYPE_CSS) as DeadlineType[]).indexOf(t))
              .filter(i => i >= 0)
          }
          click={(e: { index?: number; cancel?: boolean }) => {
            if (typeof e?.index !== 'number') return;
            const order = Object.keys(TYPE_CSS) as DeadlineType[];
            const t = order[e.index];
            if (t) toggleTypeChip(t);
          }}
        >
          <ChipsDirective>
            {(Object.keys(TYPE_CSS) as DeadlineType[]).map((t) => {
              const hasOverdue = filteredDeadlines.some(
                d => d.type === t && d.status === DeadlineStatus.Overdue);
              const chipClass = [
                'deadlines-type-key__chip',
                TYPE_CSS[t],
                hasOverdue ? 'is-overdue' : '',
              ].join(' ').trim();
              return (
                <ChipDirective
                  key={t}
                  text={`${DEADLINE_TYPE_LABEL[t]} ${typeCounts[t]}`}
                  cssClass={chipClass}
                  leadingIconCss={`e-icons ${TYPE_ICON[t]}`}
                  htmlAttributes={{
                    'aria-label': `${DEADLINE_TYPE_LABEL[t]}: ${typeCounts[t]} (toggle filter)`,
                    'aria-pressed': String(typeFilter?.includes(t) ?? false),
                    'role': 'button',
                    'tabindex': '0',
                  }}
                />
              );
            })}
          </ChipsDirective>
        </ChipListComponent>
      </div>

      {/* ===== Upcoming docket + Calendar grid ===== */}
      <div className="deadlines-grid">
        {/* Upcoming docket (ListView, next 30 days) */}
        <aside className="deadlines-docket" aria-label="Upcoming docket — next 30 days">
          <div className="deadlines-docket__header">
            <h2>Upcoming · Next {UPCOMING_DAYS}d</h2>
            <span className="deadlines-docket__count">{upcomingDocket.length}</span>
          </div>
          {listViewData.length === 0 ? (
            <div className="deadlines-empty deadlines-empty--inline">
              No due-soon deadlines in the next {UPCOMING_DAYS} days.
            </div>
          ) : (
            <ListViewComponent
              dataSource={listViewData as any[]}
              fields={{ text: 'text', id: 'id' }}
              cssClass="deadlines-docket__list"
              template={docketItemTemplate as any}
              showIcon={false}
              select={(e: any) => {
                const raw = e?.data;
                const data: DocketRow | undefined = typeof raw === 'string'
                  ? listViewData.find((row) => row.id === raw || row.text === raw)
                  : raw;
                if (data) handleDocketRowClick({ data });
              }}
            />
          )}
        </aside>

        {/* Scheduler */}
        <section className="deadlines-calendar" aria-label="Deadlines calendar">
          <div className="deadlines-calendar__toolbar">
            <ButtonComponent cssClass="e-flat" onClick={goToday}>
              <span className="e-icons e-icon-today" aria-hidden="true" /> Today
            </ButtonComponent>
            <ButtonComponent cssClass="e-flat" onClick={printCalendar}>
              <span className="e-icons e-icon-print1" aria-hidden="true" /> Print
            </ButtonComponent>
            <ButtonComponent cssClass="e-flat" onClick={exportICal}>
              <span className="e-icons e-icon-export-1" aria-hidden="true" /> Export iCal
            </ButtonComponent>

            <div className="deadlines-group-by" role="group" aria-label="Group calendars by">
              <span className="deadlines-group-by__label">Group by</span>
              <div className="e-btn-group">
                <ButtonComponent
                  cssClass={groupBy === 'None' ? 'e-primary' : 'e-flat'}
                  onClick={() => setGroupBy('None')}
                  disabled={groupBy === 'None'}
                >
                  None
                </ButtonComponent>
                <ButtonComponent
                  cssClass={groupBy === 'Owner' ? 'e-primary' : 'e-flat'}
                  onClick={() => setGroupBy('Owner')}
                  disabled={groupBy === 'Owner'}
                >
                  Owner
                </ButtonComponent>
                <ButtonComponent
                  cssClass={groupBy === 'Jurisdiction' ? 'e-primary' : 'e-flat'}
                  onClick={() => setGroupBy('Jurisdiction')}
                  disabled={groupBy === 'Jurisdiction'}
                >
                  Jurisdiction
                </ButtonComponent>
              </div>
            </div>

            {canEdit && (
              <ButtonComponent cssClass="e-flat deadlines-calendar__new" disabled>
                <span className="e-icons e-icon-plus" aria-hidden="true" /> New Deadline
              </ButtonComponent>
            )}
          </div>

          {filteredEmpty ? (
            <div className="deadlines-empty deadlines-empty--filtered" role="status">
              <p>No deadlines match the current filters.</p>
              <ButtonComponent cssClass="e-flat e-primary" onClick={resetFilters}>
                Clear filters
              </ButtonComponent>
            </div>
          ) : filteredDeadlines.length === 0 ? (
            <div className="deadlines-empty" role="status">
              <p>No deadlines in this range — adjust filters or jump to today.</p>
              <ButtonComponent cssClass="e-flat e-primary" onClick={goToday}>
                Jump to today
              </ButtonComponent>
            </div>
          ) : (
            <ScheduleComponent
              ref={(r: ScheduleComponent | null) => { scheduleRef.current = r; }}
              height="100%"
              width="100%"
              selectedDate={AS_OF_DATE}
              currentView="Month"
              eventSettings={eventSettings}
              group={group}
              enableAdaptiveUI
              showQuickInfo={false}
              allowDragAndDrop={canEdit}
              allowResizing={canEdit}
              actionBegin={handleActionBegin}
              dragStop={handleDragStop as any}
              eventClick={handleEventClick as any}
              cssClass="deadlines-scheduler"
            >
              <ViewsDirective>
                <ViewDirective option="Month" />
                <ViewDirective option="Week" />
                <ViewDirective option="Agenda" />
              </ViewsDirective>

              {/* Resources — only one is referenced by `group` at a time */}
              <ResourcesDirective>
                <ResourceDirective
                  field="OwnerId"
                  title="Owner"
                  name="Owners"
                  allowMultiple={false}
                  dataSource={ownerResourceData}
                  textField="OwnerText"
                  idField="Id"
                  colorField="OwnerColor"
                />
                <ResourceDirective
                  field="JurisdictionId"
                  title="Jurisdiction"
                  name="Jurisdictions"
                  allowMultiple={false}
                  dataSource={jurisdictionResourceData}
                  textField="JurText"
                  idField="Id"
                  colorField="JurColor"
                />
              </ResourcesDirective>

              <Inject services={[Day, Week, Month, Agenda, DragAndDrop, Resize]} />
            </ScheduleComponent>
          )}
          {!canEdit && (
            <div className="deadlines-permission-note" role="note">
              Attorney persona is view-only — reschedule, mark-complete, and create
              actions are disabled. SOL deadlines are non-draggable for every persona.
            </div>
          )}
        </section>
      </div>

      {/* ===== Custom Quick Info Dialog (opened from ListView / Scheduler) ===== */}
      <DialogComponent
        ref={(r: DialogComponent | null) => { quickInfoDialogRef.current = r; }}
        header={activeEvent?.Subject ?? 'Deadline'}
        visible={quickInfoOpen}
        width="440px"
        isModal
        showCloseIcon
        closeOnEscape
        close={closeQuickInfo}
        cssClass="deadlines-quickinfo"
        buttons={[]}
        animationSettings={{ effect: 'Fade', duration: 200, delay: 0 }}
      >
        {activeEvent ? (
          <div className="deadlines-quickinfo__body">
            <div className="deadlines-quickinfo__grid">
              <div className="deadlines-quickinfo__field">
                <span className="deadlines-quickinfo__label">Type</span>
                <span className={`deadlines-quickinfo__chip ${TYPE_CSS[activeEvent.DeadlineType]}`}>
                  <span className={`e-icons ${TYPE_ICON[activeEvent.DeadlineType]}`} aria-hidden="true" />
                  {DEADLINE_TYPE_LABEL[activeEvent.DeadlineType]}
                </span>
              </div>
              <div className="deadlines-quickinfo__field">
                <span className="deadlines-quickinfo__label">Status</span>
                <span className={`deadlines-quickinfo__status deadline-status--${activeEvent.DeadlineStatus.toLowerCase()}`}>
                  {DEADLINE_STATUS_LABEL[activeEvent.DeadlineStatus]}
                </span>
              </div>
              <div className="deadlines-quickinfo__field deadlines-quickinfo__field--full">
                <span className="deadlines-quickinfo__label">Matter</span>
                <button type="button" className="deadlines-link" onClick={openMatter}>
                  {activeEvent.MatterCaseNumber} — {activeEvent.MatterTitle}
                </button>
              </div>
              {activeEvent.ContractId && (
                <div className="deadlines-quickinfo__field deadlines-quickinfo__field--full">
                  <span className="deadlines-quickinfo__label">Contract</span>
                  <button type="button" className="deadlines-link" onClick={openContract}>
                    View on contracts board
                  </button>
                </div>
              )}
              <div className="deadlines-quickinfo__field">
                <span className="deadlines-quickinfo__label">Due</span>
                <span className="deadlines-quickinfo__value">{daysOverdueOrUntil(activeEvent)}</span>
              </div>
              <div className="deadlines-quickinfo__field">
                <span className="deadlines-quickinfo__label">Jurisdiction</span>
                <span className="deadlines-quickinfo__value">{activeEvent.Jurisdiction}</span>
              </div>
              <div className="deadlines-quickinfo__field deadlines-quickinfo__field--full">
                <span className="deadlines-quickinfo__label">Owner</span>
                <span className="deadlines-quickinfo__value">{activeEvent.OwnerName}</span>
              </div>
              {activeEvent.Notes && (
                <div className="deadlines-quickinfo__field deadlines-quickinfo__field--full">
                  <span className="deadlines-quickinfo__label">Notes</span>
                  <p className="deadlines-quickinfo__notes">{activeEvent.Notes}</p>
                </div>
              )}
            </div>

            <div className="deadlines-quickinfo__actions">
              <ButtonComponent id="deadlines-open-matter" cssClass="e-primary" onClick={openMatter}>
                Open Matter
              </ButtonComponent>
              {activeEvent.ContractId && (
                <ButtonComponent cssClass="e-outline" onClick={openContract}>View Contracts</ButtonComponent>
              )}
              <ButtonComponent
                cssClass="e-outline"
                disabled={!canEdit || activeEvent.DeadlineType === DeadlineType.SOL}
                onClick={rescheduleViaQuickInfo}
              >
                Reschedule
              </ButtonComponent>
              <ButtonComponent cssClass="e-outline" disabled={!canEdit} onClick={markComplete}>
                Mark Complete
              </ButtonComponent>
            </div>
            {!canEdit && (
              <p className="deadlines-permission-note" role="note">
                Attorney persona is view-only — these actions are disabled.
              </p>
            )}
          </div>
        ) : (
          <div className="deadlines-quickinfo__body">
            <p className="deadlines-quickinfo__value">No deadline selected.</p>
          </div>
        )}
      </DialogComponent>

    </div>
  );
}
