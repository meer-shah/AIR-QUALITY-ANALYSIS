/** Shared empty-state for charts that received no plottable points. */
import * as React from 'react';

export const ChartEmpty: React.FC<{ message?: string; height?: number }> = ({
  message = 'No data to plot for this selection.',
  height = 280,
}) => (
  <div
    className="flex items-center justify-center border border-dashed border-line text-body-sm text-ink-500"
    style={{ height }}
  >
    {message}
  </div>
);
