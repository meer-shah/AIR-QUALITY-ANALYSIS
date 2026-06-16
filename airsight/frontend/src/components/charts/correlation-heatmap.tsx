/**
 * CorrelationHeatmap — labelled Pearson matrix of pollutants.
 *
 * This is the ONLY place in AirSight where a diverging DATA scale is allowed:
 * cells run -1 (blue) → 0 (white) → +1 (violet). Everything else stays violet
 * chrome. Rendered as an accessible HTML grid (role="grid") so screen readers
 * announce each pollutant pair and its coefficient.
 */
import * as React from 'react';
import type { CorrelationMatrix } from '../../lib/types';
import { ChartEmpty } from './chart-empty';

export interface CorrelationHeatmapProps {
  data: CorrelationMatrix;
}

/** Diverging colour for a Pearson value in [-1, 1]. -1 blue, 0 white, +1 violet. */
function diverging(value: number): string {
  const v = Math.max(-1, Math.min(1, value));
  // Endpoints chosen to read clearly on white paper.
  const blue: [number, number, number] = [37, 99, 235]; // #2563EB
  const white: [number, number, number] = [255, 255, 255];
  const violet: [number, number, number] = [124, 58, 237]; // #7C3AED brand/600
  const [a, b] =
    v < 0 ? [white, blue] : [white, violet];
  const t = Math.abs(v);
  const c = [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Black or white annotation text, whichever reads on the cell fill. */
function textOn(value: number): string {
  // Strong positive/negative fills are dark enough to need white text.
  return Math.abs(value) > 0.55 ? '#FFFFFF' : '#000000';
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ data }) => {
  const { labels, matrix } = data;
  if (!labels?.length || !matrix?.length) {
    return <ChartEmpty message="No correlation matrix available." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table
          className="border-collapse text-body-sm"
          role="grid"
          aria-label="Pearson correlation between pollutants"
        >
          <thead>
            <tr>
              <th className="p-2 text-left text-ink-500 font-medium sticky left-0 bg-paper">
                <span className="sr-only">Pollutant</span>
              </th>
              {labels.map((l) => (
                <th
                  key={l}
                  scope="col"
                  className="p-2 text-caption font-semibold text-ink-700 text-center min-w-[52px]"
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel, i) => (
              <tr key={rowLabel}>
                <th
                  scope="row"
                  className="p-2 text-caption font-semibold text-ink-700 text-right whitespace-nowrap sticky left-0 bg-paper"
                >
                  {rowLabel}
                </th>
                {labels.map((colLabel, j) => {
                  const raw = matrix[i]?.[j];
                  if (raw == null) {
                    return (
                      <td
                        key={colLabel}
                        className="p-0 border border-line-soft text-center align-middle"
                        aria-label={`${rowLabel} vs ${colLabel}: no data`}
                      >
                        <div className="flex h-11 min-w-[52px] items-center justify-center text-ink-400">
                          —
                        </div>
                      </td>
                    );
                  }
                  const value = Number(raw);
                  return (
                    <td
                      key={colLabel}
                      className="p-0 border border-line-soft text-center align-middle"
                      style={{ backgroundColor: diverging(value) }}
                      aria-label={`${rowLabel} vs ${colLabel}: ${value.toFixed(2)}`}
                    >
                      <div
                        className="flex h-11 min-w-[52px] items-center justify-center font-medium tabular-nums"
                        style={{ color: textOn(value) }}
                      >
                        {value.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Diverging legend */}
      <div className="flex items-center gap-3" aria-hidden>
        <span className="text-caption text-ink-600">−1</span>
        <div
          className="h-3 w-40 max-w-full"
          style={{
            background: `linear-gradient(to right, ${diverging(-1)}, ${diverging(0)}, ${diverging(1)})`,
          }}
        />
        <span className="text-caption text-ink-600">+1</span>
        <span className="ml-1 text-caption text-ink-500">
          blue = negative · violet = positive
        </span>
      </div>
    </div>
  );
};
