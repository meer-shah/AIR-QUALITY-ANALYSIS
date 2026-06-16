/**
 * Methods & results — the backend story, told with live numbers.
 *
 * Pulls /api/insights (pipeline, the two modelling challenges, imputation
 * breakdown) and /api/meta (dataset facts) and walks through how AirSight is
 * built: the 3-step pipeline, missing-data prediction (combined models +
 * baselines), spatial KNN between stations, then the AQI scale and the honest
 * caveats kept from the original page.
 */
import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { useAsync } from '../lib/use-async';
import type { GapBucket, InsightsImputation } from '../lib/types';
import { formatPercent, formatValue } from '../lib/format';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Card } from '../components/ui/card';
import { Stat } from '../components/ui/stat';
import { AqiLegend } from '../components/charts/aqi-legend';
import { ImputationBars } from '../components/charts/imputation-bars';
import { KnnLine } from '../components/charts/knn-line';
import { LoadingState, ErrorState } from '../components/ui/spinner';

/** Find a baseline method's MAE by key (returns null if absent). */
function maeOf(imp: InsightsImputation, key: string): number | null {
  return imp.methods.find((m) => m.key === key)?.mae ?? null;
}

/**
 * GapDistributionChart — how long the sensor outages ran. A small vertical bar
 * chart of consecutive imputed-hour run lengths (the single violet accent
 * encodes count; this is chrome, not the AQI/pollutant scale).
 */
const GapDistributionChart: React.FC<{ buckets: GapBucket[] }> = ({ buckets }) => {
  const data = buckets.filter((b) => b.gaps > 0);
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          interval={0}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#E5E7EB"
          width={48}
          allowDecimals={false}
          label={{
            value: 'gaps',
            angle: -90,
            position: 'insideLeft',
            fill: '#6B7280',
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: number | string) => [
            `${Number(value).toLocaleString('en-US')} gaps`,
            '',
          ]}
          labelFormatter={(b) => `Run length: ${b}`}
          contentStyle={{ borderRadius: 0, border: '1px solid #E5E7EB', fontSize: 13 }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar dataKey="gaps" name="gaps" fill="#7C3AED" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const Methodology: React.FC = () => {
  const meta = useAsync(() => api.meta(), []);
  const insights = useAsync(() => api.insights(), []);
  const overview = useAsync(() => api.overview(), []);

  const loading = meta.loading || insights.loading;
  const error = meta.error || insights.error;

  return (
    <main>
      <PageContainer className="py-12 md:py-16 flex flex-col gap-12 max-w-reading">
        <SectionHeader
          as="h1"
          overline="Methods"
          title="Methods & results"
          sub="How AirSight is built — the pipeline, the two modelling challenges, and the numbers behind every claim, with the honest caveats."
        />

        {loading && <LoadingState label="Loading methods…" />}
        {error && (
          <ErrorState
            message={error}
            onRetry={() => {
              meta.reload();
              insights.reload();
            }}
          />
        )}

        {meta.data && insights.data && (
          <article className="flex flex-col gap-14">
            {/* 1 — Pipeline */}
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h2 className="text-h2 text-ink-900">How AirSight works</h2>
                <p className="text-body-md text-ink-700">
                  Three steps turn raw RMCAB sensor logs for {meta.data.city} into the maps and
                  estimates on this site.
                </p>
              </div>
              <ol className="grid gap-4 md:grid-cols-3">
                {insights.data.pipeline.map((step) => (
                  <Card key={step.step} variant="paper" padding="md" as="li" className="flex flex-col gap-2">
                    <span className="text-h3 font-semibold text-brand-600 tabular-nums">
                      {String(step.step).padStart(2, '0')}
                    </span>
                    <span className="text-body-lg font-medium text-ink-900">{step.name}</span>
                    <span className="text-body-sm text-ink-600">{step.summary}</span>
                  </Card>
                ))}
              </ol>
            </section>

            {/* 1b — How we measure accuracy */}
            {(() => {
              const imp = insights.data.imputation;
              const knn = insights.data.spatial_knn;
              const bestImp = imp.methods[0] ?? null; // sorted best-first
              const avg = overview.data?.avg_pm25 ?? null;
              const rel =
                avg && knn.best_mae != null ? Math.round((knn.best_mae / avg) * 100) : null;
              return (
                <section className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-h2 text-ink-900">How we measure accuracy</h2>
                    <p className="text-body-md text-ink-700">
                      Every model on this site is scored with{' '}
                      <strong className="text-brand-700">mean absolute error (MAE)</strong> — the
                      average gap, in {imp.unit}, between a prediction and the real measurement it is
                      checked against. <strong className="text-brand-700">Lower MAE is better.</strong>{' '}
                      We only score against <em>real</em> (non-imputed) readings, never against other
                      estimates.
                    </p>
                  </div>

                  {/* What was calculated, and how */}
                  <ul className="flex flex-col gap-2 text-body-md text-ink-700 list-disc pl-5">
                    <li>
                      <strong className="text-ink-900">Filling gaps (imputation).</strong> We hide{' '}
                      {imp.holdout_pct}% of the real {imp.target} readings, fill them back with each
                      method, then compare the fill to the value we hid
                      {bestImp ? ` (${bestImp.n.toLocaleString('en-US')} held-out test points)` : ''}.
                    </li>
                    <li>
                      <strong className="text-ink-900">Estimating between stations.</strong>{' '}
                      {knn.method} — we remove one whole station, predict it from the others at the
                      same time, and repeat for every station, sweeping the number of neighbours k.
                    </li>
                  </ul>

                  {/* Accuracy summary */}
                  <Card variant="paper" padding="lg" className="grid gap-8 sm:grid-cols-3">
                    <Stat
                      value={bestImp ? `${formatValue(bestImp.mae)} ${imp.unit}` : '—'}
                      label="best gap-fill error (MAE)"
                      source={bestImp ? bestImp.label : ''}
                    />
                    <Stat
                      value={knn.best_mae != null ? `${formatValue(knn.best_mae)} ${knn.unit}` : '—'}
                      label="best between-station error (MAE)"
                      source={knn.best_k != null ? `KNN, k = ${knn.best_k}` : ''}
                    />
                    <Stat
                      value={rel != null ? `±${rel}%` : '±—'}
                      label="of the city's average PM2.5"
                      source={avg ? `mean ${formatValue(avg)} ${imp.unit}` : 'relative error'}
                    />
                  </Card>
                  <p className="text-body-sm text-ink-500">
                    In plain terms: the between-station model is typically within{' '}
                    {knn.best_mae != null ? `±${formatValue(knn.best_mae)} ${knn.unit}` : 'a few µg/m³'}{' '}
                    of a real reading — far closer than the naive baselines below. The per-challenge
                    charts that follow show exactly how each method scored.
                  </p>
                </section>
              );
            })()}

            {/* 2 — Challenge 1: missing-data prediction */}
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="overline text-brand-600">Challenge 1</span>
                <h2 className="text-h2 text-ink-900">Missing-data prediction</h2>
              </div>
              <p className="text-body-md text-ink-700">
                Real sensors drop out, so the dataset arrives full of gaps. AirSight fills them with{' '}
                <strong className="text-brand-700">combined models</strong>: the non-target
                pollutants are reconstructed by{' '}
                <strong className="text-brand-700">linear interpolation in time</strong> (each gap
                bridged from the readings on either side of it), while the target pollutant,{' '}
                {insights.data.imputation.target}, is filled by a{' '}
                <strong className="text-brand-700">neural network</strong> that learns from the
                other pollutants and time-of-day patterns. Every filled value is flagged, so
                imputation never hides itself.
              </p>

              {/* Imputation breakdown — stat blocks */}
              {(() => {
                const bd = insights.data.imputation_breakdown;
                const nn = bd.by_method_totals['neural network'] ?? 0;
                const interp = bd.by_method_totals['interpolated'] ?? 0;
                return (
                  <Card variant="paper" padding="lg" className="grid gap-8 sm:grid-cols-3">
                    <Stat
                      value={formatPercent(bd.overall_imputed_pct)}
                      label="of all cells were imputed"
                      source={`${bd.overall_imputed_cells.toLocaleString('en-US')} of ${bd.total_cells.toLocaleString('en-US')} cells`}
                    />
                    <Stat
                      value={nn.toLocaleString('en-US')}
                      label="values filled by the neural network"
                      source={`${insights.data.imputation.target} only`}
                    />
                    <Stat
                      value={interp.toLocaleString('en-US')}
                      label="values filled by linear interpolation"
                      source="non-target pollutants"
                    />
                  </Card>
                );
              })()}

              {/* Gap-size distribution — what the outages looked like */}
              {(() => {
                const target = insights.data.imputation.target;
                const buckets = insights.data.gap_distribution?.[target];
                if (!buckets || !buckets.length) return null;
                const totalGaps = buckets.reduce((sum, b) => sum + b.gaps, 0);
                const short = buckets
                  .filter((b) => ['1 h', '2 h', '3 h'].includes(b.bucket))
                  .reduce((sum, b) => sum + b.gaps, 0);
                const longBucket = buckets.find((b) => b.bucket === '49+ h');
                const shortPct =
                  totalGaps > 0 ? Math.round((short / totalGaps) * 100) : 0;
                return (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-h4 text-ink-900">What the gaps looked like</h3>
                    <p className="text-body-md text-ink-700">
                      Before filling anything, it helps to know how the outages were
                      shaped. Each bar counts the {target} gaps of a given length — a
                      run of consecutive missing hours at one station.
                    </p>
                    <Card variant="paper" padding="md">
                      <GapDistributionChart buckets={buckets} />
                    </Card>
                    <p className="text-body-md text-ink-700">
                      Most outages were short ({shortPct}% ran 1–3 h)
                      {longBucket
                        ? `; ${longBucket.gaps.toLocaleString('en-US')} ran 49+ h.`
                        : '.'}{' '}
                      Short gaps are easy to bridge; the long runs are where a
                      learned model earns its keep.
                    </p>
                  </div>
                );
              })()}

              {/* Per-pollutant imputed share */}
              <div className="overflow-x-auto border border-line">
                <table className="w-full border-collapse text-body-sm">
                  <caption className="sr-only">Imputed share per pollutant</caption>
                  <thead className="bg-surface text-left">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-semibold text-ink-700">Pollutant</th>
                      <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">Imputed</th>
                      <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.data.imputation_breakdown.per_pollutant.map((p) => (
                      <tr key={p.key} className="border-t border-line">
                        <th scope="row" className="px-4 py-2 font-medium text-ink-900 text-left">
                          {p.key}
                        </th>
                        <td className="px-4 py-2 text-right tabular-nums text-ink-900">
                          {formatPercent(p.imputed_pct)}
                        </td>
                        <td className="px-4 py-2 text-right text-ink-600">
                          {Object.keys(p.by_method).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Baseline comparison chart */}
              <div className="flex flex-col gap-3">
                <h3 className="text-h4 text-ink-900">How the baselines compare</h3>
                <p className="text-body-md text-ink-700">
                  Before trusting any fill, the simple strategies were benchmarked against a{' '}
                  {insights.data.imputation.holdout_pct}% hold-out of real{' '}
                  {insights.data.imputation.target} readings. The chart shows mean absolute error
                  (MAE) in {insights.data.imputation.unit} —{' '}
                  <strong className="text-brand-700">lower is better</strong>.
                </p>
                <Card variant="paper" padding="md">
                  <ImputationBars
                    methods={insights.data.imputation.methods}
                    unit={insights.data.imputation.unit}
                  />
                </Card>

                {/* Neural-network MAE — reported from the original analysis */}
                {(() => {
                  const imp = insights.data.imputation;
                  const nnMae = imp.production_model.reported_mae;
                  if (nnMae == null) return null;
                  const best = imp.methods[0] ?? null; // sorted best-first
                  return (
                    <Card variant="paper" padding="lg" className="grid gap-8 sm:grid-cols-2">
                      <Stat
                        value={`${formatValue(nnMae)} ${imp.unit}`}
                        label="neural network MAE (target pollutant)"
                        source="reported from the original analysis, not recomputed"
                      />
                      <Stat
                        value={best ? `${formatValue(best.mae)} ${imp.unit}` : '—'}
                        label="best re-run baseline MAE"
                        source={best ? best.label : ''}
                      />
                    </Card>
                  );
                })()}

                {(() => {
                  const imp = insights.data.imputation;
                  const linear = maeOf(imp, 'linear_interp');
                  const carry = maeOf(imp, 'last_value');
                  const nearest = maeOf(imp, 'nearest_station');
                  if (linear == null) return null;
                  return (
                    <p className="text-body-md text-ink-700">
                      Linear interpolation scored MAE{' '}
                      <strong className="text-brand-700">
                        {formatValue(linear)} {imp.unit}
                      </strong>{' '}
                      — better than carry-forward ({formatValue(carry)}) and nearest-station (
                      {formatValue(nearest)}), which is why it fills the non-target pollutants.
                    </p>
                  );
                })()}

                {/* Honest NN-vs-baseline comparison (no over-claiming) */}
                {(() => {
                  const imp = insights.data.imputation;
                  const nnMae = imp.production_model.reported_mae;
                  const best = imp.methods[0] ?? null;
                  if (nnMae == null || best == null) return null;
                  const beats = nnMae < best.mae;
                  return (
                    <p className="text-body-md text-ink-700">
                      The neural network used to fill the target pollutant
                      ({imp.target}) reports MAE{' '}
                      <strong className="text-brand-700">
                        {formatValue(nnMae)} {imp.unit}
                      </strong>
                      . That figure is{' '}
                      <strong className="text-brand-700">
                        reported from the original analysis, not recomputed here
                      </strong>{' '}
                      (it needs TensorFlow to retrain), so it is not directly
                      comparable to the re-run baselines.{' '}
                      {beats
                        ? `On the numbers as reported it edges out the best baseline (${formatValue(best.mae)} ${imp.unit}).`
                        : `Taken at face value it does not beat the best re-run baseline (${formatValue(best.mae)} ${imp.unit}); both are shown side by side rather than cherry-picking a winner.`}
                    </p>
                  );
                })()}

                <p className="text-body-sm text-ink-500">
                  {insights.data.imputation.production_model.note}
                </p>
              </div>
            </section>

            {/* 3 — Challenge 2: spatial KNN */}
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="overline text-brand-600">Challenge 2</span>
                <h2 className="text-h2 text-ink-900">Estimating pollution between stations</h2>
              </div>
              <p className="text-body-md text-ink-700">
                With only {meta.data.stations} stations, most addresses sit between sensors. AirSight
                estimates a value anywhere using{' '}
                <strong className="text-brand-700">distance-weighted K-nearest neighbours</strong>:
                it takes the k closest stations by their map coordinates and blends their readings,
                weighting each by <strong className="text-brand-700">1 / distance</strong> so nearer
                sensors count more.
              </p>
              <p className="text-body-md text-ink-700">
                Accuracy was measured with {insights.data.spatial_knn.method.toLowerCase()}: each
                station is hidden in turn and predicted from the rest. The chart plots MAE in{' '}
                {insights.data.spatial_knn.unit} against k.
              </p>
              <Card variant="paper" padding="md">
                <KnnLine
                  points={insights.data.spatial_knn.by_k}
                  unit={insights.data.spatial_knn.unit}
                  bestK={insights.data.spatial_knn.best_k}
                  bestMae={insights.data.spatial_knn.best_mae}
                />
              </Card>
              {(() => {
                const knn = insights.data.spatial_knn;
                const first = knn.by_k[0];
                if (!first || knn.best_k == null || knn.best_mae == null) return null;
                return (
                  <p className="text-body-md text-ink-700">
                    Accuracy improves from MAE {formatValue(first.mae)} {knn.unit} at k={first.k} to{' '}
                    <strong className="text-brand-700">
                      {formatValue(knn.best_mae)} {knn.unit}
                    </strong>{' '}
                    at k={knn.best_k}, then flattens — adding more neighbours stops helping.
                  </p>
                );
              })()}
              {insights.data.spatial_knn.excluded_stations.length > 0 && (
                <p className="text-body-sm text-ink-500">
                  {insights.data.spatial_knn.excluded_stations.length} stations were excluded from
                  this evaluation (sparse or co-located coverage):{' '}
                  {insights.data.spatial_knn.excluded_stations.join(', ')}.
                </p>
              )}
              <p className="text-body-md text-ink-700">
                The same method powers the{' '}
                <a href="/map" className="text-brand-700 underline underline-offset-2">
                  Map
                </a>{' '}
                page, where it paints an interpolated surface across Bogotá, and the{' '}
                <a href="/estimate" className="text-brand-700 underline underline-offset-2">
                  Estimate
                </a>{' '}
                page for a single point.
              </p>
            </section>

            {/* Data source */}
            <section className="flex flex-col gap-3">
              <h2 className="text-h2 text-ink-900">Data source</h2>
              <p className="text-body-md text-ink-700">
                All figures come from the Red de Monitoreo de Calidad del Aire de Bogotá (RMCAB),
                the city's official air-quality network, for the year {meta.data.year}. The
                processed dataset holds {meta.data.rows.toLocaleString('en-US')} hourly rows from{' '}
                {meta.data.stations} stations, covering {meta.data.date_min} to {meta.data.date_max}.
              </p>
              <p className="text-body-md text-ink-700">
                Seven pollutants are tracked:{' '}
                {meta.data.pollutants.map((p) => `${p.label} (${p.unit})`).join(', ')}. CO is reported
                in mg/m³; the rest in µg/m³.
              </p>
              <p className="text-body-md text-ink-700">
                To carry the story past 2021, the{' '}
                <a href="/trends" className="text-brand-700 underline underline-offset-2">Trends</a>{' '}
                page stitches the RMCAB year to the free{' '}
                <strong className="text-brand-700">Open-Meteo (CAMS) archive</strong> from 2022-09 to
                today, and the{' '}
                <a href="/live" className="text-brand-700 underline underline-offset-2">Now</a>{' '}
                page reads Open-Meteo's current conditions. Those are model-reanalysis figures, not
                RMCAB ground sensors — useful for "right now / recent" but a different source from the
                validated 2021 case study (and Jan–Aug 2022 has no free source, so it shows as a gap).
              </p>
            </section>

            {/* AQI */}
            <section className="flex flex-col gap-3">
              <h2 className="text-h2 text-ink-900">The air-quality index</h2>
              <p className="text-body-md text-ink-700">
                AQI is computed from PM2.5 using the US EPA 24-hour breakpoints, with PM10 as a second
                sub-index. The higher of the two wins and sets the dominant pollutant. We use AQI as a
                shared yardstick — alongside the per-pollutant map scale, it is the only place this
                site uses colour beyond violet, and only to encode the data.
              </p>
              <Card variant="paper" padding="md">
                <AqiLegend orientation="vertical" />
              </Card>
            </section>

            {/* WHO comparison */}
            <section className="flex flex-col gap-3">
              <h2 className="text-h2 text-ink-900">Comparison to WHO guidelines</h2>
              <p className="text-body-md text-ink-700">
                Annual means are compared to the WHO 2021 air-quality guidelines: PM2.5 5 µg/m³, PM10
                15 µg/m³, NO2 10 µg/m³, and ozone 60 µg/m³ (peak season). These are health-based
                targets, not legal limits, and Bogotá — like most large cities — sits above several of
                them.
              </p>
            </section>

            {/* Caveats */}
            <section className="flex flex-col gap-3">
              <h2 className="text-h2 text-ink-900">Honest caveats</h2>
              <ul className="flex flex-col gap-2 text-body-md text-ink-700 list-disc pl-5">
                <li>
                  The RMCAB case study is a single year ({meta.data.year}). The Trends and Now pages
                  extend it with Open-Meteo (a different, model-based source), so cross-source jumps
                  reflect method differences as well as real change.
                </li>
                <li>
                  Imputed values are model estimates, not measurements — treat heavily-imputed
                  stations with care (the share is shown on every station).
                </li>
                <li>
                  The neural-network MAE is reported from the original analysis, not recomputed here;
                  only the baselines above were re-run.
                </li>
                <li>
                  Interpolated estimates are smooth approximations; local sources (a busy road, a
                  factory) can make real values diverge sharply from the model.
                </li>
                <li>
                  AQI here is derived from particulate matter only; it does not fold in every
                  pollutant a regulatory index might.
                </li>
              </ul>
            </section>
          </article>
        )}
      </PageContainer>
    </main>
  );
};

export default Methodology;
