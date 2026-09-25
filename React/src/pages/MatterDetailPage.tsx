import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, Calendar, DollarSign, User, AlertTriangle,
  RefreshCw, FileText, Clock, Building2, Gavel, Scale, Search,
  CalendarClock, ShieldAlert, Ban, MapPin, CheckCircle2, Landmark,
  Hourglass, CircleDot,
} from 'lucide-react';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import {
  GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort,
} from '@syncfusion/ej2-react-grids';
import {
  TimelineComponent, ItemsDirective, ItemDirective,
} from '@syncfusion/ej2-react-layouts';
import {
  TabComponent, TabItemDirective, TabItemsDirective,
  BreadcrumbComponent, BreadcrumbItemsDirective, BreadcrumbItemDirective,
} from '@syncfusion/ej2-react-navigations';
import type { BreadcrumbClickEventArgs } from '@syncfusion/ej2-navigations';
import {
  ApiError, getMatter, getMatterTimeline, getMatterDocuments, listContracts,
} from '../services';
import type {
  MatterDetail, DeadlineSummary, DocumentNode, ContractSummary,
} from '../models/api';
import '../styles/Pages.css';

type LoadState = 'loading' | 'success' | 'notfound' | 'error';

type TimelineTone = 'completed' | 'overdue' | 'due-soon' | 'upcoming' | 'waived' | 'default';

function normalizeKey(value: string | undefined | null): string {
  return (value ?? '').toLowerCase().replace(/[\s_-]+/g, '');
}

function timelineTone(status: string): TimelineTone {
  const key = normalizeKey(status);
  if (key.includes('complete') || key === 'done' || key === 'closed') return 'completed';
  if (key.includes('overdue') || key.includes('missed') || key.includes('late')) return 'overdue';
  if (key.includes('duesoon') || key.includes('imminent') || key.includes('urgent')) return 'due-soon';
  if (key.includes('waiv')) return 'waived';
  if (key.includes('upcoming') || key.includes('pending') || key.includes('open') || key.includes('scheduled')) {
    return 'upcoming';
  }
  return 'default';
}

function formatDeadlineStatus(status: string): string {
  const tone = timelineTone(status);
  if (tone === 'due-soon') return 'Due Soon';
  if (tone === 'completed') return 'Completed';
  if (tone === 'overdue') return 'Overdue';
  if (tone === 'waived') return 'Waived';
  if (tone === 'upcoming') return 'Upcoming';
  if (!status) return 'Scheduled';
  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** Display label for a deadline type. */
function formatDeadlineType(deadlineType: string): string {
  if (!deadlineType) return 'Deadline';
  const key = normalizeKey(deadlineType);
  if (key === 'sol' || key.includes('statuteoflimitation')) return 'SOL';
  if (key.includes('courtdate') || key === 'court') return 'Court';
  if (key.includes('filingwindow') || key === 'filing') return 'Filing';
  if (key.includes('motionresponse')) return 'Motion';
  return deadlineType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function deadlineTypeIcon(deadlineType: string): ReactNode {
  const key = normalizeKey(deadlineType);
  const props = { size: 16, 'aria-hidden': true as const, strokeWidth: 2 };
  if (key.includes('court') || key.includes('hearing') || key.includes('trial') || key.includes('appearance')) {
    return <Gavel {...props} />;
  }
  if (key.includes('filing') || key.includes('motion') || key.includes('brief') || key.includes('plead')) {
    return <FileText {...props} />;
  }
  if (key.includes('discover') || key.includes('deposition') || key.includes('interrogator')) {
    return <Search {...props} />;
  }
  if (key.includes('renew') || key.includes('contract')) {
    return <RefreshCw {...props} />;
  }
  if (key.includes('sol') || key.includes('statute') || key.includes('limitation')) {
    return <ShieldAlert {...props} />;
  }
  if (key.includes('regulatory') || key.includes('compliance') || key.includes('agency')) {
    return <Landmark {...props} />;
  }
  if (key.includes('arbitration') || key.includes('mediation') || key.includes('settlement')) {
    return <Scale {...props} />;
  }
  return <CalendarClock {...props} />;
}

function statusIcon(status: string): ReactNode {
  const tone = timelineTone(status);
  const props = { size: 13, 'aria-hidden': true as const, strokeWidth: 2.25 };
  switch (tone) {
    case 'completed':
      return <CheckCircle2 {...props} />;
    case 'overdue':
      return <AlertTriangle {...props} />;
    case 'due-soon':
      return <Hourglass {...props} />;
    case 'waived':
      return <Ban {...props} />;
    case 'upcoming':
      return <CircleDot {...props} />;
    default:
      return <Clock {...props} />;
  }
}

function formatTimelineDate(dueDate: string): string {
  if (!dueDate) return 'Date pending';
  const date = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dueDate;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MatterDetailPage() {
  const { matterNumber } = useParams<{ matterNumber: string }>();
  const navigate = useNavigate();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matter, setMatter] = useState<MatterDetail | null>(null);
  const [timeline, setTimeline] = useState<DeadlineSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentNode[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);

  const load = useCallback(async () => {
    if (!matterNumber) {
      setLoadState('notfound');
      return;
    }
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const detail = await getMatter(matterNumber);
      const [tl, docs, contractsRes] = await Promise.all([
        getMatterTimeline(matterNumber),
        getMatterDocuments(matterNumber),
        listContracts({ matterNumber, page: 1, pageSize: 50 }),
      ]);
      setMatter(detail);
      setTimeline(tl ?? []);
      setDocuments(docs ?? []);
      setContracts(contractsRes.items ?? []);
      setLoadState('success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLoadState('notfound');
        return;
      }
      const message = err instanceof ApiError
        ? `${err.message}${err.problemTitle ? ` — ${err.problemTitle}` : ''}`
        : err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      setLoadState('error');
    }
  }, [matterNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const fmtMoney = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  const onBreadcrumbClick = useCallback((args: BreadcrumbClickEventArgs) => {
    if (args.item?.url) {
      args.cancel = true;
      navigate(args.item.url);
    }
  }, [navigate]);

  const nextDeadlineLabel = useMemo(() => {
    if (!matter?.nextDeadline) return 'None';
    return `${matter.nextDeadline.title} · ${matter.nextDeadline.dueDate}`;
  }, [matter]);

  const sortedTimeline = useMemo(() => {
    return [...timeline].sort((a, b) => {
      const aTime = new Date(`${a.dueDate}T00:00:00`).getTime();
      const bTime = new Date(`${b.dueDate}T00:00:00`).getTime();
      const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
      const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
      return safeA - safeB;
    });
  }, [timeline]);

  if (loadState === 'loading') {
    return (
      <div className="page">
        <SkeletonComponent shape="Rectangle" width="40%" height={28} />
        <div style={{ height: 16 }} />
        <SkeletonComponent shape="Rectangle" width="100%" height={180} />
        <div style={{ height: 16 }} />
        <SkeletonComponent shape="Rectangle" width="100%" height={240} />
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{matterNumber || 'Matter'}</h1>
            <p className="page-subtitle">Matter detail</p>
          </div>
        </div>
        <div className="dashboard-banner dashboard-banner--error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMsg ?? 'Could not load matter detail.'}</span>
          <button type="button" className="banner-retry" onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (loadState === 'notfound' || !matter) {
    return (
      <div className="page">
        <div className="panel" role="alert">
          <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} aria-hidden="true" />
            <span>Matter <strong>{matterNumber}</strong> was not found.</span>
            <Link to="/matters" className="btn btn-secondary">Back to Matters</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <BreadcrumbComponent
        className="matter-breadcrumb"
        enableNavigation={false}
        itemClick={onBreadcrumbClick}
      >
        <BreadcrumbItemsDirective>
          <BreadcrumbItemDirective iconCss="e-icons e-home" text="Matters" url="/matters" />
          <BreadcrumbItemDirective text={matter.matterNumber} />
        </BreadcrumbItemsDirective>
      </BreadcrumbComponent>

      <div className="page-header">
        <div>
          <h1>{matter.title}</h1>
          <p className="page-subtitle">
            {matter.matterNumber} · {matter.practiceArea} · {matter.client}
          </p>
        </div>
      </div>

      <div className="panel matter-summary">
        <div className="panel-body">
          <div className="matter-summary-grid">
            <div className="summary-tile">
              <div className="summary-tile-icon" aria-hidden="true"><Briefcase size={18} /></div>
              <div>
                <span className="summary-tile-label">Status</span>
                <span className={`status-badge status-${matter.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {matter.status}
                </span>
              </div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-icon" aria-hidden="true"><User size={18} /></div>
              <div>
                <span className="summary-tile-label">Responsible Attorney</span>
                <span className="summary-tile-value">{matter.responsibleAttorney}</span>
              </div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-icon" aria-hidden="true"><Building2 size={18} /></div>
              <div>
                <span className="summary-tile-label">Firm</span>
                <span className="summary-tile-value">{matter.firm || '—'}{matter.firmTier ? ` (${matter.firmTier})` : ''}</span>
              </div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-icon" aria-hidden="true"><DollarSign size={18} /></div>
              <div>
                <span className="summary-tile-label">Budget / Spent</span>
                <span className="summary-tile-value">
                  {fmtMoney(matter.budgetAmount)} / {fmtMoney(matter.spentAmount)}
                </span>
              </div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-icon" aria-hidden="true"><Calendar size={18} /></div>
              <div>
                <span className="summary-tile-label">Opened</span>
                <span className="summary-tile-value">
                  {new Date(`${matter.openDate}T00:00:00`).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-icon" aria-hidden="true"><Clock size={18} /></div>
              <div>
                <span className="summary-tile-label">Next Deadline</span>
                <span className="summary-tile-value">{nextDeadlineLabel}</span>
              </div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-icon" aria-hidden="true"><FileText size={18} /></div>
              <div>
                <span className="summary-tile-label">Related</span>
                <span className="summary-tile-value">
                  {matter.contractCount} contracts · {matter.documentCount} docs · {matter.invoiceCount} invoices
                </span>
              </div>
            </div>
          </div>

          <div className="matter-description">
            <h3>Description</h3>
            <p>{matter.description || 'No description provided.'}</p>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              {matter.matterType} · Risk: {matter.riskLevel} · Industry: {matter.clientIndustry}
            </p>
          </div>
        </div>
      </div>

      <TabComponent>
        <TabItemsDirective>
          <TabItemDirective
            header={{ text: `Timeline (${timeline.length})` }}
            content={() => (
              <div className="tab-content matter-timeline-tab">
                {sortedTimeline.length === 0 ? (
                  <div className="matter-timeline-empty" role="status">
                    <CalendarClock size={28} aria-hidden="true" />
                    <h3>No deadlines on the timeline</h3>
                    <p>Court dates, filings, and other matter milestones will appear here.</p>
                  </div>
                ) : (
                  <div className="matter-timeline-wrap">
                    {/*
                      Single-sided vertical rail (align After):
                      all docket content stays on the same side of the axis.
                    */}
                    <TimelineComponent
                      orientation="Vertical"
                      align="After"
                      cssClass="matter-legal-timeline"
                      aria-label={`Matter timeline with ${sortedTimeline.length} deadlines`}
                    >
                      <ItemsDirective>
                        {sortedTimeline.map((item, index) => {
                          const tone = timelineTone(item.status);
                          const dateLabel = formatTimelineDate(item.dueDate);
                          const typeLabel = formatDeadlineType(item.deadlineType);
                          const statusLabel = formatDeadlineStatus(item.status);
                          const jurisdiction = item.jurisdiction?.trim() || '—';
                          const owner = item.owner?.trim() || 'Unassigned';
                          return (
                            <ItemDirective
                              key={`${item.dueDate}-${item.title}-${index}`}
                              cssClass={`tl-item tl-item--${tone}`}
                              content={() => (
                                <article className={`tl-docket tl-docket--${tone}`}>
                                  <div className="tl-docket__icon" aria-hidden="true">
                                    {deadlineTypeIcon(item.deadlineType)}
                                  </div>
                                  <div className="tl-docket__main">
                                    <header className="tl-docket__head">
                                      <h4 className="tl-docket__title">{item.title}</h4>
                                      <span className={`tl-docket__status tl-docket__status--${tone}`}>
                                        {statusIcon(item.status)}
                                        {statusLabel}
                                      </span>
                                    </header>
                                    <ul className="tl-docket__meta">
                                      <li className="tl-docket__meta-item">
                                        <Calendar size={12} aria-hidden="true" />
                                        <time dateTime={item.dueDate || undefined}>{dateLabel}</time>
                                      </li>
                                      <li className="tl-docket__meta-item">
                                        <FileText size={12} aria-hidden="true" />
                                        <span>{typeLabel}</span>
                                      </li>
                                      <li className="tl-docket__meta-item">
                                        <MapPin size={12} aria-hidden="true" />
                                        <span>{jurisdiction}</span>
                                      </li>
                                      <li className="tl-docket__meta-item">
                                        <User size={12} aria-hidden="true" />
                                        <span>{owner}</span>
                                      </li>
                                    </ul>
                                  </div>
                                </article>
                              )}
                            />
                          );
                        })}
                      </ItemsDirective>
                    </TimelineComponent>
                  </div>
                )}
              </div>
            )}
          />
          <TabItemDirective
            header={{ text: `Contracts (${contracts.length})` }}
            content={() => (
              <div className="tab-content">
                <GridComponent dataSource={contracts} allowPaging pageSettings={{ pageSize: 10 }} allowSorting height="auto">
                  <ColumnsDirective>
                    <ColumnDirective field="contractId" headerText="ID" width="90" />
                    <ColumnDirective field="title" headerText="Title" width="260" />
                    <ColumnDirective field="contractType" headerText="Type" width="150" />
                    <ColumnDirective field="counterparty" headerText="Counterparty" width="180" />
                    <ColumnDirective field="stage" headerText="Stage" width="140" />
                    <ColumnDirective
                      field="valueAmount"
                      headerText="Value"
                      width="130"
                      textAlign="Right"
                      template={(p: { valueAmount?: number }) => fmtMoney(p.valueAmount ?? 0)}
                    />
                    <ColumnDirective field="renewalDate" headerText="Renewal" width="120" />
                  </ColumnsDirective>
                  <Inject services={[Page, Sort]} />
                </GridComponent>
              </div>
            )}
          />
          <TabItemDirective
            header={{ text: `Documents (${documents.length})` }}
            content={() => (
              <div className="tab-content">
                <GridComponent dataSource={documents} allowPaging pageSettings={{ pageSize: 10 }} allowSorting height="auto">
                  <ColumnsDirective>
                    <ColumnDirective field="fileName" headerText="File" width="240" />
                    <ColumnDirective field="documentType" headerText="Type" width="140" />
                    <ColumnDirective field="folderPath" headerText="Folder" width="200" />
                    <ColumnDirective field="version" headerText="Ver" width="70" textAlign="Center" />
                    <ColumnDirective field="uploadedBy" headerText="Uploaded By" width="150" />
                    <ColumnDirective field="createdAt" headerText="Created" width="120" />
                    <ColumnDirective
                      field="sizeBytes"
                      headerText="Size"
                      width="100"
                      textAlign="Right"
                      template={(p: { sizeBytes?: number }) =>
                        p.sizeBytes != null ? `${Math.max(1, Math.round(p.sizeBytes / 1024))} KB` : '—'
                      }
                    />
                  </ColumnsDirective>
                  <Inject services={[Page, Sort]} />
                </GridComponent>
              </div>
            )}
          />
        </TabItemsDirective>
      </TabComponent>
    </div>
  );
}

export default MatterDetailPage;
