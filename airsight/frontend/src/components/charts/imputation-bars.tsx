/**
 * ImputationBars — baseline missing-data strategies compared by accuracy (MAE).
 *
 * Horizontal bars, sorted best (lowest MAE) first. The single accent (violet)
 * encodes the metric; this is chrome, not the AQI/pollutant data scale. Lower
 * is better, so the shortest bar is the winner.
 */
import * as React from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InsightsImputationMethod } from '../../lib/types';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface ImputationBarsProps {
  methods: InsightsImputationMethod[];
  unit: string;
  height?: number;
}

export const ImputationBars: React.FC<ImputationBarsProps> = ({
  methods,
  unit,
  height,
}) => {
  const data = methods
    .filter((m) => m.mae != null)
    .map((m) => ({ label: m.label, mae: Number(m.mae) }));

  if (!data.length) return <ChartEmpty height={height} />;

  const computedHeight = height ?? Math.max(180, data.length * 56 + 32);

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
        barCategoryGap={10}
      >
        <XAxis
          type="number"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          tickFormatter={(v) => formatValue(Number(v), 1)}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={210}
          tick={{ fill: '#374151', fontSize: 12 }}
          stroke="#E5E7EB"
        />
        <Tooltip
          formatter={(value: number | string) => [
            `${formatValue(Number(value))} ${unit}`,
            'MAE',
          ]}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar dataKey="mae" name="MAE" fill="#7C3AED" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
};
