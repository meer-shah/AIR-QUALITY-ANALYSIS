/**
 * ScatterDensity — recharts ScatterChart of one pollutant against another.
 *
 * Plots the sampled `scatter.rows`, mapping the two chosen columns by their
 * index in `scatter.pollutants`. Many overlapping low-opacity violet dots read
 * as a density cloud. Axis labels carry units. Single accent (violet) only.
 */
import * as React from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ScatterSample } from '../../lib/types';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface ScatterDensityProps {
  sample: ScatterSample;
  xKey: string;
  yKey: string;
  xUnit: string;
  yUnit: string;
  height?: number;
}

export const ScatterDensity: React.FC<ScatterDensityProps> = ({
  sample,
  xKey,
  yKey,
  xUnit,
  yUnit,
  height = 360,
}) => {
  const xi = sample.pollutants.indexOf(xKey);
  const yi = sample.pollutants.indexOf(yKey);

  if (xi < 0 || yi < 0) {
    return <ChartEmpty height={height} message="Pick two pollutants to compare." />;
  }

  const points = sample.rows
    .map((row) => ({ x: row[xi], y: row[yi] }))
    .filter(
      (p): p is { x: number; y: number } =>
        p.x != null && p.y != null && !Number.isNaN(p.x) && !Number.isNaN(p.y),
    );

  if (!points.length) {
    return <ChartEmpty height={height} message="No overlapping samples for this pair." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <CartesianGrid stroke="#F3F4F6" />
        <XAxis
          type="number"
          dataKey="x"
          name={xKey}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          domain={['auto', 'auto']}
          label={{
            value: `${xKey} (${xUnit})`,
            position: 'insideBottom',
            offset: -12,
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yKey}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={52}
          domain={['auto', 'auto']}
          label={{
            value: `${yKey} (${yUnit})`,
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <ZAxis range={[18, 18]} />
        <Tooltip
          cursor={{ stroke: '#DDD6FE', strokeWidth: 1 }}
          formatter={(value: number | string, name: string) => [formatValue(Number(value)), name]}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        <Scatter
          data={points}
          name={`${yKey} vs ${xKey}`}
          fill="#7C3AED"
          fillOpacity={0.18}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};
