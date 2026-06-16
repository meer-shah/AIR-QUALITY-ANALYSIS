/**
 * Per-pollutant geographic colour scale — the notebook's `color_producer`.
 *
 * IMPORTANT (brand rule): like the AQI legend, these colours are an explicit
 * exception to MarcVista's "one accent" rule. They exist ONLY to encode
 * pollutant concentration on the map (heat grid + station circles + the map
 * legend) — never on buttons, nav, or headings. All UI chrome stays violet/ink.
 *
 * Each pollutant has a set of (threshold -> colour) stops. We interpolate
 * smoothly between the stops in RGB so a continuous value maps to a continuous
 * colour, exactly like the original analysis.
 */
import type { PollutantKey } from './types';

/** Named stops shared across pollutants (hex per the task spec). */
const GREEN = '#16A34A';
const YELLOW = '#EAB308';
const ORANGE = '#EA580C';
const RED = '#DC2626';
const BLACK = '#1F2937';

/** Neutral grey for a missing/unknown value. */
export const POLLUTANT_UNKNOWN_COLOR = '#9CA3AF';

interface Stop {
  value: number;
  color: string;
}

/** Threshold -> colour stops per pollutant (ascending by value). */
const SCALES: Record<string, Stop[]> = {
  'PM2.5': [
    { value: 0, color: GREEN },
    { value: 12, color: YELLOW },
    { value: 35, color: ORANGE },
    { value: 55.4, color: RED },
    { value: 150, color: BLACK },
  ],
  PM10: [
    { value: 0, color: GREEN },
    { value: 20, color: YELLOW },
    { value: 60, color: ORANGE },
    { value: 110, color: RED },
    { value: 250, color: BLACK },
  ],
  CO: [
    { value: 0, color: GREEN },
    { value: 4, color: YELLOW },
    { value: 10, color: ORANGE },
    { value: 20, color: RED },
    { value: 50, color: BLACK },
  ],
  OZONE: [
    { value: 0, color: GREEN },
    { value: 60, color: YELLOW },
    { value: 100, color: ORANGE },
    { value: 200, color: RED },
    { value: 300, color: BLACK },
  ],
  NOX: [
    { value: 0, color: GREEN },
    { value: 40, color: YELLOW },
    { value: 80, color: ORANGE },
    { value: 160, color: RED },
    { value: 300, color: BLACK },
  ],
  NO: [
    { value: 0, color: GREEN },
    { value: 40, color: YELLOW },
    { value: 80, color: ORANGE },
    { value: 160, color: RED },
    { value: 300, color: BLACK },
  ],
  NO2: [
    { value: 0, color: GREEN },
    { value: 20, color: YELLOW },
    { value: 40, color: ORANGE },
    { value: 80, color: RED },
    { value: 200, color: BLACK },
  ],
  // SO2 is live-only (no 2021 RMCAB column). Stops in µg/m³, anchored near the
  // WHO 24-h guideline (40) and EPA-equivalent hazardous bands.
  SO2: [
    { value: 0, color: GREEN },
    { value: 40, color: YELLOW },
    { value: 125, color: ORANGE },
    { value: 350, color: RED },
    { value: 800, color: BLACK },
  ],
};

/** Fall back to PM2.5's scale for any unknown pollutant key. */
function scaleFor(pollutant: string): Stop[] {
  return SCALES[pollutant] ?? SCALES['PM2.5'];
}

/** Parse a #rrggbb hex into [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Format [r, g, b] back to #rrggbb. */
function rgbToHex(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Linearly interpolate between two colours in RGB at fraction t (0..1). */
function mixRgb(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ]);
}

/** Interpolate a colour for `value` across the given stops (clamped to ends). */
function colorAt(stops: Stop[], value: number): string {
  if (value <= stops[0].value) return stops[0].color;
  const last = stops[stops.length - 1];
  if (value >= last.value) return last.color;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const lo = stops[i];
    const hi = stops[i + 1];
    if (value >= lo.value && value <= hi.value) {
      const span = hi.value - lo.value;
      const t = span === 0 ? 0 : (value - lo.value) / span;
      return mixRgb(lo.color, hi.color, t);
    }
  }
  return last.color;
}

/**
 * Colour for a pollutant concentration on the geographic scale.
 * Returns neutral grey when the value is null/NaN.
 */
export function pollutantColor(pollutant: string, value: number | null): string {
  if (value == null || Number.isNaN(value)) return POLLUTANT_UNKNOWN_COLOR;
  return colorAt(scaleFor(pollutant), value);
}

/**
 * Evenly-sampled legend stops for a pollutant — ~11 steps from the first to the
 * last threshold, each with its interpolated colour. Drives the map legend.
 */
export function pollutantLegendStops(
  pollutant: string,
): { value: number; color: string }[] {
  const stops = scaleFor(pollutant);
  const min = stops[0].value;
  const max = stops[stops.length - 1].value;
  const steps = 11;
  const out: { value: number; color: string }[] = [];
  for (let i = 0; i < steps; i += 1) {
    const value = min + ((max - min) * i) / (steps - 1);
    out.push({ value, color: colorAt(stops, value) });
  }
  return out;
}

/** The raw named threshold stops for a pollutant (for labelled legend ticks). */
export function pollutantThresholds(
  pollutant: string,
): { value: number; color: string }[] {
  return scaleFor(pollutant).map((s) => ({ value: s.value, color: s.color }));
}

/**
 * Point-in-polygon test by ray casting. `ring` is a list of [lon, lat] pairs
 * straight from the GeoJSON boundary; the query point is given as (lat, lon).
 * Returns true when the point falls inside the ring.
 */
export function pointInRing(
  lat: number,
  lon: number,
  ring: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0]; // lon
    const yi = ring[i][1]; // lat
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Re-export the named pollutant keys palette covers, for callers that want it. */
export const PALETTE_POLLUTANTS: PollutantKey[] = [
  'PM2.5',
  'PM10',
  'NO',
  'NO2',
  'NOX',
  'CO',
  'OZONE',
];
