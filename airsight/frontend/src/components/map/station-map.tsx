/**
 * StationMap — react-leaflet map of Bogotá's RMCAB stations.
 *
 * Features:
 * - OpenStreetMap tiles, centered on Bogotá (~[4.65, -74.1]) at zoom 11.
 * - One CircleMarker per station, coloured either by AQI category (data legend)
 *   or by the per-pollutant geographic scale (see `colorMode`).
 * - Popups with station name, value and AQI.
 * - Optional interpolated heat grid drawn as coloured Rectangles, optionally
 *   clipped to a city boundary ring (notebook-style).
 * - Optional click handler to capture a lat/lon (used by the Estimate page).
 * - Optional extra markers (e.g. an estimate point + its neighbours).
 * - Optional boundary outline drawn as a thin violet Polygon.
 *
 * The default Leaflet marker-icon 404 is fixed by pointing the icon URLs at the
 * CDN copies (Vite would otherwise mangle the bundled asset paths).
 */
import * as React from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { GridCell, PollutantKey, StationSummary } from '../../lib/types';
import { categoryColor, categoryName } from '../../lib/aqi';
import { pollutantColor, pointInRing } from '../../lib/palette';
import { formatAqi, formatValue, formatWithUnit } from '../../lib/format';
import { api } from '../../lib/api';
import type { TimeseriesPoint } from '../../lib/types';

// --- Fix the default marker icon (Leaflet's bundled paths break under Vite) ---
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const BOGOTA_CENTER: [number, number] = [4.65, -74.1];

export interface ExtraMarker {
  lat: number;
  lon: number;
  label: string;
  /** 'point' = estimate location (violet), 'neighbor' = source station (grey). */
  kind: 'point' | 'neighbor';
}

/** How map colours are encoded. */
export type ColorMode = 'aqi' | 'pollutant';

/**
 * A station the map can plot. The historical `StationSummary` carries
 * `locality`/`zone`/`type`; the live source (Open-Meteo / CAMS) does not, so
 * those are optional here. The popup omits the locality line gracefully when
 * it's absent, keeping both callers working.
 *
 * `aqi` and `unit` are optional too: the animation source reports a raw value
 * + an `imputed` flag, but no per-station unit or AQI. When `imputed` is true
 * the marker gains a distinct outer ring and an "estimated" note in its popup.
 * Existing callers (Now / 2021 / Estimate) pass stations without `imputed`, so
 * the ring never appears for them. The popup falls back to the map-level `unit`.
 */
export type MapStation = Omit<
  StationSummary,
  'locality' | 'zone' | 'type' | 'aqi' | 'unit'
> &
  Partial<Pick<StationSummary, 'locality' | 'zone' | 'type' | 'aqi' | 'unit'>> & {
    imputed?: boolean;
  };

export interface StationMapProps {
  stations?: MapStation[];
  grid?: GridCell[] | null;
  /** Half-size of a grid cell in degrees (used to draw rectangles). */
  gridCellHalf?: number;
  unit?: string;
  height?: number;
  zoom?: number;
  onMapClick?: (lat: number, lon: number) => void;
  extraMarkers?: ExtraMarker[];
  onStationClick?: (code: string) => void;
  /**
   * Colour encoding: 'aqi' (default) keeps the existing AQI-legend colours;
   * 'pollutant' colours both the grid and the station circles by the
   * per-pollutant geographic scale (notebook style).
   */
  colorMode?: ColorMode;
  /**
   * Pollutant key required when colorMode='pollutant' (drives the scale).
   * Accepts any pollutant string the palette knows (incl. live-only SO2).
   */
  pollutantKey?: PollutantKey | string;
  /**
   * City boundary as [lat, lon] pairs. Drawn as a thin violet outline; when
   * `clipGrid` is on, grid cells outside this ring are not rendered.
   */
  boundary?: [number, number][];
  /** When true, only render grid cells whose centre is inside `boundary`. */
  clipGrid?: boolean;
  /**
   * Optional: when set (e.g. in 2021 mode), opening a station popup lazily
   * fetches that station's monthly series for this pollutant and shows a tiny
   * sparkline. Failures are swallowed — the popup always works without it.
   */
  sparklinePollutant?: PollutantKey | string;
}

/** Internal: forwards map clicks to the parent. */
const ClickCapture: React.FC<{ onMapClick: (lat: number, lon: number) => void }> = ({
  onMapClick,
}) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

/**
 * Internal: a tiny monthly sparkline shown inside a station popup. Leaflet only
 * mounts popup contents when the popup opens, so this fetches lazily (on mount)
 * — one request per popup-open. Any failure is swallowed and nothing renders;
 * the popup never blocks on it. Drawn as a minimal inline SVG (no chart lib).
 */
const SPARK_W = 168;
const SPARK_H = 36;

const StationSparkline: React.FC<{
  code: string;
  pollutant: PollutantKey | string;
  color: string;
}> = ({ code, pollutant, color }) => {
  const [points, setPoints] = React.useState<TimeseriesPoint[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setPoints(null);
    setFailed(false);
    api
      .timeseries(code, pollutant as PollutantKey, 'monthly')
      .then((res) => {
        if (active) setPoints(res.points);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [code, pollutant]);

  if (failed) return null;
  if (points == null) {
    return <span className="text-ink-400 text-caption">loading trend…</span>;
  }

  const values = points
    .map((p) => p.value)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = points.length;

  // Build the polyline; skip null gaps by starting a new segment.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.value == null || Number.isNaN(p.value)) {
      if (current.length) segments.push(current.join(' '));
      current = [];
      return;
    }
    const x = n <= 1 ? 0 : (i / (n - 1)) * (SPARK_W - 2) + 1;
    const y = SPARK_H - 1 - ((p.value - min) / span) * (SPARK_H - 2);
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length) segments.push(current.join(' '));

  return (
    <span className="mt-1 flex flex-col gap-0.5">
      <span className="text-caption text-ink-500">Monthly trend (2021)</span>
      <svg
        width={SPARK_W}
        height={SPARK_H}
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        role="img"
        aria-label={`Monthly ${pollutant} trend, ${formatValue(min)} to ${formatValue(max)}`}
      >
        {segments.map((pts, i) => (
          <polyline
            key={i}
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  );
};

export const StationMap: React.FC<StationMapProps> = ({
  stations = [],
  grid,
  gridCellHalf = 0.01,
  unit = 'µg/m³',
  height = 460,
  zoom = 11,
  onMapClick,
  extraMarkers = [],
  onStationClick,
  colorMode = 'aqi',
  pollutantKey = 'PM2.5',
  boundary,
  clipGrid = false,
  sparklinePollutant,
}) => {
  // Boundary as a [lon, lat] ring for the point-in-polygon clip test.
  const clipRing = React.useMemo<[number, number][] | null>(() => {
    if (!boundary || boundary.length < 3) return null;
    return boundary.map(([lat, lon]) => [lon, lat] as [number, number]);
  }, [boundary]);

  const useClip = clipGrid && clipRing != null;

  return (
    <div className="border border-line" style={{ height }}>
      <MapContainer
        center={BOGOTA_CENTER}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onMapClick && <ClickCapture onMapClick={onMapClick} />}

        {/* Interpolated heat grid (drawn under the markers). Cells are coloured
            by AQI or the per-pollutant scale, and optionally clipped to the
            city boundary so the grid hugs Bogotá (notebook style). */}
        {grid?.map((cell, i) => {
          if (cell.value == null) return null;
          if (useClip && clipRing && !pointInRing(cell.lat, cell.lon, clipRing)) {
            return null;
          }
          const fill =
            colorMode === 'pollutant'
              ? pollutantColor(pollutantKey, cell.value)
              : cell.aqi?.color || '#9CA3AF';
          return (
            <Rectangle
              key={`cell-${i}`}
              bounds={[
                [cell.lat - gridCellHalf, cell.lon - gridCellHalf],
                [cell.lat + gridCellHalf, cell.lon + gridCellHalf],
              ]}
              pathOptions={{
                color: fill,
                fillColor: fill,
                fillOpacity: 0.45,
                weight: 0,
              }}
            />
          );
        })}

        {/* City boundary outline — thin violet, no fill (brand chrome colour). */}
        {boundary && boundary.length >= 3 && (
          <Polygon
            positions={boundary}
            pathOptions={{ color: '#7C3AED', weight: 1.5, fill: false }}
          />
        )}

        {/* Station markers, coloured by AQI category or the pollutant scale.
            When a station is flagged `imputed`, an extra dashed outer ring is
            drawn behind it (and its popup says "estimated"). */}
        {stations.map((s) => {
          const color =
            colorMode === 'pollutant'
              ? pollutantColor(pollutantKey, s.value)
              : s.aqi?.color || categoryColor(s.aqi?.value);
          const category = s.aqi?.category || categoryName(s.aqi?.value);
          const hasAqi = s.aqi != null && s.aqi.value != null;
          return (
            <React.Fragment key={s.code}>
              {/* Imputed/estimated stations: distinct outer ring (no fill). */}
              {s.imputed && (
                <CircleMarker
                  center={[s.lat, s.lon]}
                  radius={14}
                  interactive={false}
                  pathOptions={{
                    color,
                    weight: 2,
                    opacity: 0.9,
                    fill: false,
                    dashArray: '3 3',
                  }}
                />
              )}
              <CircleMarker
                center={[s.lat, s.lon]}
                radius={9}
                pathOptions={{
                  color: '#FFFFFF',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.9,
                }}
                eventHandlers={onStationClick ? { click: () => onStationClick(s.code) } : undefined}
              >
                <Popup>
                  <div className="flex flex-col gap-1">
                    <strong className="text-ink-900">{s.name}</strong>
                    {s.locality && <span className="text-ink-600">{s.locality}</span>}
                    <span className="text-ink-700">{formatWithUnit(s.value, s.unit || unit)}</span>
                    {s.imputed && (
                      <span className="text-ink-500 italic">estimated (imputed reading)</span>
                    )}
                    {hasAqi && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        AQI {formatAqi(s.aqi?.value)} — {category}
                      </span>
                    )}
                    {sparklinePollutant && (
                      <StationSparkline
                        code={s.code}
                        pollutant={sparklinePollutant}
                        color={color}
                      />
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}

        {/* Extra markers: estimate point + neighbours. */}
        {extraMarkers.map((m, i) =>
          m.kind === 'point' ? (
            <CircleMarker
              key={`extra-${i}`}
              center={[m.lat, m.lon]}
              radius={10}
              pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#7C3AED', fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]}>
                {m.label}
              </Tooltip>
            </CircleMarker>
          ) : (
            <Marker key={`extra-${i}`} position={[m.lat, m.lon]}>
              <Popup>{m.label}</Popup>
            </Marker>
          ),
        )}
      </MapContainer>
    </div>
  );
};
