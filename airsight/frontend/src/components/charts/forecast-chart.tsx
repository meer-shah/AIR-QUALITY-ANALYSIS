/**
 * ForecastChart — today's hourly US-AQI forecast as a recharts LineChart.
 *
 * Mirrors TimeSeriesChart's style (violet lead line, sharp tooltip, ink grid)
 * but plots an AQI index (no unit) against hour-of-day. The x-axis is formatted
 * HH:00; the AQI index is unitless so the y-axis carries no unit label.
 */
import * as React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LiveForecastPoint } from '../../lib/types';
import { formatAqi, formatHour } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface ForecastChartProps {
  points: LiveForecastPoint[];
  height?: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ points, height = 280 }) => {
  const data = points.filter((p) => p.aqi != null);
  if (!data.length) return <ChartEmpty height={height} message="No forecast available for today." />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={(t) => formatHour(String(t))}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          minTickGap={28}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={40}
          allowDecimals={false}
          label={{
            value: 'AQI',
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: number | string) => [formatAqi(Number(value)), 'AQI']}
          labelFormatter={(t) => formatHour(String(t))}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="aqi"
          name="AQI"
          stroke="#7C3AED"
          strokeWidth={2.5}
          dot={false}
          connectNulls
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
