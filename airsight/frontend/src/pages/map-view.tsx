/**
 * MapView — notebook-style geography of Bogotá's air quality, with three modes.
 *
 * "Now (live)" (default): the current Open-Meteo (CAMS) interpolated surface +
 *   live station readings, on the same per-pollutant geographic scale.
 * "2021 analysis": the original RMCAB interpolated surface with pollutant +
 *   period selectors, plus KNN k + grid resolution controls.
 * "Animate (2021)": an hourly time-lapse of the 2021 RMCAB surface, interpolated
 *   hour-by-hour with distance-weighted KNN (k=7) — play / pause / scrub.
 *
 * All three render the same StationMap (heat grid clipped to the city boundary,
 * station circles on the pollutant scale) over the Bogotá outline. Mode +
 * pollutant (+ period/grid for 2021) live in the URL so a view is shareable.
 */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAsync } from '../lib/use-async';
import type { PollutantKey } from '../lib/types';
import { POLLUTANT_KEYS } from '../lib/types';
import {
  pollutantOptions,
  periodOptions,
  pollutantInfo,
  livePollutantOptions,
} from '../lib/options';
import { formatDateTime } from '../lib/format';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { LoadingState, ErrorState, Spinner } from '../components/ui/spinner';
import { StationMap } from '../components/map/station-map';
import { AnimationControls } from '../components/map/animation-controls';
import { PollutantLegend } from '../components/charts/pollutant-legend';

const GRID_RESOLUTION = 32;

/** The six pollutants the live map supports (NO/NOX are 2021-only). */
const LIVE_POLLUTANTS = ['PM2.5', 'PM10', 'NO2', 'OZONE', 'CO', 'SO2'];

/** KNN neighbour counts offered in the 2021 grid + animation controls. */
const K_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 10] as const;

/** Grid resolutions offered in the 2021 analysis controls. */
const RESOLUTION_OPTIONS = [
  { value: '16', label: '16 × 16 (coarse)' },
  { value: '24', label: '24 × 24' },
  { value: '32', label: '32 × 32 (default)' },
  { value: '48', label: '48 × 48 (fine)' },
];

/**
 * Extract the Bogotá boundary ring from the GeoJSON. The feature ships as a
 * LineString of [lon, lat] pairs; we convert to [lat, lon] for Leaflet.
 */
function boundaryFromGeo(
  geo: { features: { geometry: { coordinates: unknown } }[] } | null,
): [number, number][] | undefined {
  const coords = geo?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords)) return undefined;
  // LineString => number[][]; tolerate a Polygon wrapper => number[][][].
  const ring = (Array.isArray(coords[0]?.[0]) ? coords[0] : coords) as number[][];
  const out: [number, number][] = [];
  for (const pair of ring) {
    if (Array.isArray(pair) && pair.length >= 2) {
      out.push([pair[1], pair[0]]); // [lat, lon]
    }
  }
  return out.length >= 3 ? out : undefined;
}

/**
 * Cell half-size for a grid whose resolution isn't known up front: count the
 * distinct lon columns and split the bbox span accordingly (used by both the
 * live grid and the animation grid).
 */
function cellHalfFromCells(
  bbox: { min_lon: number; max_lon: number } | undefined,
  cells: { lon: number }[] | undefined,
): number {
  if (!bbox || !cells?.length) return 0.01;
  const cols = new Set(cells.map((c) => Math.round(c.lon * 1e6))).size || 1;
  return Math.abs(bbox.max_lon - bbox.min_lon) / cols / 2;
}

const MapView: React.FC = () => {
  const [params, setParams] = useSearchParams();
  // Animate is the third mode; it takes precedence over the live/2021 split.
  const animate = params.get('animate') === '1';
  // Default to live — the user asked for a real-time map. (Ignored in animate.)
  const live = !animate && params.get('live') !== '0';
  const period = params.get('period') || 'annual';
  // Grid is ON by default (notebook style); only off when explicitly grid=0.
  const showGrid = params.get('grid') !== '0';
  // 2021 KNN controls (optional; default keeps the original idw/32 surface).
  const kParam = Number(params.get('k'));
  const k = Number.isFinite(kParam) && kParam >= 1 ? Math.round(kParam) : null;
  const resParam = Number(params.get('res'));
  const resolution =
    Number.isFinite(resParam) && resParam >= 8 ? Math.round(resParam) : GRID_RESOLUTION;

  // In live mode the pollutant must be one of the six supported keys; if the URL
  // carries a 2021-only key (NO/NOX) when switching to live, fall back to PM2.5.
  const rawPollutant = (params.get('pollutant') as PollutantKey) || 'PM2.5';
  const pollutant: PollutantKey =
    live && !LIVE_POLLUTANTS.includes(rawPollutant) ? 'PM2.5' : rawPollutant;
  const livePollutant = live ? pollutant : 'PM2.5';
  // Animation covers the seven dataset pollutants; coerce any live-only key.
  const animPollutant: PollutantKey = POLLUTANT_KEYS.includes(rawPollutant)
    ? rawPollutant
    : 'PM2.5';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  // Live / 2021 toggle — unchanged behaviour: sets `live`, clears `animate`.
  const setMode = (next: boolean) => {
    const url = new URLSearchParams(params);
    url.set('live', next ? '1' : '0');
    url.delete('animate');
    // Keep a live-supported pollutant when entering live mode.
    if (next && !LIVE_POLLUTANTS.includes(rawPollutant)) url.set('pollutant', 'PM2.5');
    setParams(url, { replace: true });
  };

  // Animate toggle — enters the third mode; coerces to a dataset pollutant.
  const setAnimate = () => {
    const url = new URLSearchParams(params);
    url.set('animate', '1');
    if (!POLLUTANT_KEYS.includes(rawPollutant)) url.set('pollutant', 'PM2.5');
    setParams(url, { replace: true });
  };

  const meta = useAsync(() => api.meta(), []);
  const geoRes = useAsync(() => api.bogota(), []);

  // --- 2021 analysis data (only fetched in 2021 mode) ---
  const stationsRes = useAsync(
    () => (live || animate ? Promise.resolve(null) : api.stations(pollutant, period)),
    [live, animate, pollutant, period],
  );
  const gridRes = useAsync(
    () =>
      !live && !animate && showGrid
        ? api.grid({
            pollutant,
            period,
            method: k != null ? 'knn' : 'idw',
            k: k ?? undefined,
            resolution,
          })
        : Promise.resolve(null),
    [live, animate, pollutant, period, showGrid, k, resolution],
  );

  // --- Animation data (only fetched in animate mode) ---
  const animRes = useAsync(
    () =>
      animate
        ? api.animation({ pollutant: animPollutant, k: k ?? undefined })
        : Promise.resolve(null),
    [animate, animPollutant, k],
  );

  // --- Live data (only fetched in live mode) ---
  // A 400 (unsupported) / 503 (upstream down) is captured as a soft state so we
  // can show a friendly, specific message instead of a raw error string.
  const liveRes = useAsync(async () => {
    if (!live) return null;
    try {
      const data = await api.liveMap(livePollutant);
      return { ok: true as const, data };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 503)) {
        return { ok: false as const, status: err.status };
      }
      throw err;
    }
  }, [live, livePollutant]);

  const liveData = liveRes.data?.ok ? liveRes.data.data : null;
  const liveSoftStatus = liveRes.data && !liveRes.data.ok ? liveRes.data.status : null;

  const boundary = React.useMemo(() => boundaryFromGeo(geoRes.data), [geoRes.data]);

  // 2021 cell half-size from the grid bbox so rectangles tile cleanly.
  const gridCellHalf = React.useMemo(() => {
    const bbox = gridRes.data?.bbox;
    if (!bbox) return 0.01;
    return Math.abs(bbox.max_lon - bbox.min_lon) / resolution / 2;
  }, [gridRes.data, resolution]);

  // Live cell half-size: derive resolution from the grid's distinct lon columns
  // (the live grid uses a different resolution than the 2021 one).
  const liveGridCellHalf = React.useMemo(
    () => cellHalfFromCells(liveData?.grid?.bbox, liveData?.grid?.cells),
    [liveData],
  );

  // --- Animation frame stepping ---
  const frames = animRes.data?.frames ?? [];
  const [frameIndex, setFrameIndex] = React.useState(0);
  // Reset to the first frame whenever a fresh animation loads (pollutant/k swap).
  React.useEffect(() => {
    setFrameIndex(0);
  }, [animRes.data]);
  const safeIndex = frames.length ? Math.min(frameIndex, frames.length - 1) : 0;
  const currentFrame = frames[safeIndex];
  const frameTimes = React.useMemo(() => frames.map((f) => f.time), [frames]);

  // Animation cell half-size: same column-count trick as the live grid.
  const animGridCellHalf = React.useMemo(
    () => cellHalfFromCells(currentFrame?.grid?.bbox, currentFrame?.grid?.cells),
    [currentFrame],
  );

  // Friendly handling of the live 400/503 soft states (or a hard error string).
  const liveMessage =
    liveSoftStatus === 503
      ? 'Live air-quality data is unavailable right now. Please try again in a moment.'
      : liveSoftStatus === 400
        ? 'This pollutant is not available live. Pick PM2.5, PM10, NO2, Ozone, CO or SO2.'
        : liveRes.error || 'Could not load live data.';

  const liveUnit = liveData?.unit ?? pollutantInfo(meta.data, pollutant)?.unit ?? 'µg/m³';
  const historyUnit =
    stationsRes.data?.unit ?? pollutantInfo(meta.data, pollutant)?.unit ?? 'µg/m³';
  const animUnit =
    animRes.data?.unit ?? pollutantInfo(meta.data, animPollutant)?.unit ?? 'µg/m³';

  return (
    <main>
      <PageContainer className="py-12 md:py-16 flex flex-col gap-8">
        <SectionHeader
          as="h1"
          overline="Map"
          title="Air quality across Bogotá"
          sub="An interpolated surface across the city, clipped to the boundary and coloured by the chosen pollutant. Switch between live conditions now, the 2021 RMCAB analysis, and an hour-by-hour 2021 time-lapse."
        />

        {/* Mode toggle — live (default) vs 2021 analysis vs 2021 animation. */}
        <div
          role="group"
          aria-label="Map mode"
          className="inline-flex w-full max-w-xl border border-line"
        >
          <Button
            variant={live ? 'primary' : 'ghost'}
            rounded="none"
            className="flex-1"
            aria-pressed={live}
            onClick={() => setMode(true)}
          >
            Now (live)
          </Button>
          <Button
            variant={!live && !animate ? 'primary' : 'ghost'}
            rounded="none"
            className="flex-1 border-l border-line"
            aria-pressed={!live && !animate}
            onClick={() => setMode(false)}
          >
            2021 analysis
          </Button>
          <Button
            variant={animate ? 'primary' : 'ghost'}
            rounded="none"
            className="flex-1 border-l border-line"
            aria-pressed={animate}
            onClick={setAnimate}
          >
            Animate (2021)
          </Button>
        </div>

        {/* Controls. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <Select
            label="Pollutant"
            value={animate ? animPollutant : pollutant}
            options={live ? livePollutantOptions() : pollutantOptions(meta.data)}
            onValueChange={(v) => setParam('pollutant', v)}
          />

          {!live && !animate && (
            <>
              <Select
                label="Period"
                value={period}
                options={periodOptions(meta.data)}
                onValueChange={(v) => setParam('period', v)}
              />
              <Select
                label="KNN neighbours (k)"
                value={k != null ? String(k) : 'idw'}
                options={[
                  { value: 'idw', label: 'IDW (default)' },
                  ...K_VALUES.map((kv) => ({ value: String(kv), label: `k = ${kv}` })),
                ]}
                onValueChange={(v) => {
                  const next = new URLSearchParams(params);
                  if (v === 'idw') next.delete('k');
                  else next.set('k', v);
                  setParams(next, { replace: true });
                }}
                hint="IDW weights every station; k limits to the nearest few."
              />
              <Select
                label="Grid resolution"
                value={String(resolution)}
                options={RESOLUTION_OPTIONS}
                onValueChange={(v) => setParam('res', v)}
              />
              <div className="flex flex-col gap-2">
                <span className="text-body-sm font-medium text-ink-700">Heat surface</span>
                <Button
                  variant={showGrid ? 'primary' : 'secondary'}
                  onClick={() => setParam('grid', showGrid ? '0' : '1')}
                  aria-pressed={showGrid}
                >
                  {showGrid ? 'Hide heat surface' : 'Show heat surface'}
                </Button>
              </div>
              {gridRes.loading && showGrid && (
                <div className="flex items-center gap-2 text-body-sm text-ink-500">
                  <Spinner size={18} /> building surface…
                </div>
              )}
            </>
          )}

          {animate && (
            <Select
              label="KNN neighbours (k)"
              value={k != null ? String(k) : '7'}
              options={K_VALUES.map((kv) => ({ value: String(kv), label: `k = ${kv}` }))}
              onValueChange={(v) => {
                const next = new URLSearchParams(params);
                if (v === '7') next.delete('k');
                else next.set('k', v);
                setParams(next, { replace: true });
              }}
              hint="Distance-weighted nearest stations (default k = 7)."
            />
          )}

          {live && liveData?.time && (
            <p className="text-body-md text-ink-900 sm:col-span-2 lg:col-span-3 self-end">
              <span className="font-medium">Updated</span>{' '}
              <span className="tabular-nums">{formatDateTime(liveData.time)}</span>
            </p>
          )}
        </div>

        {/* === LIVE (NOW) MODE === */}
        {live && (
          <>
            {liveRes.loading && <LoadingState label="Loading live conditions…" />}
            {(liveRes.error || liveSoftStatus) && (
              <ErrorState message={liveMessage} onRetry={liveRes.reload} />
            )}

            {liveData && (
              <div className="flex flex-col gap-4">
                <StationMap
                  stations={liveData.stations}
                  unit={liveUnit}
                  colorMode="pollutant"
                  pollutantKey={livePollutant}
                  grid={showGrid ? liveData.grid.cells : null}
                  gridCellHalf={liveGridCellHalf}
                  boundary={boundary}
                  clipGrid={Boolean(boundary)}
                  height={560}
                />
                <PollutantLegend
                  pollutant={livePollutant}
                  unit={liveUnit}
                  className="max-w-reading"
                />
                <p className="text-caption text-ink-500 max-w-reading" role="note">
                  Live data is {liveData.source}, a ~regional model — coarser than the
                  2021 ground sensors, which resolve street-level detail.
                </p>
                {geoRes.error && (
                  <p className="text-caption text-ink-500" role="status">
                    City boundary unavailable — showing the surface and stations unclipped.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* === 2021 ANALYSIS MODE === */}
        {!live && !animate && (
          <>
            {stationsRes.loading && <LoadingState label="Loading stations…" />}
            {stationsRes.error && (
              <ErrorState message={stationsRes.error} onRetry={stationsRes.reload} />
            )}
            {gridRes.error && showGrid && (
              <ErrorState message={gridRes.error} onRetry={gridRes.reload} />
            )}

            {stationsRes.data && (
              <div className="flex flex-col gap-4">
                <StationMap
                  stations={stationsRes.data.stations}
                  unit={historyUnit}
                  colorMode="pollutant"
                  pollutantKey={pollutant}
                  grid={showGrid ? gridRes.data?.cells ?? null : null}
                  gridCellHalf={gridCellHalf}
                  boundary={boundary}
                  clipGrid={Boolean(boundary)}
                  height={560}
                  sparklinePollutant={pollutant}
                />
                <PollutantLegend
                  pollutant={pollutant}
                  unit={historyUnit}
                  className="max-w-reading"
                />
                {geoRes.error && (
                  <p className="text-caption text-ink-500" role="status">
                    City boundary unavailable — showing the surface and stations unclipped.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* === ANIMATE (2021) MODE === */}
        {animate && (
          <>
            {animRes.loading && <LoadingState label="Building the 2021 time-lapse…" />}
            {animRes.error && (
              <ErrorState message={animRes.error} onRetry={animRes.reload} />
            )}

            {animRes.data && currentFrame && (
              <div className="flex flex-col gap-4">
                <p className="text-body-md text-ink-900">
                  <span className="font-medium">Window</span>{' '}
                  <span className="tabular-nums">
                    {formatDateTime(animRes.data.start)} → {formatDateTime(animRes.data.end)}
                  </span>{' '}
                  <span className="text-ink-500">({frames.length} hourly frames)</span>
                </p>

                <AnimationControls
                  times={frameTimes}
                  index={safeIndex}
                  onIndexChange={setFrameIndex}
                />

                <StationMap
                  stations={currentFrame.stations}
                  unit={animUnit}
                  colorMode="pollutant"
                  pollutantKey={animPollutant}
                  grid={currentFrame.grid.cells}
                  gridCellHalf={animGridCellHalf}
                  boundary={boundary}
                  clipGrid={Boolean(boundary)}
                  height={560}
                />
                <PollutantLegend
                  pollutant={animPollutant}
                  unit={animUnit}
                  className="max-w-reading"
                />
                <p className="text-caption text-ink-500 max-w-reading" role="note">
                  This is the 2021 RMCAB surface, interpolated hour-by-hour with
                  distance-weighted KNN (k={animRes.data.k}). A dashed ring marks a station
                  whose reading for that hour was imputed (estimated, not measured).
                </p>
                {geoRes.error && (
                  <p className="text-caption text-ink-500" role="status">
                    City boundary unavailable — showing the surface and stations unclipped.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </PageContainer>
    </main>
  );
};

export default MapView;
