/** Number / unit / date formatting helpers. */

/** Format a measurement, e.g. 12.345 -> "12.3". Null-safe. */
export function formatValue(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Format a value with its unit, e.g. "12.3 µg/m³". Null-safe. */
export function formatWithUnit(
  value: number | null | undefined,
  unit: string,
  digits = 1,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatValue(value, digits)} ${unit}`;
}

/** Round an AQI index to a whole number for display. Null-safe. */
export function formatAqi(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Math.round(value).toString();
}

/** Format a fractional share (0–1) as a percentage, e.g. 0.07 -> "7%". */
export function formatPercentShare(
  share: number | null | undefined,
  digits = 0,
): string {
  if (share == null || Number.isNaN(share)) return '—';
  return `${(share * 100).toFixed(digits)}%`;
}

/** Format a percentage already on a 0–100 scale, e.g. 7 -> "7%". */
export function formatPercent(
  pct: number | null | undefined,
  digits = 1,
): string {
  if (pct == null || Number.isNaN(pct)) return '—';
  return `${pct.toFixed(digits)}%`;
}

/** Format an ISO date "2021-03-01" -> "Mar 2021" (monthly) or "1 Mar 2021". */
export function formatDate(iso: string, mode: 'day' | 'month' = 'day'): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (mode === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a distance in km, e.g. 3.21 -> "3.2 km". */
export function formatKm(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return '—';
  return `${km.toFixed(1)} km`;
}

/** Format coordinates compactly, e.g. "4.6510, -74.1000". */
export function formatCoord(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/**
 * Format an hourly timestamp ("2026-06-15T19:00") as "19:00".
 * Falls back to the raw string when it can't be parsed. Null-safe.
 */
export function formatHour(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = iso.split('T')[1];
  if (t) {
    const hh = t.slice(0, 2);
    if (hh.length === 2) return `${hh}:00`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

/**
 * Format a live reading timestamp ("2026-06-15T19:00") as a readable
 * "15 Jun, 19:00". Falls back to the raw string. Null-safe.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
