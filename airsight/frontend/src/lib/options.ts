/** Shared dropdown options derived from the contract. */
import type { Meta, PollutantKey, PollutantMeta } from './types';
import { CONTINUOUS_POLLUTANTS, POLLUTANT_KEYS } from './types';
import type { SelectOption } from '../components/ui/select';

/** Human labels for pollutant keys (incl. live-only SO2). */
const POLLUTANT_LABELS: Record<string, string> = {
  'PM2.5': 'PM2.5',
  PM10: 'PM10',
  NO2: 'NO2',
  OZONE: 'Ozone (O₃)',
  CO: 'CO',
  SO2: 'SO2',
};

/** Pollutant options from meta (falls back to canonical keys/labels). */
export function pollutantOptions(meta?: Meta | null): SelectOption[] {
  if (meta?.pollutants?.length) {
    return meta.pollutants.map((p) => ({ value: p.key, label: p.label }));
  }
  return POLLUTANT_KEYS.map((k) => ({ value: k, label: k }));
}

/**
 * The six pollutants the live (Open-Meteo / CAMS) map supports:
 * PM2.5, PM10, NO2, OZONE, CO, SO2. NO/NOX are 2021-only and rejected live.
 */
export function livePollutantOptions(): SelectOption[] {
  return CONTINUOUS_POLLUTANTS.map((k) => ({ value: k, label: POLLUTANT_LABELS[k] ?? k }));
}

/** Look up a pollutant's descriptor (unit, name) from meta. */
export function pollutantInfo(
  meta: Meta | null | undefined,
  key: PollutantKey,
): PollutantMeta | undefined {
  return meta?.pollutants?.find((p) => p.key === key);
}

/** Period options: annual + each month of the dataset's year. */
export function periodOptions(meta?: Meta | null): SelectOption[] {
  const year = meta?.year ?? 2021;
  const months = Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const label = new Date(`${year}-${mm}-01T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
    });
    return { value: `${year}-${mm}`, label: `${label} ${year}` };
  });
  return [{ value: 'annual', label: 'Annual (2021)' }, ...months];
}
