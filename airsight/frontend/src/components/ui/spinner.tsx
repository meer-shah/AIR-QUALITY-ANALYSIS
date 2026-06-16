/** Spinner + loading/error helpers. Violet ring, sharp error card. */
import * as React from 'react';
import { cn } from '../../lib/cn';
import { Button } from './button';

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 24, className, label = 'Loading' }) => (
  <span
    role="status"
    aria-label={label}
    className={cn('inline-block animate-spin rounded-full border-2 border-brand-200 border-t-brand-600', className)}
    style={{ width: size, height: size }}
  />
);

/** Centered loading state for a panel or page region. */
export const LoadingState: React.FC<{ label?: string; className?: string }> = ({
  label = 'Loading…',
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-ink-500', className)}>
    <Spinner size={28} />
    <p className="text-body-sm">{label}</p>
  </div>
);

/** Simple error card with an optional retry handler. */
export const ErrorState: React.FC<{ message: string; onRetry?: () => void; className?: string }> = ({
  message,
  onRetry,
  className,
}) => (
  <div
    role="alert"
    className={cn('border border-danger-600 bg-danger-100 p-6 flex flex-col gap-3', className)}
  >
    <p className="text-body-md font-medium text-danger-600">Could not load this view</p>
    <p className="text-body-sm text-ink-700">{message}</p>
    {onRetry && (
      <div>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )}
  </div>
);
