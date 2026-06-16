/**
 * Stat — big-number block. The value renders in brand/600 violet (one accent),
 * unless `valueColor` is supplied to encode AQI data with the legend colour.
 */
import * as React from 'react';
import { cn } from '../../lib/cn';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  label: string;
  source?: string;
  align?: 'left' | 'center';
  /** Optional override for AQI-encoded numbers (data legend colour only). */
  valueColor?: string;
}

export const Stat: React.FC<StatProps> = ({
  value,
  label,
  source,
  align = 'left',
  valueColor,
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-col gap-2',
      align === 'center' && 'items-center text-center',
      className,
    )}
    {...props}
  >
    <div
      className="text-h1 md:text-display-lg leading-none tracking-[-0.02em] font-semibold text-brand-600"
      style={valueColor ? { color: valueColor } : undefined}
    >
      {value}
    </div>
    <div className="text-body-md text-ink-700 max-w-[28ch]">{label}</div>
    {source && <div className="text-caption text-ink-500">{source}</div>}
  </div>
);
