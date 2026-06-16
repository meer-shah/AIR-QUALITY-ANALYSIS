/**
 * RankingBar — horizontal recharts BarChart. Bars are coloured by AQI category
 * (data legend, the allowed exception). Sorted descending by value.
 */
import * as React from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RankingItem } from '../../lib/types';
import { categoryColor } from '../../lib/aqi';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface RankingBarProps {
  items: RankingItem[];
  unit: string;
  height?: number;
  onSelect?: (code: string) => void;
}

export const RankingBar: React.FC<RankingBarProps> = ({ items, unit, height, onSelect }) => {
  const data = items
    .filter((i) => i.value != null)
    .map((i) => ({
      code: i.code,
      name: i.name,
      value: i.value as number,
      color: i.color || categoryColor(i.aqi),
    }));

  if (!data.length) return <ChartEmpty />;

  const computedHeight = height ?? Math.max(220, data.length * 30 + 32);

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        barCategoryGap={6}
      >
        <XAxis
          type="number"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          tickFormatter={(v) => formatValue(Number(v), 0)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: '#374151', fontSize: 12 }}
          stroke="#E5E7EB"
        />
        <Tooltip
          formatter={(value: number | string) => [`${formatValue(Number(value))} ${unit}`, 'Mean']}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar
          dataKey="value"
          radius={0}
          onClick={(d: { code?: string }) => d?.code && onSelect?.(d.code)}
          cursor={onSelect ? 'pointer' : undefined}
        >
          {data.map((d) => (
            <Cell key={d.code} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
