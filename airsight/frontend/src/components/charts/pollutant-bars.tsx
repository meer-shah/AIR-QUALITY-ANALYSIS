/**
 * PollutantBars — annual mean vs WHO guideline, per pollutant.
 *
 * Grouped bars: the city mean (violet, the one accent) against the WHO 2021
 * guideline (ink grey). Pollutants without a guideline show the mean only.
 */
import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PollutantReading } from '../../lib/types';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface PollutantBarsProps {
  readings: PollutantReading[];
  height?: number;
}

export const PollutantBars: React.FC<PollutantBarsProps> = ({ readings, height = 320 }) => {
  const data = readings
    .filter((r) => r.mean != null)
    .map((r) => ({
      label: r.label,
      unit: r.unit,
      mean: Number(r.mean),
      who: r.whoGuideline ?? null,
    }));

  if (!data.length) return <ChartEmpty height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} barGap={4}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#374151', fontSize: 12 }} stroke="#E5E7EB" />
        <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} stroke="#E5E7EB" width={44} />
        <Tooltip
          formatter={(value: number | string, name: string) => [formatValue(Number(value)), name]}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="mean" name="Annual mean" fill="#7C3AED" radius={0} />
        <Bar dataKey="who" name="WHO 2021 guideline" fill="#9CA3AF" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
};
