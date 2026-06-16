/**
 * Stations — sortable table of stations with an AQI badge + a ranking bar.
 * Clicking a row opens a detail panel (/api/stations/{code}).
 */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/use-async';
import type { PollutantKey, StationSummary } from '../lib/types';
import { pollutantOptions } from '../lib/options';
import { categoryColor } from '../lib/aqi';
import { formatAqi, formatPercentShare, formatValue, formatWithUnit } from '../lib/format';
import { PageContainer } from '../components/layout/page-container';
import { SectionHeader } from '../components/ui/section-header';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { AqiBadge, AqiDot } from '../components/ui/aqi-badge';
import { LoadingState, ErrorState, Spinner } from '../components/ui/spinner';
import { RankingBar } from '../components/charts/ranking-bar';
import { cn } from '../lib/cn';

type SortKey = 'name' | 'locality' | 'value' | 'aqi';
type SortDir = 'asc' | 'desc';

const Stations: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const pollutant = (params.get('pollutant') as PollutantKey) || 'PM2.5';
  const setPollutant = (v: string) => {
    const next = new URLSearchParams(params);
    next.set('pollutant', v);
    setParams(next, { replace: true });
  };

  const [sortKey, setSortKey] = React.useState<SortKey>('value');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');
  const [openCode, setOpenCode] = React.useState<string | null>(null);

  const meta = useAsync(() => api.meta(), []);
  const stationsRes = useAsync(() => api.stations(pollutant, 'annual'), [pollutant]);
  const rankingRes = useAsync(() => api.ranking(pollutant, 'annual'), [pollutant]);
  const detailRes = useAsync(
    () => (openCode ? api.stationDetail(openCode, pollutant) : Promise.resolve(null)),
    [openCode, pollutant],
  );

  const sorted = React.useMemo(() => {
    const rows = [...(stationsRes.data?.stations ?? [])];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'name':
          av = a.name;
          bv = b.name;
          break;
        case 'locality':
          av = a.locality;
          bv = b.locality;
          break;
        case 'aqi':
          av = a.aqi?.value ?? -1;
          bv = b.aqi?.value ?? -1;
          break;
        default:
          av = a.value ?? -1;
          bv = b.value ?? -1;
      }
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return rows;
  }, [stationsRes.data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'locality' ? 'asc' : 'desc');
    }
  };

  const SortButton: React.FC<{ k: SortKey; children: React.ReactNode }> = ({ k, children }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 font-semibold text-ink-700 hover:text-ink-900"
      aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {children}
      <span aria-hidden className="text-ink-400">
        {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );

  const unit = stationsRes.data?.unit ?? 'µg/m³';

  return (
    <main>
      <PageContainer className="py-12 md:py-16 flex flex-col gap-8">
        <SectionHeader
          as="h1"
          overline="Stations"
          title="Every monitoring station, ranked"
          sub="Annual means for the chosen pollutant. Sort the table or select a station for detail."
          actions={
            <div className="w-56">
              <Select
                label="Pollutant"
                value={pollutant}
                options={pollutantOptions(meta.data)}
                onValueChange={setPollutant}
              />
            </div>
          }
        />

        {/* Ranking bar */}
        <Card variant="paper" padding="lg" className="flex flex-col gap-4">
          <h2 className="text-h4 text-ink-900">Ranking by annual mean</h2>
          {rankingRes.loading && <LoadingState label="Loading ranking…" />}
          {rankingRes.error && <ErrorState message={rankingRes.error} onRetry={rankingRes.reload} />}
          {rankingRes.data && (
            <RankingBar items={rankingRes.data.items} unit={rankingRes.data.unit} onSelect={setOpenCode} />
          )}
        </Card>

        {/* Table */}
        <section className="flex flex-col gap-4">
          {stationsRes.loading && <LoadingState label="Loading stations…" />}
          {stationsRes.error && <ErrorState message={stationsRes.error} onRetry={stationsRes.reload} />}
          {stationsRes.data && (
            <div className="overflow-x-auto border border-line">
              <table className="w-full border-collapse text-body-sm">
                <caption className="sr-only">Stations sorted by {sortKey}</caption>
                <thead className="bg-surface">
                  <tr className="text-left">
                    <th scope="col" className="px-4 py-3">
                      <SortButton k="name">Station</SortButton>
                    </th>
                    <th scope="col" className="px-4 py-3 hidden sm:table-cell">
                      <SortButton k="locality">Locality</SortButton>
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      <SortButton k="value">Mean ({unit})</SortButton>
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <SortButton k="aqi">AQI</SortButton>
                    </th>
                    <th scope="col" className="px-4 py-3 sr-only">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s: StationSummary) => (
                    <tr
                      key={s.code}
                      className={cn(
                        'border-t border-line cursor-pointer hover:bg-surface',
                        openCode === s.code && 'bg-brand-50',
                      )}
                      onClick={() => setOpenCode(s.code)}
                    >
                      <th scope="row" className="px-4 py-3 font-medium text-ink-900 text-left">
                        <span className="flex items-center gap-2">
                          <AqiDot color={s.aqi?.color || categoryColor(s.aqi?.value)} />
                          {s.name}
                        </span>
                      </th>
                      <td className="px-4 py-3 text-ink-600 hidden sm:table-cell">{s.locality}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                        {formatValue(s.value)}
                      </td>
                      <td className="px-4 py-3">
                        <AqiBadge aqi={s.aqi} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setOpenCode(s.code);
                          }}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Detail panel */}
        {openCode && (
          <section aria-live="polite">
            <Card variant="paper" padding="lg" className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <CardHeader className="mb-0">
                  <CardTitle>
                    {detailRes.data?.name ?? sorted.find((s) => s.code === openCode)?.name ?? openCode}
                  </CardTitle>
                  {detailRes.data && (
                    <p className="text-body-sm text-ink-600">
                      {detailRes.data.locality} · {detailRes.data.zone} · {detailRes.data.type}
                    </p>
                  )}
                </CardHeader>
                <Button variant="ghost" size="sm" onClick={() => setOpenCode(null)} aria-label="Close detail">
                  Close ✕
                </Button>
              </div>

              {detailRes.loading && <LoadingState label="Loading station…" />}
              {detailRes.error && <ErrorState message={detailRes.error} onRetry={detailRes.reload} />}
              {detailRes.data && (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <span className="overline text-ink-500">AQI ({pollutant})</span>
                      <span className="flex items-center gap-2">
                        <AqiBadge aqi={detailRes.data.aqi} size="md" />
                      </span>
                      <span className="text-caption text-ink-500">
                        index {formatAqi(detailRes.data.aqi.value)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="overline text-ink-500">Altitude</span>
                      <span className="text-body-md text-ink-900">
                        {detailRes.data.altitude_m != null
                          ? `${formatValue(detailRes.data.altitude_m, 0)} m`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="overline text-ink-500">Hourly records</span>
                      <span className="text-body-md text-ink-900">
                        {detailRes.data.records.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                  {detailRes.data.address && (
                    <p className="text-body-sm text-ink-600">{detailRes.data.address}</p>
                  )}

                  {/* Per-pollutant means vs WHO + imputed share */}
                  <div className="overflow-x-auto border border-line">
                    <table className="w-full border-collapse text-body-sm">
                      <thead className="bg-surface text-left">
                        <tr>
                          <th scope="col" className="px-4 py-2 font-semibold text-ink-700">
                            Pollutant
                          </th>
                          <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">
                            Annual mean
                          </th>
                          <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">
                            WHO 2021
                          </th>
                          <th scope="col" className="px-4 py-2 font-semibold text-ink-700 text-right">
                            Imputed
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRes.data.pollutants.map((p) => (
                          <tr key={p.key} className="border-t border-line">
                            <th scope="row" className="px-4 py-2 font-medium text-ink-900 text-left">
                              {p.label}
                            </th>
                            <td className="px-4 py-2 text-right tabular-nums text-ink-900">
                              {formatWithUnit(p.mean, p.unit)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-ink-600">
                              {p.whoGuideline != null ? formatWithUnit(p.whoGuideline, p.unit) : '—'}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-ink-600">
                              {formatPercentShare(detailRes.data!.imputed_share[p.key])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {!detailRes.data && !detailRes.loading && !detailRes.error && (
                <div className="flex items-center gap-2 text-body-sm text-ink-500">
                  <Spinner size={18} /> opening…
                </div>
              )}
            </Card>
          </section>
        )}
      </PageContainer>
    </main>
  );
};

export default Stations;
