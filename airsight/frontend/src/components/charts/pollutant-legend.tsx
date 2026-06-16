/**
 * PollutantLegend — renders the per-pollutant geographic colour scale used by
 * the map's heat grid and station circles. Like the AQI legend, these colours
 * are an allowed exception to the one-accent rule (data encoding only).
 *
 * Draws a continuous gradient bar from the ~11 interpolated stops, with the
 * named thresholds marked beneath it and the unit shown on the right.
 */
import * as React from 'react';
import { pollutantLegendStops, pollutantThresholds } from '../../lib/palette';
import { formatValue } from '../../lib/format';
import { cn } from '../../lib/cn';

export interface PollutantLegendProps {
  pollutant: string;
  unit: string;
  className?: string;
}

export const PollutantLegend: React.FC<PollutantLegendProps> = ({
  pollutant,
  unit,
  className,
}) => {
  const stops = pollutantLegendStops(pollutant);
  const ticks = pollutantThresholds(pollutant);
  const max = ticks[ticks.length - 1]?.value ?? 1;
  const gradient = `linear-gradient(to right, ${stops
    .map((s) => s.color)
    .join(', ')})`;

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      aria-label={`Colour scale for ${pollutant} (${unit})`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-body-sm font-medium text-ink-700">
          {pollutant} colour scale
        </span>
        <span className="text-caption text-ink-500">{unit}</span>
      </div>
      <div
        className="h-3 w-full border border-line"
        style={{ background: gradient }}
        aria-hidden
      />
      <div className="relative h-4 w-full text-caption text-ink-500">
        {ticks.map((t) => {
          const pct = max === 0 ? 0 : (t.value / max) * 100;
          // Anchor end ticks inside the bar so labels don't clip.
          const transform =
            pct <= 0 ? 'translateX(0)' : pct >= 100 ? 'translateX(-100%)' : 'translateX(-50%)';
          return (
            <span
              key={t.value}
              className="absolute top-0 tabular-nums"
              style={{ left: `${pct}%`, transform }}
            >
              {formatValue(t.value, t.value < 10 ? 1 : 0)}
            </span>
          );
        })}
      </div>
    </div>
  );
};
