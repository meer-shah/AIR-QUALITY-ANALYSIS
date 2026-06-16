/**
 * Explore — exploratory analysis of the 2021 RMCAB dataset.
 *
 * One api.explore() call is made on mount; every section slices that single
 * payload (correlation, distributions, scatter, box-plots, profiles). Section
 * controls are local component state only — no extra network calls.
 *
 * Sections:
 *   1. Pearson correlation heatmap (the only diverging data scale in the app)
 *   2. Distribution histogram (station + pollutant)
 *   3. Density scatter (X + Y pollutant)
 *   4. Box plot per station (pollutant)
 *   5. Diurnal + weekly profiles (pollutant + station)
 */
import * as React from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/use-async';
import type { ExploreResponse, Meta, PollutantKey } from '../lib/types';
import { pollutantInfo } from '../lib/options';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import type { SelectOption } from '../components/ui/select';
import { LoadingState, ErrorState } from '../components/ui/spinner';
import { CorrelationHeatmap } from '../components/charts/correlation-heatmap';
import { DistributionHistogram } from '../components/charts/distribution-histogram';
import { ScatterDensity } from '../components/charts/scatter-density';
import { BoxPlot } from '../components/charts/box-plot';
import { ProfileChart } from '../components/charts/profile-chart';

const ALL = 'all';

/**
 * PM2.5 reference line. /api/meta carries no WHO guideline for the explore
 * pollutants, so we fall back to the spec's recommended 12 µg/m³. (The WHO 2021
 * annual guideline is 5 µg/m³; swap WHO_PM25 in if meta ever exposes it.)
 */
const WHO_PM25: number | null = null;
const PM25_FALLBACK = 12;

/** Pollutant unit, from meta when present, else a sensible default. */
function unitFor(meta: Meta | null | undefined, key: string): string {
  const info = pollutantInfo(meta, key as PollutantKey);
  if (info?.unit) return info.unit;
  return key === 'CO' ? 'mg/m³' : 'µg/m³';
}

/** Pollutant label, from meta when present, else the raw key. */
function labelFor(meta: Meta | null | undefined, key: string): string {
  return pollutantInfo(meta, key as PollutantKey)?.label ?? key;
}

const Explore: React.FC = () => {
  // Single payload for the whole page, plus meta for labels/units.
  const exploreRes = useAsync(() => api.explore(), []);
  const metaRes = useAsync(() => api.meta(), []);

  return (
    <main>
      <PageContainer className="py-12 md:py-16 flex flex-col gap-10">
        <SectionHeader
          as="h1"
          overline="Explore"
          title="Explore the 2021 data"
          sub="Correlations, distributions, station spreads and daily and weekly rhythms — sliced from one precomputed analysis."
        />
        <p className="text-body-sm text-ink-500 max-w-reading -mt-4">
          Source: 2021 RMCAB dataset (Bogotá ground-sensor network).
        </p>

        {exploreRes.loading && (
          <Card padding="lg" variant="paper">
            <LoadingState label="Loading the exploratory analysis…" />
          </Card>
        )}
        {!exploreRes.loading && exploreRes.error && (
          <ErrorState message={exploreRes.error} onRetry={exploreRes.reload} />
        )}
        {!exploreRes.loading && !exploreRes.error && exploreRes.data && (
          <ExploreSections data={exploreRes.data} meta={metaRes.data} />
        )}
      </PageContainer>
    </main>
  );
};

interface SectionsProps {
  data: ExploreResponse;
  meta: Meta | null;
}

const ExploreSections: React.FC<SectionsProps> = ({ data, meta }) => {
  const pollutants = data.pollutants;
  const stations = data.stations;

  const pollutantOpts: SelectOption[] = pollutants.map((p) => ({
    value: p,
    label: labelFor(meta, p),
  }));
  const stationOpts: SelectOption[] = [
    { value: ALL, label: 'All stations' },
    ...stations.map((s) => ({ value: s, label: s })),
  ];

  const firstPollutant = pollutants[0] ?? 'PM2.5';
  const pm10 = pollutants.includes('PM10') ? 'PM10' : pollutants[1] ?? firstPollutant;

  // Per-section local state (no refetching — all slices of `data`).
  const [distStation, setDistStation] = React.useState(ALL);
  const [distPollutant, setDistPollutant] = React.useState(firstPollutant);
  const [scatterX, setScatterX] = React.useState(firstPollutant);
  const [scatterY, setScatterY] = React.useState(pm10);
  const [boxPollutant, setBoxPollutant] = React.useState(firstPollutant);
  const [profPollutant, setProfPollutant] = React.useState(firstPollutant);
  const [profStation, setProfStation] = React.useState(ALL);

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Correlation ---------------------------------------------------- */}
      <Card as="section" padding="lg" variant="paper" aria-labelledby="corr-h">
        <h2 id="corr-h" className="text-h3 text-ink-900 mb-2">
          Pearson correlation
        </h2>
        <p className="text-body-sm text-ink-600 mb-6 max-w-reading">
          How each pollutant moves with the others across all hours and stations. Violet is a
          positive relationship, blue a negative one.
        </p>
        <CorrelationHeatmap data={data.correlation} />
      </Card>

      {/* 2. Distribution -------------------------------------------------- */}
      <Card as="section" padding="lg" variant="paper" aria-labelledby="dist-h">
        <h2 id="dist-h" className="text-h3 text-ink-900 mb-2">
          Distribution
        </h2>
        <p className="text-body-sm text-ink-600 mb-6 max-w-reading">
          How many hours fell into each concentration band over 2021.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl mb-6">
          <Select
            label="Station"
            value={distStation}
            options={stationOpts}
            onValueChange={setDistStation}
          />
          <Select
            label="Pollutant"
            value={distPollutant}
            options={pollutantOpts}
            onValueChange={setDistPollutant}
          />
        </div>
        {data.distributions[distPollutant] ? (
          <DistributionHistogram
            data={data.distributions[distPollutant]}
            seriesKey={distStation}
            unit={unitFor(meta, distPollutant)}
          />
        ) : (
          <p className="text-body-sm text-ink-500">No distribution for this pollutant.</p>
        )}
      </Card>

      {/* 3. Scatter ------------------------------------------------------- */}
      <Card as="section" padding="lg" variant="paper" aria-labelledby="scatter-h">
        <h2 id="scatter-h" className="text-h3 text-ink-900 mb-2">
          Density scatter
        </h2>
        <p className="text-body-sm text-ink-600 mb-6 max-w-reading">
          Each dot is one sampled hour. Darker clouds mark where readings concentrate.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl mb-6">
          <Select
            label="X axis"
            value={scatterX}
            options={pollutantOpts}
            onValueChange={setScatterX}
          />
          <Select
            label="Y axis"
            value={scatterY}
            options={pollutantOpts}
            onValueChange={setScatterY}
          />
        </div>
        <ScatterDensity
          sample={data.scatter}
          xKey={scatterX}
          yKey={scatterY}
          xUnit={unitFor(meta, scatterX)}
          yUnit={unitFor(meta, scatterY)}
        />
      </Card>

      {/* 4. Box plot ------------------------------------------------------ */}
      <Card as="section" padding="lg" variant="paper" aria-labelledby="box-h">
        <h2 id="box-h" className="text-h3 text-ink-900 mb-2">
          Spread by station
        </h2>
        <p className="text-body-sm text-ink-600 mb-6 max-w-reading">
          The five-number summary per station, ordered by median. The box is the interquartile
          range; the line inside is the median.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xs mb-6">
          <Select
            label="Pollutant"
            value={boxPollutant}
            options={pollutantOpts}
            onValueChange={setBoxPollutant}
          />
        </div>
        {data.boxplots[boxPollutant]?.length ? (
          <BoxPlot items={data.boxplots[boxPollutant]} unit={unitFor(meta, boxPollutant)} />
        ) : (
          <p className="text-body-sm text-ink-500">No box-plot data for this pollutant.</p>
        )}
      </Card>

      {/* 5. Profiles ------------------------------------------------------ */}
      <Card as="section" padding="lg" variant="paper" aria-labelledby="prof-h">
        <h2 id="prof-h" className="text-h3 text-ink-900 mb-2">
          Daily and weekly profiles
        </h2>
        <p className="text-body-sm text-ink-600 mb-6 max-w-reading">
          The average shape of a day and of a week, with a shaded ±1 standard-deviation band.
          Dashed lines mark the annual mean
          {profPollutant === 'PM2.5' ? ' and the WHO PM2.5 guideline' : ''}.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl mb-6">
          <Select
            label="Pollutant"
            value={profPollutant}
            options={pollutantOpts}
            onValueChange={setProfPollutant}
          />
          <Select
            label="Station"
            value={profStation}
            options={stationOpts}
            onValueChange={setProfStation}
          />
        </div>
        <ProfilesPanel
          data={data}
          pollutant={profPollutant}
          station={profStation}
          unit={unitFor(meta, profPollutant)}
        />
      </Card>
    </div>
  );
};

interface ProfilesPanelProps {
  data: ExploreResponse;
  pollutant: string;
  station: string;
  unit: string;
}

const ProfilesPanel: React.FC<ProfilesPanelProps> = ({ data, pollutant, station, unit }) => {
  const profile = data.profiles[pollutant]?.[station];

  if (!profile) {
    return (
      <p className="text-body-sm text-ink-500">
        No profile for this pollutant and station combination.
      </p>
    );
  }

  const guideline = pollutant === 'PM2.5' ? WHO_PM25 ?? PM25_FALLBACK : null;
  const guidelineLabel = pollutant === 'PM2.5' ? 'WHO PM2.5' : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="text-h4 text-ink-900 mb-3">By hour of day</h3>
        <ProfileChart
          series={profile.hourly}
          unit={unit}
          annualMean={profile.annual_mean}
          guideline={guideline}
          guidelineLabel={guidelineLabel}
          xLabel="Hour of day"
        />
      </div>
      <div>
        <h3 className="text-h4 text-ink-900 mb-3">By day of week</h3>
        <ProfileChart
          series={profile.weekly}
          unit={unit}
          annualMean={profile.annual_mean}
          guideline={guideline}
          guidelineLabel={guidelineLabel}
          xLabel="Day of week"
        />
      </div>
    </div>
  );
};

export default Explore;
