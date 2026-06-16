/** PageContainer — centered max-width column with MarcVista gutters. */
import * as React from 'react';
import { cn } from '../../lib/cn';

export const PageContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('mx-auto w-full max-w-container px-4 md:px-6', className)} {...props}>
    {children}
  </div>
);
