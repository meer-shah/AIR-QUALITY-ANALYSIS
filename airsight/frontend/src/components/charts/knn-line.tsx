/**
 * KnnLine — spatial KNN accuracy (MAE) as a function of k.
 *
 * Single violet line (chrome, not the data scale). A reference dot marks the
 * best k. Lower MAE is better, so the curve dipping then flattening shows the
 * sweet spot in neighbour count.
 */
import * as React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InsightsSpatialKnnPoint } from '../../lib/types';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface KnnLineProps {
  points: InsightsSpatialKnnPoint[];
  unit: string;
  bestK?: number | null;
  bestMae?: number | null;
  height?: number;
}

export const KnnLine: React.FC<KnnLineProps> = ({
  points,
  unit,
  bestK,
  bestMae,
  height = 320,
}) => {
  const data = points
    .filter((p) => p.mae != null)
    .map((p) => ({ k: p.k, mae: Number(p.mae) }));

  if (!data.length) return <ChartEmpty height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="k"
          type="number"
          domain={['dataMin', 'dataMax']}
          allowDecimals={false}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          label={{
            value: 'k (neighbours)',
            position: 'insideBottom',
            offset: -4,
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={48}
          domain={['auto', 'auto']}
          label={{
            value: `MAE (${unit})`,
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: number | string) => [`${formatValue(Number(value))} ${unit}`, 'MAE']}
          labelFormatter={(k) => `k = ${k}`}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="mae"
          name="MAE"
          stroke="#7C3AED"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#7C3AED' }}
          activeDot={{ r: 5 }}
        />
        {bestK != null && bestMae != null && (
          <ReferenceDot
            x={bestK}
            y={bestMae}
            r={6}
            fill="#7C3AED"
            stroke="#FFFFFF"
            strokeWidth={2}
            isFront
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
