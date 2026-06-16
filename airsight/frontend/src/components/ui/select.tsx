/**
 * Select — labelled dropdown. Sharp corners (0px) to match the chrome,
 * brand focus ring, native <select> for full keyboard + screen-reader support.
 */
import * as React from 'react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: SelectOption[];
  /** Convenience callback with just the selected value. */
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, options, id, onValueChange, onChange, ...props }, ref) => {
    const selectId = id || React.useId();
    const hintId = hint ? `${selectId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={selectId} className="text-body-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-describedby={hintId}
            onChange={(e) => {
              onValueChange?.(e.target.value);
              onChange?.(e);
            }}
            className={cn(
              'w-full appearance-none min-h-[44px] px-4 py-3 pr-10 text-body-md text-ink-900 bg-surface',
              'border border-ink-200 rounded-none cursor-pointer',
              'transition-all duration-sm ease-out',
              'focus:border-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
          >
            ▾
          </span>
        </div>
        {hint && (
          <p id={hintId} className="text-body-sm text-ink-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
