/**
 * SectionHeader — overline (violet, uppercase) + sentence-case heading + optional sub.
 * Enforces the MarcVista hierarchy: max three sizes per surface.
 */
import * as React from 'react';
import { cn } from '../../lib/cn';

export interface SectionHeaderProps {
  overline?: string;
  title: string;
  sub?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  overline,
  title,
  sub,
  as: Heading = 'h2',
  className,
  actions,
}) => {
  const sizeClass = Heading === 'h1' ? 'text-h1' : Heading === 'h2' ? 'text-h2' : 'text-h3';
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex flex-col gap-2">
        {overline && <span className="overline text-brand-600">{overline}</span>}
        <Heading className={cn(sizeClass, 'text-ink-900')}>{title}</Heading>
        {sub && <p className="text-body-md text-ink-600 max-w-reading">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-end gap-3">{actions}</div>}
    </div>
  );
};
