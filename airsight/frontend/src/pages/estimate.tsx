/**
 * Estimate — estimate a pollutant at an arbitrary point via /api/interpolate.
 *
 * Form: lat/lon (typed or picked on the map), pollutant, method (IDW / KNN),
 * k slider. Result card shows the value + AQI, a neighbours table, and a small
 * map with the estimate point and its source stations.
 */
import * as React from 'react';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import { useAsync } from '../lib/use-async';
import type {
  EstimateResult,
  InterpolationMethod,
  PollutantKey,
  StationSummary,
} from '../lib/types';
import { pollutantOptions } from '../lib/options';
import { formatAqi, formatKm, formatValue, formatWithUnit } from '../lib/format';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AqiBadge } from '../components/ui/aqi-badge';
import { ErrorState, Spinner } from '../components/ui/spinner';
import { StationMap, type ExtraMarker } from '../components/map/station-map';

// Bogotá center as a sensible default starting point.
const DEFAULT_LAT = 4.65;
const DEFAULT_LON = -74.1;

const Estimate: React.FC = () => {
  const meta = useAsync(() => api.meta(), []);
  const stationsRes = useAsync(() => api.stations('PM2.5', 'annual'), []);

  const [lat, setLat] = React.useState(String(DEFAULT_LAT));
  const [lon, setLon] = React.useState(String(DEFAULT_LON));
  const [pollutant, setPollutant] = React.useState<PollutantKey>('PM2.5');
  const [method, setMethod] = React.useState<InterpolationMethod>('idw');
  const [k, setK] = React.useState(5);

  const [result, setResult] = React.useState<EstimateResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<{ lat?: string; lon?: string }>({});
  const [geoError, setGeoError] = React.useState<string | null>(null);

  // Clicking the map always drops the point — no toggle gate.
  const onMapClick = (clickLat: number, clickLon: number) => {
    setLat(clickLat.toFixed(6));
    setLon(clickLon.toFixed(6));
  };

  // "Use my location" — fill the lat/lon inputs from the browser.
  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not available — enter coordinates or click the map.');
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
      },
      () => {
        setGeoError('Could not get your location — enter coordinates or click the map.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = Number(lat);
    const lonNum = Number(lon);
    const errs: { lat?: string; lon?: string } = {};
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90)
      errs.lat = 'Enter a latitude between -90 and 90.';
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180)
      errs.lon = 'Enter a longitude between -180 and 180.';
    setFieldError(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.interpolate({
        lat: latNum,
        lon: lonNum,
        pollutant,
        period: 'annual',
        method,
        k,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Estimate failed.');
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  const stations: StationSummary[] = stationsRes.data?.stations ?? [];

  // Build extra markers for the result map: the point + each neighbour.
  const extraMarkers: ExtraMarker[] = React.useMemo(() => {
    if (!result) {
      return [{ lat: Number(lat), lon: Number(lon), label: 'Selected point', kind: 'point' }];
    }
    const neighbours: ExtraMarker[] = result.neighbors
      .map((n): ExtraMarker | null => {
        const st = stations.find((s) => s.code === n.code);
        if (!st) return null;
        return {
          lat: st.lat,
          lon: st.lon,
          label: `${n.name}: ${formatWithUnit(n.value, result.unit)} · ${formatKm(n.distance_km)} · w ${formatValue(n.weight, 2)}`,
          kind: 'neighbor',
        };
      })
      .filter((m): m is ExtraMarker => m !== null);
    return [{ lat: result.lat, lon: result.lon, label: 'Estimate', kind: 'point' }, ...neighbours];
  }, [result, lat, lon, stations]);

  return (
    <main>
      <PageContainer className="py-12 md:py-16 flex flex-col gap-8">
        <SectionHeader
          as="h1"
          overline="Estimate"
          title="Estimate air quality between stations"
          sub="Spatial interpolation from the nearest stations. Pick a point, choose a method, and see the estimated annual mean with its AQI."
        />

        <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
          {/* Form */}
          <Card variant="paper" padding="lg" as="form" className="flex flex-col gap-5" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                inputMode="decimal"
                value={lat}
                error={fieldError.lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <Input
                label="Longitude"
                inputMode="decimal"
                value={lon}
                error={fieldError.lon}
                onChange={(e) => setLon(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button type="button" variant="secondary" onClick={useMyLocation}>
                Use my location
              </Button>
              <p className="text-body-sm text-ink-500">
                Tip: click anywhere on the map to drop the point.
              </p>
              {geoError && (
                <p className="text-body-sm text-danger-600" role="status">
                  {geoError}
                </p>
              )}
            </div>

            <Select
              label="Pollutant"
              value={pollutant}
              options={pollutantOptions(meta.data)}
              onValueChange={(v) => setPollutant(v as PollutantKey)}
            />

            <Select
              label="Method"
              value={method}
              hint={
                method === 'idw'
                  ? 'Inverse-distance weighting: nearer stations count more.'
                  : 'K-nearest neighbours: simple average of the k closest stations.'
              }
              options={[
                { value: 'idw', label: 'Inverse distance weighting (IDW)' },
                { value: 'knn', label: 'K-nearest neighbours (KNN)' },
              ]}
              onValueChange={(v) => setMethod(v as InterpolationMethod)}
            />

            <div className="flex flex-col gap-2">
              <label
                htmlFor="k-slider"
                className={cn(
                  'text-body-sm font-medium',
                  method === 'idw' ? 'text-ink-400' : 'text-ink-700',
                )}
              >
                Neighbours (k): {k}
              </label>
              <input
                id="k-slider"
                type="range"
                min={1}
                max={Math.max(1, stations.length || 10)}
                value={k}
                disabled={method === 'idw'}
                aria-disabled={method === 'idw'}
                aria-describedby="k-help"
                onChange={(e) => setK(Number(e.target.value))}
                className="accent-brand-600 h-11 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <p id="k-help" className="text-body-sm text-ink-500">
                {method === 'idw'
                  ? 'k applies to KNN only — IDW uses every station, weighted by distance.'
                  : 'k = how many of the nearest stations are averaged, each weighted by 1/distance. Lower k = more local; higher k = smoother.'}
              </p>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size={18} /> Estimating…
                </>
              ) : (
                'Estimate'
              )}
            </Button>

            {error && <ErrorState message={error} />}
          </Card>

          {/* Map + result */}
          <div className="flex flex-col gap-6">
            <StationMap
              stations={stations}
              extraMarkers={extraMarkers}
              onMapClick={onMapClick}
              unit={stationsRes.data?.unit}
              height={420}
            />
            <p className="text-body-sm text-ink-500">
              Click anywhere on the map to drop the estimate point, then press Estimate.
            </p>

            {result && (
              <Card variant="paper" padding="lg" className="flex flex-col gap-5">
                <CardHeader className="mb-0">
                  <CardTitle>Estimated {result.pollutant}</CardTitle>
                  <p className="text-body-sm text-ink-600">
                    {result.method.toUpperCase()} · k = {result.k} · point{' '}
                    {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                  </p>
                </CardHeader>

                <div className="flex flex-wrap items-end gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="overline text-ink-500">Estimated mean</span>
                    <span className="text-display-lg leading-none font-semibold text-brand-600">
                      {formatValue(result.value)}
                    </span>
                    <span className="text-body-sm text-ink-600">{result.unit}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="overline text-ink-500">Air-quality band</span>
                    <AqiBadge aqi={result.aqi} size="md" />
                    <span className="text-caption text-ink-500">
                      index {formatAqi(result.aqi.value)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-line">
                  <table className="w-full border-collapse text-body-sm">
                    <caption className="sr-only">Source stations used for the estimate</caption>
                    <thead className="bg-surface text-left">
                      <tr>
                        <th scope="col" className="px-4 py-2 font-semibold text-ink-700">
                          Station
                        </th>
                        <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">
                          Distance
                        </th>
                        <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">
                          Value
                        </th>
                        <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">
                          Weight
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.neighbors.map((n) => (
                        <tr key={n.code} className="border-t border-line">
                          <th scope="row" className="px-4 py-2 font-medium text-ink-900 text-left">
                            {n.name}
                          </th>
                          <td className="px-4 py-2 text-right tabular-nums text-ink-600">
                            {formatKm(n.distance_km)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-ink-900">
                            {formatWithUnit(n.value, result.unit)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-ink-600">
                            {formatValue(n.weight, 3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-caption text-ink-500">
                  Estimate dot shown in violet; source stations carry the standard pin. The band
                  colour follows the AQI legend ({result.aqi.category}).
                </p>
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    </main>
  );
};

export default Estimate;
