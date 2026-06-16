/**
 * Trends — one continuous 2021 → now timeline for Bogotá's air.
 *
 * Mode A (default) "Continuous (2021 → now)": stitches the 2021 RMCAB ground-
 * sensor city average to the 2022-09 → today Open-Meteo (CAMS) archive for a
 * chosen coordinate, on a single chart. There is an honest Jan–Aug 2022 gap
 * (no free public source) left as a visual break.
 *
 * Mode B "By station (2021)": the original comparison view — station/all +
 * pollutant + daily/monthly on the 2021 RMCAB dataset.
 *
 * Selections are stored in the URL so views are shareable.
 */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAsync } from '../lib/use-async';
import type {
  HistoryPoint,
  PollutantKey,
  StationSummary,
  TimeseriesPoint,
} from '../lib/types';
import { CONTINUOUS_POLLUTANTS, RMCAB_2021_POLLUTANTS } from '../lib/types';
import { pollutantOptions, pollutantInfo } from '../lib/options';
import { formatDate, formatValue } from '../lib/format';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { LoadingState, ErrorState, Spinner } from '../components/ui/spinner';
import {
  TimeSeriesChart,
  ContinuousTimeSeriesChart,
  FlaggedTimeSeriesChart,
  countImputedDominant,
  type SeriesInput,
} from '../components/charts/time-series-chart';

const ALL = 'all';
const MAX_SERIES = 5;

type Mode = 'continuous' | 'station';

// Bogotá city centre — the default coordinate (and the only point that gets the
// 2021 RMCAB prefix, since RMCAB is a Bogotá-only ground network).
const BOGOTA = { lat: 4.65, lon: -74.1 } as const;

const POLLUTANT_LABELS: Record<string, string> = {
  'PM2.5': 'PM2.5',
  PM10: 'PM10',
  NO2: 'NO2',
  OZONE: 'Ozone (O₃)',
  CO: 'CO',
  SO2: 'SO2',
};

const isBogota = (lat: number, lon: number) =>
  Math.abs(lat - BOGOTA.lat) < 1e-6 && Math.abs(lon - BOGOTA.lon) < 1e-6;

const Trends: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as Mode) || 'continuous';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  /** Set several URL params in one push (avoids stale-read clobbering). */
  const setManyParams = (entries: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(entries)) next.set(k, v);
    setParams(next, { replace: true });
  };

  const meta = useAsync(() => api.meta(), []);

  return (
    <main>
      <PageContainer className="py-12 md:py-16 flex flex-col gap-8">
        <SectionHeader
          as="h1"
          overline="Trends"
          title="How Bogotá's air changed, 2021 → now"
          sub="One continuous timeline: 2021 RMCAB ground sensors stitched to the live CAMS archive through today. Or switch to the 2021 station-by-station view."
        />

        {/* Mode toggle (segmented control) */}
        <div
          role="tablist"
          aria-label="Trends view"
          className="inline-flex w-full max-w-md border border-line"
        >
          {(
            [
              { value: 'continuous', label: 'Continuous (2021 → now)' },
              { value: 'station', label: 'By station (2021)' },
            ] as { value: Mode; label: string }[]
          ).map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setParam('mode', m.value)}
                className={
                  'flex-1 min-h-[44px] px-4 py-2 text-body-sm font-medium transition-colors duration-xs ' +
                  (active
                    ? 'bg-brand-600 text-white'
                    : 'bg-paper text-ink-700 hover:bg-ink-100')
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {mode === 'continuous' ? (
          <ContinuousMode
            meta={meta.data}
            setParam={setParam}
            setManyParams={setManyParams}
            params={params}
          />
        ) : (
          <StationMode meta={meta.data} setParam={setParam} params={params} />
        )}
      </PageContainer>
    </main>
  );
};

/* ========================================================================== */
/* MODE A — Continuous (2021 → now)                                           */
/* ========================================================================== */

interface ModeProps {
  meta: Awaited<ReturnType<typeof api.meta>> | null;
  params: URLSearchParams;
  setParam: (key: string, value: string) => void;
  setManyParams: (entries: Record<string, string>) => void;
}

const ContinuousMode: React.FC<ModeProps> = ({
  meta,
  params,
  setParam,
  setManyParams,
}) => {
  const pollutant = (params.get('cp') as string) || 'PM2.5';
  const freq = (params.get('cfreq') as 'daily' | 'monthly') || 'monthly';

  // Location: read from URL, default Bogotá. `lat`/`lon` params override.
  const latParam = params.get('lat');
  const lonParam = params.get('lon');
  const lat = latParam != null && latParam !== '' ? Number(latParam) : BOGOTA.lat;
  const lon = lonParam != null && lonParam !== '' ? Number(lonParam) : BOGOTA.lon;
  const onBogota = isBogota(lat, lon);

  // Manual lat/lon draft inputs (applied on submit).
  const [draftLat, setDraftLat] = React.useState(String(lat));
  const [draftLon, setDraftLon] = React.useState(String(lon));
  const [geoState, setGeoState] = React.useState<'idle' | 'locating' | 'error'>('idle');
  const [geoError, setGeoError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraftLat(String(lat));
    setDraftLon(String(lon));
  }, [lat, lon]);

  const setLocation = (nextLat: number, nextLon: number) => {
    setManyParams({ lat: String(nextLat), lon: String(nextLon) });
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('error');
      setGeoError('Geolocation is not available in this browser.');
      return;
    }
    setGeoState('locating');
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nlat = Number(pos.coords.latitude.toFixed(4));
        const nlon = Number(pos.coords.longitude.toFixed(4));
        setLocation(nlat, nlon);
        setGeoState('idle');
      },
      (err) => {
        setGeoState('error');
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : 'Could not get your location.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const resetToBogota = () => setLocation(BOGOTA.lat, BOGOTA.lon);

  const applyManual = (e: React.FormEvent) => {
    e.preventDefault();
    const nlat = Number(draftLat);
    const nlon = Number(draftLon);
    if (
      Number.isFinite(nlat) &&
      Number.isFinite(nlon) &&
      nlat >= -90 &&
      nlat <= 90 &&
      nlon >= -180 &&
      nlon <= 180
    ) {
      setLocation(nlat, nlon);
    }
  };

  // RMCAB 2021 prefix: only when on the Bogotá default AND the pollutant is one
  // RMCAB carries (SO2 is excluded — no 2021 column).
  const wantsRmcab =
    onBogota && (RMCAB_2021_POLLUTANTS as readonly string[]).includes(pollutant);

  const rmcabRes = useAsync(async () => {
    if (!wantsRmcab) return null;
    return api.timeseries(ALL, pollutant as PollutantKey, freq);
  }, [wantsRmcab, pollutant, freq]);

  // Live archive: always fetched. A 400 (unsupported pollutant) is captured as
  // a soft state so we can still show RMCAB; 503 gets a friendly message.
  const liveRes = useAsync(async () => {
    try {
      const res = await api.history({ lat, lon, pollutant, freq });
      return { ok: true as const, data: res };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 503)) {
        return { ok: false as const, status: err.status, message: err.message };
      }
      throw err;
    }
  }, [lat, lon, pollutant, freq]);

  const rmcabPoints: TimeseriesPoint[] = rmcabRes.data?.points ?? [];
  const livePoints: HistoryPoint[] =
    liveRes.data?.ok && liveRes.data.data ? liveRes.data.data.points : [];

  const unit =
    (liveRes.data?.ok ? liveRes.data.data.unit : undefined) ??
    rmcabRes.data?.unit ??
    pollutantInfo(meta, pollutant as PollutantKey)?.unit ??
    (pollutant === 'CO' ? 'mg/m³' : 'µg/m³');

  // Latest point = "now".
  const latest = livePoints.length
    ? livePoints[livePoints.length - 1]
    : rmcabPoints.length
      ? rmcabPoints[rmcabPoints.length - 1]
      : null;

  const loading = rmcabRes.loading || liveRes.loading;
  // Hard error only if the live fetch threw something unexpected, or RMCAB failed.
  const hardError = liveRes.error || (wantsRmcab ? rmcabRes.error : null);
  const liveSoft = liveRes.data && !liveRes.data.ok ? liveRes.data : null;
  const nothingToShow = !loading && !rmcabPoints.length && !livePoints.length;

  const pollutantSelectOptions = CONTINUOUS_POLLUTANTS.map((k) => ({
    value: k,
    label: POLLUTANT_LABELS[k] ?? k,
  }));

  const reloadAll = () => {
    rmcabRes.reload();
    liveRes.reload();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Controls */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
        <Select
          label="Pollutant"
          value={pollutant}
          options={pollutantSelectOptions}
          onValueChange={(v) => setParam('cp', v)}
          hint={pollutant === 'CO' ? 'Shown in mg/m³.' : undefined}
        />
        <Select
          label="Resolution"
          value={freq}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'daily', label: 'Daily (heavy)' },
          ]}
          onValueChange={(v) => setParam('cfreq', v)}
          hint={freq === 'daily' ? 'Daily pulls thousands of points — slower.' : undefined}
        />
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium text-ink-700">Location</span>
          <p className="text-body-sm text-ink-600">
            {onBogota ? 'Bogotá' : `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
          </p>
        </div>
      </div>

      {/* Location controls */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-body-sm font-medium text-ink-700 mb-1">
          Choose a point
        </legend>
        <div className="flex flex-wrap items-end gap-3">
          <Button
            type="button"
            variant={onBogota ? 'primary' : 'secondary'}
            size="sm"
            onClick={resetToBogota}
          >
            Bogotá (default)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={useMyLocation}
            disabled={geoState === 'locating'}
          >
            {geoState === 'locating' ? (
              <>
                <Spinner size={16} /> Locating…
              </>
            ) : (
              'Use my location'
            )}
          </Button>
          <form onSubmit={applyManual} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-body-sm font-medium text-ink-700">
              Lat
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={draftLat}
                onChange={(e) => setDraftLat(e.target.value)}
                className="w-28 min-h-[44px] px-3 py-2 text-body-md text-ink-900 bg-surface border border-ink-200 rounded-none focus:border-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-body-sm font-medium text-ink-700">
              Lon
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={draftLon}
                onChange={(e) => setDraftLon(e.target.value)}
                className="w-28 min-h-[44px] px-3 py-2 text-body-md text-ink-900 bg-surface border border-ink-200 rounded-none focus:border-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
              />
            </label>
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
          </form>
        </div>
        {geoState === 'error' && geoError && (
          <p role="alert" className="text-body-sm text-danger-600">
            {geoError}
          </p>
        )}
      </fieldset>

      {/* Latest stat */}
      {latest && (
        <p className="text-body-md text-ink-700" aria-live="polite">
          <span className="font-medium text-ink-900">Latest:</span>{' '}
          {formatValue(latest.value)} {unit} ·{' '}
          {formatDate(latest.date, freq === 'monthly' ? 'month' : 'day')}
        </p>
      )}

      {/* Chart */}
      <Card padding="lg" variant="paper">
        {loading && <LoadingState label="Loading the continuous timeline…" />}
        {!loading && hardError && (
          <ErrorState message={hardError} onRetry={reloadAll} />
        )}
        {!loading && !hardError && nothingToShow && liveSoft?.status === 400 && (
          <ErrorState
            message="The live archive doesn't carry this pollutant, and there's no 2021 RMCAB series for this selection. Pick PM2.5, PM10, NO2, Ozone, CO or SO2."
            onRetry={reloadAll}
          />
        )}
        {!loading && !hardError && nothingToShow && liveSoft?.status === 503 && (
          <ErrorState
            message="The live archive (Open-Meteo / CAMS) is unreachable right now. Please try again shortly."
            onRetry={reloadAll}
          />
        )}
        {!loading && !hardError && nothingToShow && !liveSoft && (
          <ErrorState message="No data to plot for this selection." onRetry={reloadAll} />
        )}
        {!loading && !hardError && !nothingToShow && (
          <ContinuousTimeSeriesChart
            rmcab={rmcabPoints}
            live={livePoints}
            unit={unit}
            freq={freq}
            height={380}
          />
        )}
      </Card>

      {/* Honest caption */}
      <div className="flex flex-col gap-2 text-body-sm text-ink-600 max-w-reading">
        {onBogota ? (
          <p>
            2021 is RMCAB ground sensors (Bogotá city average); 2022-09 onward is
            Open-Meteo (CAMS reanalysis) for the selected point. Jan–Aug 2022 has no
            free public source, so it's left as a visual gap. CO is shown in mg/m³.
          </p>
        ) : (
          <p>
            Only the live archive (Open-Meteo / CAMS, 2022-09 → now) is shown for this
            point. The 2021 RMCAB prefix is Bogotá-only and is omitted away from the
            city centre. CO is shown in mg/m³.
          </p>
        )}
        {liveSoft?.status === 400 && rmcabPoints.length > 0 && (
          <p>
            The live archive doesn't carry {POLLUTANT_LABELS[pollutant] ?? pollutant};
            only the 2021 RMCAB series is shown.
          </p>
        )}
        {liveSoft?.status === 503 && rmcabPoints.length > 0 && (
          <p>
            The live archive is temporarily unreachable; showing the 2021 RMCAB series
            only.
          </p>
        )}
      </div>
    </div>
  );
};

/* ========================================================================== */
/* MODE B — By station (2021)  [original behaviour, unchanged]                 */
/* ========================================================================== */

const StationMode: React.FC<Omit<ModeProps, 'setManyParams'>> = ({
  meta,
  params,
  setParam,
}) => {
  const pollutant = (params.get('pollutant') as PollutantKey) || 'PM2.5';
  const freq = (params.get('freq') as 'daily' | 'monthly') || 'monthly';
  const selected = (params.get('stations') || ALL).split(',').filter(Boolean);

  // The imputed-vs-measured overlay applies only when exactly ONE concrete
  // station (not the city average) is selected — single-station context.
  const singleStation =
    selected.length === 1 && selected[0] !== ALL ? selected[0] : null;

  const stationsRes = useAsync(() => api.stations('PM2.5', 'annual'), []);

  const seriesRes = useAsync(async () => {
    const codes = selected.length ? selected : [ALL];
    const responses = await Promise.all(
      codes.map((code) => api.timeseries(code, pollutant, freq)),
    );
    return responses;
  }, [selected.join(','), pollutant, freq]);

  // Flagged (real-vs-imputed) series for the single-station overlay only.
  const flaggedRes = useAsync(async () => {
    if (!singleStation) return null;
    return api.timeseriesFlagged(singleStation, pollutant, freq);
  }, [singleStation, pollutant, freq]);

  const stations: StationSummary[] = stationsRes.data?.stations ?? [];
  const nameFor = (code: string) =>
    code === ALL ? 'City average' : stations.find((s) => s.code === code)?.name ?? code;

  const toggleStation = (code: string) => {
    let next: string[];
    if (code === ALL) {
      next = [ALL];
    } else {
      const base = selected.filter((c) => c !== ALL);
      next = base.includes(code)
        ? base.filter((c) => c !== code)
        : [...base, code].slice(0, MAX_SERIES);
    }
    setParam('stations', next.length ? next.join(',') : ALL);
  };

  const series: SeriesInput[] = (seriesRes.data ?? []).map((r) => ({
    key: r.station,
    name: nameFor(r.station),
    points: r.points,
  }));
  const unit =
    seriesRes.data?.[0]?.unit ?? pollutantInfo(meta, pollutant)?.unit ?? 'µg/m³';

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
        <Select
          label="Pollutant"
          value={pollutant}
          options={pollutantOptions(meta)}
          onValueChange={(v) => setParam('pollutant', v)}
        />
        <Select
          label="Resolution"
          value={freq}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'daily', label: 'Daily' },
          ]}
          onValueChange={(v) => setParam('freq', v)}
        />
      </div>

      {/* Station selector chips */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-body-sm font-medium text-ink-700 mb-1">
          Series to plot (max {MAX_SERIES} stations)
        </legend>
        <div className="flex flex-wrap gap-2">
          {[
            { code: ALL, name: 'City average' },
            ...stations.map((s) => ({ code: s.code, name: s.name })),
          ].map((s) => {
            const active =
              selected.includes(s.code) || (s.code === ALL && !selected.length);
            return (
              <button
                key={s.code}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStation(s.code)}
                className={
                  'min-h-[44px] px-3 py-2 text-body-sm border transition-colors duration-xs ' +
                  (active
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-paper text-ink-700 border-line hover:border-ink-300')
                }
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Card padding="lg" variant="paper">
        {singleStation ? (
          <>
            {(seriesRes.loading || flaggedRes.loading) && (
              <LoadingState label="Loading time series…" />
            )}
            {!seriesRes.loading &&
              !flaggedRes.loading &&
              (seriesRes.error || flaggedRes.error) && (
                <ErrorState
                  message={seriesRes.error ?? flaggedRes.error ?? 'Something went wrong.'}
                  onRetry={() => {
                    seriesRes.reload();
                    flaggedRes.reload();
                  }}
                />
              )}
            {!seriesRes.loading &&
              !flaggedRes.loading &&
              !seriesRes.error &&
              !flaggedRes.error &&
              flaggedRes.data && (
                <FlaggedTimeSeriesChart
                  points={flaggedRes.data.points}
                  unit={flaggedRes.data.unit || unit}
                  freq={freq}
                  height={380}
                  showBrush
                />
              )}
          </>
        ) : (
          <>
            {seriesRes.loading && <LoadingState label="Loading time series…" />}
            {seriesRes.error && (
              <ErrorState message={seriesRes.error} onRetry={seriesRes.reload} />
            )}
            {seriesRes.data && !seriesRes.loading && (
              <TimeSeriesChart
                series={series}
                unit={unit}
                freq={freq}
                height={380}
                showBrush
              />
            )}
          </>
        )}
      </Card>

      {singleStation ? (
        <div className="flex flex-col gap-2 text-body-sm text-ink-600 max-w-reading">
          <p>
            <span className="font-medium text-ink-900">
              {nameFor(singleStation)}
            </span>{' '}
            — 2021 RMCAB ground sensor. The violet line is the measured value;{' '}
            <span
              className="font-medium"
              style={{ color: '#D97706' }}
            >
              amber dots
            </span>{' '}
            mark periods where the model filled the majority of the underlying
            hours.
          </p>
          {flaggedRes.data &&
            (() => {
              const imputed = countImputedDominant(flaggedRes.data.points);
              const total = flaggedRes.data.points.filter(
                (p) => p.value != null,
              ).length;
              return (
                <p>
                  <span className="font-medium text-ink-900">imputed_share</span>{' '}
                  is the fraction of the period's hours that were model-filled
                  rather than measured.{' '}
                  {imputed > 0
                    ? `${imputed} of ${total} ${
                        freq === 'monthly' ? 'months' : 'days'
                      } here are mostly model-filled (over half the hours).`
                    : 'No period here is mostly model-filled — this station is well measured for this pollutant.'}{' '}
                  Drag the handles below the chart to zoom a date window. Select
                  more than one station to switch back to the compare view.
                </p>
              );
            })()}
        </div>
      ) : (
        <p className="text-body-sm text-ink-600 max-w-reading">
          2021 RMCAB ground sensors. Pick a pollutant and compare up to five
          stations against the city average. Select a single station to see which
          periods were measured versus model-filled. Drag the handles below the
          chart to zoom a date window.
        </p>
      )}

      {stationsRes.error && (
        <ErrorState message={stationsRes.error} onRetry={stationsRes.reload} />
      )}
    </div>
  );
};

export default Trends;
