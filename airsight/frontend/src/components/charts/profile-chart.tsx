/**
 * ProfileChart — a diurnal or weekly mean profile with a ±1 std band.
 *
 * recharts ComposedChart: a low-opacity violet Area draws the [mean−std,
 * mean+std] band behind a solid violet mean Line. A dashed ReferenceLine marks
 * the annual mean, and an optional dashed reference (e.g. the WHO PM2.5
 * guideline) marks a target. Single accent (violet) only — no data scale.
 *
 * The band is encoded as `low` + `range` (range = high − low) so a stacked
 * Area renders the gap between the two without a visible floor fill.
 */
import * as React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProfileSeries } from '../../lib/types';
import { formatValue } from '../../lib/format';
import { ChartEmpty } from './chart-empty';

export interface ProfileChartProps {
  series: ProfileSeries;
  unit: string;
  /** Dataset annual mean — drawn as a dashed reference line. */
  annualMean?: number | null;
  /** Optional guideline (e.g. WHO PM2.5) — dashed reference line + label. */
  guideline?: number | null;
  guidelineLabel?: string;
  /** X-axis caption, e.g. "Hour of day" or "Day of week". */
  xLabel?: string;
  height?: number;
}

export const ProfileChart: React.FC<ProfileChartProps> = ({
  series,
  unit,
  annualMean,
  guideline,
  guidelineLabel = 'Guideline',
  xLabel,
  height = 300,
}) => {
  const { labels, mean, std } = series;
  if (!labels?.length || !mean?.length) {
    return <ChartEmpty height={height} message="No profile for this selection." />;
  }

  const rows = labels.map((label, i) => {
    const m = mean[i];
    const s = std[i];
    if (m == null) {
      return { label: String(label), mean: null, low: null, range: null };
    }
    const sd = s ?? 0;
    const low = m - sd;
    return { label: String(label), mean: m, low, range: 2 * sd };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          minTickGap={8}
          interval="preserveStartEnd"
          label={
            xLabel
              ? {
                  value: xLabel,
                  position: 'insideBottom',
                  offset: -6,
                  fill: '#6B7280',
                  fontSize: 12,
                }
              : undefined
          }
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
          formatter={(value: number | string, name: string) => {
            if (name === 'Mean') return [`${formatValue(Number(value))} ${unit}`, 'Mean'];
            return [null, null] as unknown as [string, string];
          }}
          filterNull
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        {/* Band: invisible base (low) then a translucent range on top. */}
        <Area
          type="monotone"
          dataKey="low"
          stackId="band"
          stroke="none"
          fill="none"
          isAnimationActive={false}
          legendType="none"
          activeDot={false}
          name="low"
        />
        <Area
          type="monotone"
          dataKey="range"
          stackId="band"
          stroke="none"
          fill="#7C3AED"
          fillOpacity={0.12}
          isAnimationActive={false}
          legendType="none"
          activeDot={false}
          name="±1 std"
        />
        <Line
          type="monotone"
          dataKey="mean"
          name="Mean"
          stroke="#7C3AED"
          strokeWidth={2.5}
          dot={false}
          connectNulls
          activeDot={{ r: 4 }}
        />
        {annualMean != null && (
          <ReferenceLine
            y={annualMean}
            stroke="#6B7280"
            strokeDasharray="5 4"
            label={{
              value: `Annual mean ${formatValue(annualMean)}`,
              position: 'insideTopRight',
              fill: '#6B7280',
              fontSize: 11,
            }}
          />
        )}
        {guideline != null && (
          <ReferenceLine
            y={guideline}
            stroke="#5B21B6"
            strokeDasharray="2 4"
            label={{
              value: `${guidelineLabel} ${formatValue(guideline)}`,
              position: 'insideBottomRight',
              fill: '#5B21B6',
              fontSize: 11,
            }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
