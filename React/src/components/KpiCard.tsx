// KPI card with optional progress bar and sparkline.
import React from 'react';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import { ProgressBarComponent } from '@syncfusion/ej2-react-progressbar';
import { SparklineComponent, Inject, SparklineTooltip } from '@syncfusion/ej2-react-charts';

export type KpiIconTone = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  /** Optional trend arrow. */
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  /** Show a skeleton instead of values. */
  loading?: boolean;
  icon?: React.ReactNode;
  iconTone?: KpiIconTone;
  /** Progress 0–100. */
  progress?: number;
  sparkline?: number[];
  onClick?: () => void;
}

const TONE_BG: Record<KpiIconTone, string> = {
  blue: 'var(--app-kpi-blue-bg)',
  green: 'var(--app-kpi-green-bg)',
  orange: 'var(--app-kpi-orange-bg)',
  red: 'var(--app-kpi-red-bg)',
  purple: 'var(--app-kpi-purple-bg)',
  neutral: 'var(--color-sf-bg-tertiary)',
};

const TONE_FG: Record<KpiIconTone, string> = {
  blue: 'var(--app-kpi-blue-text)',
  green: 'var(--app-kpi-green-text)',
  orange: 'var(--app-kpi-orange-text)',
  red: 'var(--app-kpi-red-text)',
  purple: 'var(--app-kpi-purple-text)',
  neutral: 'var(--color-sf-fg-tertiary)',
};

const TREND_COLOR: Record<'up' | 'down' | 'neutral', string> = {
  up: 'var(--color-sf-fg-success-primary)',
  down: 'var(--color-sf-fg-error-primary)',
  neutral: 'var(--color-sf-fg-tertiary)',
};

const TREND_GLYPH: Record<'up' | 'down' | 'neutral', string> = {
  up: '▲',
  down: '▼',
  neutral: '—',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  loading,
  icon,
  iconTone = 'neutral',
  progress,
  sparkline,
  onClick,
}) => {
  // Loading skeleton.
  if (loading) {
    return (
      <div className="e-card kpi-card kpi-card--skeleton" aria-busy="true">
        <div className="e-card-header" style={{ padding: 0, border: 'none' }}>
          <div className="e-card-header-caption" style={{ padding: 0 }}>
            <SkeletonComponent shape="Text" width="60%" height="14px" />
          </div>
          <SkeletonComponent shape="Circle" width="36px" height="36px" />
        </div>
        <div className="e-card-content" style={{ padding: 0, border: 'none' }}>
          <SkeletonComponent shape="Text" width="50%" height="28px" />
        </div>
        <div className="e-card-actions" style={{ padding: 0, border: 'none' }}>
          <SkeletonComponent shape="Text" width="70%" height="12px" />
        </div>
      </div>
    );
  }

  const isInteractive = typeof onClick === 'function';
  const hasProgress = typeof progress === 'number' && !Number.isNaN(progress);
  const clampedProgress = hasProgress ? Math.max(0, Math.min(100, progress!)) : 0;
  const tone = iconTone ?? 'neutral';
  const hasSparkline = Array.isArray(sparkline) && sparkline.length > 1;

  // Live card.
  const content = (
    <>
      {icon && (
        <span
          className={`kpi-card-icon kpi-icon-${tone}`}
          aria-hidden="true"
          style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}
        >
          {icon}
        </span>
      )}

      <div className="e-card-header" style={{ padding: 0, border: 'none' }}>
        <div className="e-card-header-caption" style={{ padding: 0 }}>
          <div
            className="e-card-sub-title kpi-card-title"
            style={icon ? { paddingRight: 44 } : undefined}
          >
            {title}
          </div>
        </div>
      </div>

      <div className="e-card-content kpi-card-value">{value}</div>

      {hasSparkline && (
        <div className="e-card-content kpi-card-sparkline" style={{ padding: 0, border: 'none' }}>
          <SparklineComponent
            id={`kpi-sparkline-${title.replace(/\s+/g, '-').toLowerCase()}`}
            dataSource={sparkline!.map((y, x) => ({ x, y }))}
            xName="x"
            yName="y"
            type="Area"
            height="36px"
            width="100%"
            fill={TONE_FG[tone]}
            lineWidth={1.5}
            opacity={0.28}
            // tooltipSettings={{ visible: true, format: '${y}' }}
          >
            <Inject services={[SparklineTooltip]} />
          </SparklineComponent>
        </div>
      )}

      {hasProgress && (
        <div className="e-card-content kpi-card-progress" style={{ padding: 0, border: 'none' }}>
          <ProgressBarComponent
            id={`kpi-progress-${title.replace(/\s+/g, '-').toLowerCase()}`}
            type="Linear"
            height="6"
            width="100%"
            value={clampedProgress}
            minimum={0}
            maximum={100}
            trackThickness={6}
            progressThickness={6}
            cornerRadius="Round"
            showProgressValue={false}
            animation={{ enable: true, duration: 400, delay: 0 }}
          />
        </div>
      )}

      {(subtitle || (trend && trendValue)) && (
        <div className="e-card-actions kpi-card-actions">
          {trend && trendValue && (
            <span
              className="kpi-card-trend"
              style={{ color: TREND_COLOR[trend] }}
            >
              {TREND_GLYPH[trend]} {trendValue}
            </span>
          )}
          {subtitle && <span className="kpi-card-subtitle">{subtitle}</span>}
        </div>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        className="e-card kpi-card kpi-card--clickable"
        onClick={onClick}
        aria-label={`${title}: ${value}`}
      >
        {content}
      </button>
    );
  }

  return <div className="e-card kpi-card">{content}</div>;
};

export default KpiCard;
