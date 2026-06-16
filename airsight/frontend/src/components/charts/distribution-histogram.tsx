/**
 * DistributionHistogram — recharts BarChart of hourly-value counts across bins.
 *
 * Bars are the single violet accent (chrome). The x-axis is labelled with bin
 * midpoints derived from `bin_edges` (length = counts + 1). Mirrors the
 * PollutantBars / ImputationBars style: sharp tooltip, ink grid, no radius.
 */
import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DistributionData } from '../../lib/types';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface DistributionHistogramProps {
  data: DistributionData;
  /** Counts series to plot (station code or 'all'). */
  seriesKey: string;
  unit: string;
  height?: number;
}

export const DistributionHistogram: React.FC<DistributionHistogramProps> = ({
  data,
  seriesKey,
  unit,
  height = 320,
}) => {
  const counts = data.series?.[seriesKey];
  const edges = data.bin_edges;

  if (!counts?.length || !edges?.length || edges.length < 2) {
    return <ChartEmpty height={height} message="No distribution for this selection." />;
  }

  const rows = counts.map((count, i) => {
    const lo = edges[i];
    const hi = edges[i + 1] ?? lo;
    const mid = (lo + hi) / 2;
    return {
      mid,
      label: formatValue(mid, mid < 10 ? 1 : 0),
      range: `${formatValue(lo, lo < 10 ? 1 : 0)}–${formatValue(hi, hi < 10 ? 1 : 0)}`,
      count: Number(count),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          minTickGap={16}
          interval="preserveStartEnd"
          label={{
            value: `${unit}`,
            position: 'insideBottom',
            offset: -4,
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={52}
          allowDecimals={false}
          label={{
            value: 'Hours',
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: number | string) => [`${formatValue(Number(value), 0)} hours`, 'Count']}
          labelFormatter={(_, payload) =>
            payload?.[0]?.payload
              ? `${(payload[0].payload as { range: string }).range} ${unit}`
              : ''
          }
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar dataKey="count" name="Hours" fill="#7C3AED" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
};
