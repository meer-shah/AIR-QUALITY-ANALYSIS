/**
 * TimeSeriesChart — recharts LineChart. Lead series is brand/600 violet; extra
 * series for station comparison use the violet ramp + ink greys (still one hue
 * family, no AQI legend colours on chrome). Tooltip + legend included.
 */
import * as React from 'react';
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  FlaggedPoint,
  HistoryPoint,
  TimeseriesPoint,
} from '../../lib/types';
import { formatDate, formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface SeriesInput {
  key: string; // unique dataKey (e.g. station code or 'all')
  name: string; // legend label
  points: TimeseriesPoint[];
}

export interface TimeSeriesChartProps {
  series: SeriesInput[];
  unit: string;
  freq: 'daily' | 'monthly';
  height?: number;
  /** Show a date-window brush below the chart so users can zoom. Default off. */
  showBrush?: boolean;
}

// Lead = violet; subsequent series step down the ramp / into ink for contrast.
const SERIES_COLORS = ['#7C3AED', '#8B5CF6', '#A78BFA', '#4B5563', '#9CA3AF', '#5B21B6'];

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  series,
  unit,
  freq,
  height = 320,
  showBrush = false,
}) => {
  // Merge all series into rows keyed by date so recharts can align points.
  const byDate = new Map<string, Record<string, number | string | null>>();
  for (const s of series) {
    for (const p of s.points) {
      const row = byDate.get(p.date) ?? { date: p.date };
      row[s.key] = p.value;
      byDate.set(p.date, row);
    }
  }
  const data = Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  if (!data.length) return <ChartEmpty height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, bottom: showBrush ? 24 : 8, left: 0 }}
      >
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(String(d), freq === 'monthly' ? 'month' : 'day')}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          minTickGap={32}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={48}
          label={{
            value: unit,
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: number | string) => [`${formatValue(Number(value))} ${unit}`, '']}
          labelFormatter={(d) => formatDate(String(d), freq === 'monthly' ? 'month' : 'day')}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 13 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={i === 0 ? 2.5 : 2}
            dot={false}
            connectNulls
            activeDot={{ r: 4 }}
          />
        ))}
        {showBrush && (
          <Brush
            dataKey="date"
            height={22}
            travellerWidth={8}
            stroke="#7C3AED"
            fill="#FFFFFF"
            tickFormatter={(d) =>
              formatDate(String(d), freq === 'monthly' ? 'month' : 'day')
            }
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

/* -------------------------------------------------------------------------- */
/* Continuous variant: 2021 RMCAB ground sensors + 2022→now Open-Meteo (CAMS) */
/* on one shared time axis, both violet but visually distinct, with a gap kept */
/* open across Jan–Aug 2022 (the two series live on separate dataKeys so they  */
/* never bridge the missing months).                                          */
/* -------------------------------------------------------------------------- */

const RMCAB_COLOR = '#A78BFA'; // lighter violet, dashed = 2021 ground sensors
const LIVE_COLOR = '#7C3AED'; // brand violet, solid = 2022→now live archive

export interface ContinuousTimeSeriesChartProps {
  /** 2021 RMCAB city-average points (Bogotá only). Empty/omitted = none. */
  rmcab?: TimeseriesPoint[];
  /** 2022→now Open-Meteo (CAMS) points for the selected coordinate. */
  live?: HistoryPoint[];
  unit: string;
  freq: 'daily' | 'monthly';
  /** Show the 2021/2022 boundary reference line + label. */
  boundary?: string;
  height?: number;
}

export const ContinuousTimeSeriesChart: React.FC<ContinuousTimeSeriesChartProps> = ({
  rmcab = [],
  live = [],
  unit,
  freq,
  boundary = '2022-01-01',
  height = 380,
}) => {
  // Merge both series into rows keyed by date. Keep them on separate dataKeys
  // ('rmcab' / 'live') so recharts draws two independent lines and never
  // connects a 2021 point to a 2022 point across the Jan–Aug 2022 gap.
  const byDate = new Map<string, { date: string; rmcab?: number | null; live?: number | null }>();
  for (const p of rmcab) {
    const row = byDate.get(p.date) ?? { date: p.date };
    row.rmcab = p.value;
    byDate.set(p.date, row);
  }
  for (const p of live) {
    const row = byDate.get(p.date) ?? { date: p.date };
    row.live = p.value;
    byDate.set(p.date, row);
  }
  const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  if (!data.length) return <ChartEmpty height={height} />;

  const hasRmcab = rmcab.length > 0;
  const hasLive = live.length > 0;
  const showBoundary = hasRmcab && hasLive;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(String(d), freq === 'monthly' ? 'month' : 'day')}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          minTickGap={32}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={48}
          label={{
            value: unit,
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: number | string, name) => [
            `${formatValue(Number(value))} ${unit}`,
            String(name),
          ]}
          labelFormatter={(d) => formatDate(String(d), freq === 'monthly' ? 'month' : 'day')}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {showBoundary && (
          <ReferenceLine
            x={boundary}
            stroke="#9CA3AF"
            strokeDasharray="2 4"
            label={{
              value: '2021 → live',
              position: 'top',
              fill: '#6B7280',
              fontSize: 11,
            }}
          />
        )}
        {hasRmcab && (
          <Line
            type="monotone"
            dataKey="rmcab"
            name="RMCAB 2021 (ground sensors)"
            stroke={RMCAB_COLOR}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4 }}
          />
        )}
        {hasLive && (
          <Line
            type="monotone"
            dataKey="live"
            name="Open-Meteo 2022–now (CAMS)"
            stroke={LIVE_COLOR}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

/* -------------------------------------------------------------------------- */
/* Flagged variant: single-station MEASURED vs IMPUTED overlay.                */
/* The measured value is drawn as one violet line; periods where the model    */
/* filled the majority of the underlying hours (imputed_share > threshold) are */
/* marked with a second, distinctly-styled overlay (amber dots) so the eye    */
/* can tell apart real readings from model-filled ones at a glance.           */
/* -------------------------------------------------------------------------- */

const MEASURED_COLOR = '#7C3AED'; // brand violet = the value line
const IMPUTED_COLOR = '#D97706'; // amber = imputed-dominant markers (data encoding)

export interface FlaggedTimeSeriesChartProps {
  points: FlaggedPoint[];
  unit: string;
  freq: 'daily' | 'monthly';
  height?: number;
  /** Above this imputed_share a point is treated as model-filled. Default 0.5. */
  imputedThreshold?: number;
  /** Show a date-window brush below the chart so users can zoom. Default off. */
  showBrush?: boolean;
}

interface FlaggedRow {
  date: string;
  value: number | null;
  /** Mirrors `value` only when the point is imputed-dominant, else null. */
  imputed: number | null;
  share: number | null;
}

export const FlaggedTimeSeriesChart: React.FC<FlaggedTimeSeriesChartProps> = ({
  points,
  unit,
  freq,
  height = 380,
  imputedThreshold = 0.5,
  showBrush = false,
}) => {
  const data: FlaggedRow[] = React.useMemo(
    () =>
      [...points]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => {
          const isImputed =
            p.value != null &&
            p.imputed_share != null &&
            p.imputed_share > imputedThreshold;
          return {
            date: p.date,
            value: p.value,
            imputed: isImputed ? p.value : null,
            share: p.imputed_share,
          };
        }),
    [points, imputedThreshold],
  );

  if (!data.length) return <ChartEmpty height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, bottom: showBrush ? 24 : 8, left: 0 }}
      >
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(String(d), freq === 'monthly' ? 'month' : 'day')}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          minTickGap={32}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={48}
          label={{
            value: unit,
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: number | string, _name, item) => {
            // Suppress the duplicate "imputed" overlay row in the tooltip; the
            // value line already shows the number and the share is in the label.
            if (item?.dataKey === 'imputed') return null;
            return [`${formatValue(Number(value))} ${unit}`, 'measured'];
          }}
          labelFormatter={(d, payload) => {
            const row = payload?.[0]?.payload as FlaggedRow | undefined;
            const base = formatDate(String(d), freq === 'monthly' ? 'month' : 'day');
            if (row?.share != null) {
              return `${base} · ${Math.round(row.share * 100)}% imputed`;
            }
            return base;
          }}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line
          type="monotone"
          dataKey="value"
          name="measured"
          stroke={MEASURED_COLOR}
          strokeWidth={2.5}
          dot={false}
          connectNulls
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="imputed"
          name={`imputed (> ${Math.round(imputedThreshold * 100)}% of hours filled)`}
          stroke="transparent"
          strokeWidth={0}
          legendType="circle"
          dot={{ r: 3, fill: IMPUTED_COLOR, stroke: IMPUTED_COLOR }}
          activeDot={{ r: 5, fill: IMPUTED_COLOR, stroke: '#FFFFFF', strokeWidth: 1 }}
          connectNulls={false}
          isAnimationActive={false}
        />
        {showBrush && (
          <Brush
            dataKey="date"
            height={22}
            travellerWidth={8}
            stroke="#7C3AED"
            fill="#FFFFFF"
            tickFormatter={(d) =>
              formatDate(String(d), freq === 'monthly' ? 'month' : 'day')
            }
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

/** Count of imputed-dominant points for a flagged series, for captions. */
export function countImputedDominant(
  points: FlaggedPoint[],
  threshold = 0.5,
): number {
  return points.filter(
    (p) =>
      p.value != null && p.imputed_share != null && p.imputed_share > threshold,
  ).length;
}
