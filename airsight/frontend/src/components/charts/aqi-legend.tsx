/** AqiLegend — renders the AQI data scale (the allowed colour exception). */
import * as React from 'react';
import { legendBands } from '../../lib/aqi';
import type { AqiScaleBand } from '../../lib/types';
import { cn } from '../../lib/cn';

export interface AqiLegendProps {
  scale?: AqiScaleBand[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const AqiLegend: React.FC<AqiLegendProps> = ({
  scale,
  orientation = 'horizontal',
  className,
}) => {
  const bands = legendBands(scale);
  return (
    <ul
      className={cn(
        'flex gap-x-4 gap-y-2 text-caption text-ink-700',
        orientation === 'horizontal' ? 'flex-wrap' : 'flex-col',
        className,
      )}
      aria-label="Air quality index scale"
    >
      {bands.map((b) => (
        <li key={b.category} className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 flex-shrink-0"
            style={{ backgroundColor: b.color }}
          />
          <span>
            <span className="text-ink-500">{b.range}</span> {b.category}
          </span>
        </li>
      ))}
    </ul>
  );
};
