/**
 * Dashboard — hero + KPI row (/api/overview) + AQI distribution + pollutant vs
 * WHO bars + a compact station map (/api/stations).
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/use-async';
import { categoryColor } from '../lib/aqi';
import { formatAqi, formatPercent, formatWithUnit } from '../lib/format';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Stat } from '../components/ui/stat';
import { Button } from '../components/ui/button';
import { AqiBadge } from '../components/ui/aqi-badge';
import { LoadingState, ErrorState } from '../components/ui/spinner';
import { PollutantBars } from '../components/charts/pollutant-bars';
import { AqiLegend } from '../components/charts/aqi-legend';
import { StationMap } from '../components/map/station-map';

const Dashboard: React.FC = () => {
  const overview = useAsync(() => api.overview(), []);
  const stationsRes = useAsync(() => api.stations('PM2.5', 'annual'), []);

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-line bg-paper">
        <PageContainer className="py-16 md:py-20 flex flex-col gap-5 max-w-reading">
          <span className="overline text-brand-600">Bogotá · RMCAB 2021</span>
          <h1 className="text-h1 md:text-display-lg text-ink-900">Bogotá's air, made legible.</h1>
          <p className="text-body-md text-ink-700 font-medium max-w-hero-subcopy">
            Understand the air you breathe — and know when it's safe to go outside.
          </p>
          <p className="text-body-lg text-ink-600 max-w-hero-subcopy">
            One year of readings from 19 monitoring stations, turned into plain answers: how
            clean the air is, where it's worst, and how it changed month to month.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button as={Link} to="/live">
              Check now
            </Button>
            <Button as={Link} to="/map" variant="secondary">
              Open the map
            </Button>
            <Button as={Link} to="/methodology" variant="ghost">
              How this works
            </Button>
          </div>
        </PageContainer>
      </section>

      <PageContainer className="py-12 md:py-16 flex flex-col gap-16">
        {/* What AirSight is for */}
        <Card variant="paper" padding="lg" className="flex flex-col gap-3">
          <CardHeader className="mb-0">
            <span className="overline text-brand-600">What AirSight is for</span>
            <CardTitle>Clear answers from gappy sensor data</CardTitle>
          </CardHeader>
          <p className="text-body-md text-ink-700 max-w-reading">
            AirSight turns raw, gappy air-quality sensor data into clear, location-specific
            answers. It began as a study of Bogotá's 2021 RMCAB network — filling missing sensor
            readings with combined models and estimating pollution between sparse stations — and
            now adds live conditions so anyone can check the air right now and decide whether to
            go out, exercise, or keep the windows shut.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/live" className="text-body-md font-medium text-brand-600 hover:text-brand-700 underline underline-offset-4 decoration-1">
              Check the air now
            </Link>
            <Link to="/methodology" className="text-body-md font-medium text-brand-600 hover:text-brand-700 underline underline-offset-4 decoration-1">
              How this works
            </Link>
          </div>
        </Card>

        {/* KPIs */}
        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="sr-only">
            Key figures
          </h2>
          {overview.loading && <LoadingState label="Loading overview…" />}
          {overview.error && <ErrorState message={overview.error} onRetry={overview.reload} />}
          {overview.data && (
            <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4 border border-line">
              <div className="bg-paper p-6 flex flex-col gap-3">
                <span className="overline text-ink-500">City AQI (annual PM2.5)</span>
                <div
                  className="text-h1 md:text-display-lg leading-none font-semibold"
                  style={{ color: overview.data.headline_aqi.color || categoryColor(overview.data.headline_aqi.value) }}
                >
                  {formatAqi(overview.data.headline_aqi.value)}
                </div>
                <AqiBadge aqi={overview.data.headline_aqi} showValue={false} />
              </div>
              <Stat
                className="bg-paper p-6"
                value={formatWithUnit(overview.data.avg_pm25, 'µg/m³')}
                label="Annual mean PM2.5 across all stations"
              />
              <Stat
                className="bg-paper p-6"
                value={formatWithUnit(overview.data.avg_pm10, 'µg/m³')}
                label="Annual mean PM10 across all stations"
              />
              <div className="bg-paper p-6 flex flex-col gap-3">
                <span className="overline text-ink-500">Imputed readings</span>
                <div className="text-h1 md:text-display-lg leading-none font-semibold text-brand-600">
                  {formatPercent(overview.data.data_quality.overall_imputed_pct)}
                </div>
                <span className="text-body-md text-ink-700">
                  share of values filled by the source model
                </span>
              </div>
            </div>
          )}
        </section>

        {overview.data && (
          <>
            {/* Best / worst */}
            <section className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Cleanest station</CardTitle>
                </CardHeader>
                <p className="text-h3 text-ink-900">{overview.data.best_station.name}</p>
                <p className="text-body-md text-ink-600">
                  {formatWithUnit(overview.data.best_station.value, 'µg/m³')} annual PM2.5
                </p>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Most polluted station</CardTitle>
                </CardHeader>
                <p className="text-h3 text-ink-900">{overview.data.worst_station.name}</p>
                <p className="text-body-md text-ink-600">
                  {formatWithUnit(overview.data.worst_station.value, 'µg/m³')} annual PM2.5
                </p>
              </Card>
            </section>

            {/* AQI distribution + pollutant vs WHO */}
            <section className="grid gap-8 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <SectionHeader as="h2" overline="Stations by band" title="AQI distribution" />
                <div className="flex flex-col gap-2">
                  {overview.data.aqi_distribution.map((d) => (
                    <div key={d.category} className="flex items-center gap-3">
                      <span
                        className="inline-block h-3 w-3 flex-shrink-0"
                        style={{ backgroundColor: d.color }}
                        aria-hidden
                      />
                      <span className="text-body-sm text-ink-700 w-56">{d.category}</span>
                      <div className="flex-1 h-3 bg-surface">
                        <div
                          className="h-3"
                          style={{
                            backgroundColor: d.color,
                            width: `${Math.min(100, (d.count / overview.data!.meta.stations) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-body-sm tabular-nums text-ink-700 w-8 text-right">
                        {d.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SectionHeader
                  as="h2"
                  overline="City means"
                  title="Pollutants vs WHO guideline"
                />
                <PollutantBars readings={overview.data.pollutant_averages} />
              </div>
            </section>
          </>
        )}

        {/* Compact map */}
        <section className="flex flex-col gap-4">
          <SectionHeader
            as="h2"
            overline="Where"
            title="Stations across the city"
            sub="Annual PM2.5 mean per station, coloured by air-quality band."
            actions={
              <Button as={Link} to="/map" variant="secondary" size="sm">
                Full map
              </Button>
            }
          />
          {stationsRes.loading && <LoadingState label="Loading stations…" />}
          {stationsRes.error && (
            <ErrorState message={stationsRes.error} onRetry={stationsRes.reload} />
          )}
          {stationsRes.data && (
            <>
              <StationMap stations={stationsRes.data.stations} unit={stationsRes.data.unit} height={420} />
              <AqiLegend />
            </>
          )}
        </section>
      </PageContainer>
    </main>
  );
};

export default Dashboard;
