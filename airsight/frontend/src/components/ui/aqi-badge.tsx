/**
 * AqiBadge — encodes air-quality data with the AQI legend colour.
 *
 * This is the SOLE place MarcVista's "one accent" rule is relaxed: the legend
 * green->maroon scale is used strictly for data encoding, never for UI chrome.
 * The badge shows the index value and category; colour is the band colour.
 */
import * as React from 'react';
import { cn } from '../../lib/cn';
import { categoryColor, categoryName } from '../../lib/aqi';
import { formatAqi } from '../../lib/format';
import type { Aqi } from '../../lib/types';

export interface AqiBadgeProps {
  aqi?: Aqi | null;
  /** Or pass a raw value + (optional) explicit category/color. */
  value?: number | null;
  category?: string;
  color?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const AqiBadge: React.FC<AqiBadgeProps> = ({
  aqi,
  value,
  category,
  color,
  showValue = true,
  size = 'sm',
  className,
}) => {
  const v = aqi?.value ?? value ?? null;
  const cat = aqi?.category ?? category ?? categoryName(v);
  const col = aqi?.color ?? color ?? categoryColor(v);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium text-white',
        size === 'sm' ? 'text-caption px-2 py-0.5' : 'text-body-sm px-3 py-1',
        className,
      )}
      style={{ backgroundColor: col }}
      title={`AQI ${formatAqi(v)} — ${cat}`}
    >
      {showValue && <span className="tabular-nums">{formatAqi(v)}</span>}
      <span>{cat}</span>
    </span>
  );
};

/** A small colour dot for table rows / dense contexts. */
export const AqiDot: React.FC<{ color: string; className?: string }> = ({ color, className }) => (
  <span
    aria-hidden
    className={cn('inline-block h-2.5 w-2.5 rounded-full align-middle', className)}
    style={{ backgroundColor: color }}
  />
);
