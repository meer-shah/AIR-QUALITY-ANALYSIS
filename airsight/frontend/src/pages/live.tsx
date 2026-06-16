/**
 * Now — live, real-time "is it OK to go out?" for a coordinate (/api/live).
 *
 * On mount we try the browser geolocation; on denial/error we fall back to
 * Bogotá centre. A "Use my location" button re-requests, and a manual lat/lon
 * pair lets the page work without geolocation permission.
 *
 * The hero verdict uses the AQI legend colour (data encoding only) as a left
 * accent + status dot; all chrome (buttons, chips) stays MarcVista violet/ink.
 */
import * as React from 'react';
import { api, ApiError } from '../lib/api';
import type { GoOutStatus, Live as LiveData } from '../lib/types';
import {
  formatAqi,
  formatCoord,
  formatDateTime,
  formatValue,
} from '../lib/format';
import { categoryColor } from '../lib/aqi';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingState, ErrorState } from '../components/ui/spinner';
import { ForecastChart } from '../components/charts/forecast-chart';

// Bogotá centre — used until the browser grants location.
const DEFAULT_LAT = 4.65;
const DEFAULT_LON = -74.1;

interface Coords {
  lat: number;
  lon: number;
}

/** Map the go-out status to a short label + neutral tone (chrome, not AQI). */
const STATUS_LABEL: Record<GoOutStatus, string> = {
  yes: 'OK to go out',
  caution: 'Take care',
  limit: 'Limit time outside',
  no: 'Stay indoors',
  unknown: 'No live reading',
};

const Live: React.FC = () => {
  const [coords, setCoords] = React.useState<Coords>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
  });
  // Whether the current coords came from the browser (vs the Bogotá default).
  const [located, setLocated] = React.useState(false);
  const [geoMsg, setGeoMsg] = React.useState<string | null>(
    'Showing Bogotá — allow location for your area.',
  );

  // Manual lat/lon inputs (work even without geolocation permission).
  const [latInput, setLatInput] = React.useState(String(DEFAULT_LAT));
  const [lonInput, setLonInput] = React.useState(String(DEFAULT_LON));
  const [fieldError, setFieldError] = React.useState<{ lat?: string; lon?: string }>({});

  // Live data fetch — managed locally (not useAsync) so we can branch on the
  // HTTP status (503 = upstream unreachable) for a friendlier message.
  const [data, setData] = React.useState<LiveData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = React.useState(0);
  const reload = React.useCallback(() => setReloadNonce((n) => n + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .live(coords.lat, coords.lon)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 503) {
          setError(
            'Live data is unavailable right now — the upstream source could not be reached. Try again shortly.',
          );
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Could not load live data.');
        }
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [coords.lat, coords.lon, reloadNonce]);

  const requestLocation = React.useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoMsg('Geolocation is not available — showing Bogotá. Enter coordinates below.');
      return;
    }
    setGeoMsg('Requesting your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lon });
        setLatInput(String(lat));
        setLonInput(String(lon));
        setLocated(true);
        setGeoMsg(null);
      },
      () => {
        setGeoMsg('Showing Bogotá — allow location for your area.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  // Try geolocation once on mount.
  React.useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const checkManual = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latInput);
    const lon = Number(lonInput);
    const errs: { lat?: string; lon?: string } = {};
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      errs.lat = 'Enter a latitude between -90 and 90.';
    if (!Number.isFinite(lon) || lon < -180 || lon > 180)
      errs.lon = 'Enter a longitude between -180 and 180.';
    setFieldError(errs);
    if (Object.keys(errs).length) return;
    setCoords({ lat, lon });
    setLocated(true);
    setGeoMsg(null);
  };

  const accent = data ? data.aqi.color || categoryColor(data.aqi.value) : categoryColor(null);
  const status = data?.advice.ok_to_go_out ?? 'unknown';

  return (
    <main>
      <PageContainer className="py-12 md:py-16 flex flex-col gap-8">
        <SectionHeader
          as="h1"
          overline="Now"
          title="Is it OK to go out right now?"
          sub="Live air quality for your location, with a plain go-out verdict and today's hourly forecast."
        />

        {/* Location controls */}
        <Card variant="paper" padding="lg" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={requestLocation}>
              Use my location
            </Button>
            <span className="text-body-sm text-ink-600">
              {located ? (
                <>Showing {formatCoord(coords.lat, coords.lon)}.</>
              ) : (
                geoMsg ?? `Showing ${formatCoord(coords.lat, coords.lon)}.`
              )}
            </span>
          </div>

          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={checkManual}>
            <div className="grid grid-cols-2 gap-4 sm:max-w-md flex-1">
              <Input
                label="Latitude"
                inputMode="decimal"
                value={latInput}
                error={fieldError.lat}
                onChange={(e) => setLatInput(e.target.value)}
              />
              <Input
                label="Longitude"
                inputMode="decimal"
                value={lonInput}
                error={fieldError.lon}
                onChange={(e) => setLonInput(e.target.value)}
              />
            </div>
            <Button type="submit" className="sm:mb-0">
              Check
            </Button>
          </form>
        </Card>

        {/* States */}
        {loading && <LoadingState label="Reading live air quality…" />}

        {error && !loading && <ErrorState message={error} onRetry={reload} />}

        {data && (
          <>
            {/* HERO VERDICT */}
            <Card
              variant="paper"
              padding="lg"
              className="flex flex-col gap-5 border-l-4"
              style={{ borderLeftColor: accent }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <span
                    className="inline-flex items-center gap-2 self-start border border-line px-3 py-1 text-body-sm font-medium text-ink-900"
                    role="status"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    {STATUS_LABEL[status]}
                  </span>
                  <h2 className="text-h2 md:text-h1 text-ink-900">{data.advice.headline}</h2>
                  <p className="text-body-lg text-ink-600 max-w-reading">{data.advice.detail}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="overline text-ink-500">Air-quality index</span>
                  <span
                    className="text-display-lg leading-none font-semibold tabular-nums"
                    style={{ color: accent }}
                  >
                    {formatAqi(data.aqi.value)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-caption font-medium text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {data.aqi.category}
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-body-sm sm:grid-cols-4">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-ink-500">Dominant pollutant</dt>
                  <dd className="font-medium text-ink-900">{data.aqi.dominant ?? '—'}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-ink-500">Location</dt>
                  <dd className="font-medium text-ink-900 tabular-nums">
                    {formatCoord(data.lat, data.lon)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-ink-500">Reading time</dt>
                  <dd className="font-medium text-ink-900">
                    {formatDateTime(data.time)}
                    {data.timezone ? ` · ${data.timezone}` : ''}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-ink-500">Live data</dt>
                  <dd className="font-medium text-ink-900">{data.source}</dd>
                </div>
              </dl>
            </Card>

            {/* POLLUTANT BREAKDOWN */}
            <section className="flex flex-col gap-4">
              <SectionHeader as="h2" overline="Right now" title="Pollutant breakdown" />
              <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
                {data.pollutants.map((p) => {
                  const dotColor = categoryColor(p.sub_aqi);
                  return (
                    <div key={p.key} className="flex flex-col gap-1.5 bg-paper p-4">
                      <span className="text-body-sm font-medium text-ink-700">{p.label}</span>
                      <span className="text-h4 tabular-nums text-ink-900">
                        {formatValue(p.value)}
                        <span className="ml-1 text-caption font-normal text-ink-500">{p.unit}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-caption text-ink-600">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: dotColor }}
                          aria-hidden
                        />
                        sub-AQI {formatAqi(p.sub_aqi)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FORECAST */}
            <section className="flex flex-col gap-4" aria-labelledby="forecast-heading">
              <Card variant="paper" padding="lg" className="flex flex-col gap-4">
                <CardHeader className="mb-0">
                  <CardTitle id="forecast-heading">Today's air-quality index (hourly)</CardTitle>
                  <p className="text-body-sm text-ink-600">
                    US AQI by hour for the selected location, from {data.source}.
                  </p>
                </CardHeader>
                <ForecastChart points={data.forecast} />
              </Card>
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
};

export default Live;
