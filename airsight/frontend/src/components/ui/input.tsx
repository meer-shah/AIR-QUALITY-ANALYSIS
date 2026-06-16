/**
 * Input — MarcVista form field. Label not placeholder, errors as text + icon +
 * colour, brand focus ring. Sharp corners (0px) to match chrome, never pill.
 */
import * as React from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, required, ...props }, ref) => {
    const inputId = id || React.useId();
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-body-sm font-medium text-ink-700">
          {label}
          {required && (
            <span className="text-danger-600 ml-1" aria-hidden>
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className={cn(
            'w-full min-h-[44px] px-4 py-3 text-body-md text-ink-900 bg-surface',
            'border border-ink-200 rounded-none',
            'placeholder:text-ink-400',
            'transition-all duration-sm ease-out',
            'focus:border-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-paper',
            error && 'border-danger-600 focus:border-danger-600 focus-visible:ring-danger-600/40',
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-body-sm text-ink-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-center gap-1.5 text-body-sm text-danger-600">
            <span aria-hidden>⚠</span>
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
