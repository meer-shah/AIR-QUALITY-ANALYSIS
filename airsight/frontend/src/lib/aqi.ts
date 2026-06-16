/**
 * AQI legend + helpers — mirrors the backend / API_CONTRACT.md `aqi_scale`.
 *
 * IMPORTANT (brand rule): these colours are the ONLY exception to MarcVista's
 * "one accent" rule. They are used strictly to encode air-quality data
 * (map markers, AQI badges, chart reference lines) — never for buttons, nav,
 * or headings. All UI chrome stays violet/ink.
 */
import type { AqiScaleBand, PollutantKey } from './types';

export interface AqiBand {
  min: number;
  max: number;
  category: string;
  color: string;
}

/** US EPA categories (24-h PM breakpoints), per the frozen contract. */
export const AQI_SCALE: AqiBand[] = [
  { min: 0, max: 50, category: 'Good', color: '#16A34A' },
  { min: 51, max: 100, category: 'Moderate', color: '#D97706' },
  { min: 101, max: 150, category: 'Unhealthy for sensitive groups', color: '#EA580C' },
  { min: 151, max: 200, category: 'Unhealthy', color: '#DC2626' },
  { min: 201, max: 300, category: 'Very unhealthy', color: '#7C3AED' },
  { min: 301, max: 500, category: 'Hazardous', color: '#7F1D1D' },
];

/** Neutral fallback when a value is missing. */
export const AQI_UNKNOWN_COLOR = '#9CA3AF';
export const AQI_UNKNOWN_CATEGORY = 'No data';

/** Return the band for a numeric AQI value. */
function bandFor(value: number): AqiBand {
  for (const band of AQI_SCALE) {
    if (value <= band.max) return band;
  }
  return AQI_SCALE[AQI_SCALE.length - 1];
}

/** Colour for an AQI value (or neutral grey when null/undefined). */
export function categoryColor(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return AQI_UNKNOWN_COLOR;
  return bandFor(value).color;
}

/** Category name for an AQI value (or "No data" when null/undefined). */
export function categoryName(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return AQI_UNKNOWN_CATEGORY;
  return bandFor(value).category;
}

/** Adapt the contract's `aqi_scale` rows into renderable legend bands. */
export function legendBands(scale?: AqiScaleBand[]): AqiScaleBand[] {
  if (scale && scale.length) return scale;
  return AQI_SCALE.map((b) => ({
    range: `${b.min}–${b.max}`,
    category: b.category,
    color: b.color,
  }));
}

/**
 * WHO 2021 annual guideline values (µg/m³) used for the "vs WHO" comparison.
 * O3 is the peak-season guideline. Pollutants without an annual guideline
 * return null. Mirrors the contract.
 */
export const WHO_GUIDELINES: Partial<Record<PollutantKey, number>> = {
  'PM2.5': 5,
  PM10: 15,
  NO2: 10,
  OZONE: 60,
};

export function whoGuideline(pollutant: PollutantKey): number | null {
  return WHO_GUIDELINES[pollutant] ?? null;
}
