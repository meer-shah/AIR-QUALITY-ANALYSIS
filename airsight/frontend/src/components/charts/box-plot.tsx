/**
 * BoxPlot — horizontal box-and-whisker per station, drawn as an inline SVG
 * (recharts has no native box plot). One row per station, ordered as supplied
 * (the API sorts by median). Each row shows min · q1 · median · q3 · max on a
 * shared scale. Violet only (chrome); the median is the brand accent.
 *
 * Accessible: each row carries an aria-label with the five-number summary.
 */
import * as React from 'react';
import type { BoxplotItem } from '../../lib/types';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface BoxPlotProps {
  items: BoxplotItem[];
  unit: string;
  /** Optional station code → display name resolver. */
  nameFor?: (code: string) => string;
}

const ROW_H = 36;
const LABEL_W = 96;
const PAD_R = 16;
const PAD_T = 28; // room for the axis ticks at top
const PAD_B = 8;
const PLOT_MIN_W = 320;

export const BoxPlot: React.FC<BoxPlotProps> = ({ items, unit, nameFor }) => {
  if (!items?.length) {
    return <ChartEmpty message="No box-plot data for this pollutant." />;
  }

  // Shared domain across all stations.
  const lo = Math.min(...items.map((d) => d.min));
  const hi = Math.max(...items.map((d) => d.max));
  const span = hi - lo || 1;

  // Layout in a viewBox; SVG scales responsively to the container width.
  const plotW = 640; // viewBox plot width (scales to container)
  const plotX0 = LABEL_W;
  const plotX1 = plotX0 + plotW;
  const totalW = plotX1 + PAD_R;
  const totalH = PAD_T + items.length * ROW_H + PAD_B;

  const xScale = (v: number) => plotX0 + ((v - lo) / span) * plotW;

  // ~5 axis ticks.
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => lo + (span * i) / (tickCount - 1));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        width="100%"
        style={{ minWidth: PLOT_MIN_W }}
        role="img"
        aria-label={`Box plots of ${unit} per station`}
        preserveAspectRatio="xMinYMin meet"
      >
        {/* Axis ticks + gridlines */}
        {ticks.map((t, i) => {
          const x = xScale(t);
          return (
            <g key={i}>
              <line x1={x} y1={PAD_T} x2={x} y2={totalH - PAD_B} stroke="#F3F4F6" strokeWidth={1} />
              <text x={x} y={PAD_T - 10} textAnchor="middle" fontSize={11} fill="#6B7280">
                {formatValue(t, span < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        <text x={plotX1} y={12} textAnchor="end" fontSize={11} fill="#9CA3AF">
          {unit}
        </text>

        {/* One box per station */}
        {items.map((d, i) => {
          const cy = PAD_T + i * ROW_H + ROW_H / 2;
          const boxTop = cy - 9;
          const boxH = 18;
          const xMin = xScale(d.min);
          const xQ1 = xScale(d.q1);
          const xMed = xScale(d.median);
          const xQ3 = xScale(d.q3);
          const xMax = xScale(d.max);
          const label = nameFor ? nameFor(d.station) : d.station;
          return (
            <g
              key={d.station}
              aria-label={`${label}: min ${formatValue(d.min)}, q1 ${formatValue(
                d.q1,
              )}, median ${formatValue(d.median)}, q3 ${formatValue(d.q3)}, max ${formatValue(
                d.max,
              )} ${unit}`}
            >
              {/* Station label */}
              <text
                x={plotX0 - 10}
                y={cy + 4}
                textAnchor="end"
                fontSize={12}
                fill="#374151"
              >
                {label}
              </text>
              {/* Whiskers */}
              <line x1={xMin} y1={cy} x2={xQ1} y2={cy} stroke="#A78BFA" strokeWidth={1.5} />
              <line x1={xQ3} y1={cy} x2={xMax} y2={cy} stroke="#A78BFA" strokeWidth={1.5} />
              {/* Whisker caps */}
              <line x1={xMin} y1={cy - 6} x2={xMin} y2={cy + 6} stroke="#A78BFA" strokeWidth={1.5} />
              <line x1={xMax} y1={cy - 6} x2={xMax} y2={cy + 6} stroke="#A78BFA" strokeWidth={1.5} />
              {/* IQR box */}
              <rect
                x={xQ1}
                y={boxTop}
                width={Math.max(1, xQ3 - xQ1)}
                height={boxH}
                fill="#EDE9FE"
                stroke="#7C3AED"
                strokeWidth={1.5}
              />
              {/* Median */}
              <line
                x1={xMed}
                y1={boxTop}
                x2={xMed}
                y2={boxTop + boxH}
                stroke="#7C3AED"
                strokeWidth={2.5}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
