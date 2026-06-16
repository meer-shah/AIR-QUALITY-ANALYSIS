/**
 * Button — MarcVista primary/secondary/ghost/link/danger.
 * Sharp corners by default (brand signature). Primary = brand/600 violet.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 font-medium select-none min-h-[44px] ' +
    'transition-all duration-sm ease-out ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-paper ' +
    'disabled:opacity-50 disabled:pointer-events-none ' +
    'active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700',
        secondary: 'bg-surface text-ink-900 border border-line hover:border-ink-300',
        ghost: 'bg-transparent text-ink-900 hover:bg-ink-100',
        link: 'bg-transparent text-brand-600 hover:text-brand-700 underline underline-offset-4 decoration-1 p-0 min-h-0',
        danger: 'bg-danger-600 text-white hover:brightness-95',
      },
      size: {
        sm: 'text-body-sm py-2 px-4',
        md: 'text-body-md py-3 px-6',
        lg: 'text-body-md py-3.5 px-8',
      },
      rounded: {
        none: 'rounded-none',
        md: 'rounded-md',
        full: 'rounded-full',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'py-0 px-0 active:scale-100' }],
    defaultVariants: { variant: 'primary', size: 'md', rounded: 'none' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  /** Render as a different element/component (e.g. an <a> or a React Router Link). */
  as?: React.ElementType;
}

/**
 * Polymorphic button. When `as` is supplied, extra props for that element
 * (e.g. `to` for a Link) are accepted via the loosened call signature below.
 */
const ButtonImpl = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, as: Comp = 'button', ...props }, ref) => {
    const Element = Comp as React.ElementType;
    return (
      <Element ref={ref} className={cn(button({ variant, size, rounded }), className)} {...props} />
    );
  },
);
ButtonImpl.displayName = 'Button';

// Allow arbitrary extra props (forwarded to the `as` element) without widening
// the public ButtonProps surface used elsewhere.
export const Button = ButtonImpl as React.ForwardRefExoticComponent<
  ButtonProps & Record<string, unknown> & React.RefAttributes<HTMLButtonElement>
>;
