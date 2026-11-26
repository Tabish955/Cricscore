'use client'

/**
 * Explicit secondary standings source (experimental Sportskeeda adapter).
 *
 * Strict rules:
 *  - Only rendered for leagues with a verified, explicit slug mapping in
 *    VERIFIED_SPORTSKEEDA_MAPPINGS. Otherwise: "not configured", never a table.
 *  - Season caveat is always visible while the backend reports
 *    seasonVerified !== true. It is never labelled a current-season table.
 *  - Never merged with ESPN rows/ranks/ids. A failure here only degrades itself.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchSportskeedaStandings } from '@/lib/api/client'
import { POLL } from '@/lib/polling'
import { sportskeedaMappingFor } from '@/lib/sportskeeda'
import { TeamIdentity } from '@/components/TeamIdentity'
import { ErrorState, LoadingCard } from '@/components/States'

export function SportskeedaAdditionalSource({ leagueId }: { leagueId: string }) {
  const mapping = sportskeedaMappingFor(leagueId)

  const query = useQuery({
    queryKey: ['sportskeeda-standings', mapping?.seriesSlug ?? ''],
    queryFn: ({ signal }) => fetchSportskeedaStandings(mapping!.seriesSlug, signal),
    enabled: mapping !== null,
    refetchInterval: POLL.standings,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    retry: 1,
  })

  if (!mapping) {
    return (
      <p className="rounded-md border border-dashed border-edge px-3 py-2 text-[10px] leading-4 text-slate-400">
        Additional source (Sportskeeda): <span className="font-semibold text-slate-500">not configured</span>. The experimental backend route
        is not released yet, and no verified ESPN-league → Sportskeeda-slug mapping exists for this series. The verified ESPN table above remains the only source shown.
      </p>
    )
  }

  const view = query.data?.data
  const seasonVerified = view?.seasonVerified === true
  const warnings = view?.warnings ?? []

  return (
    <div className="rounded-lg border border-amber-300/70 bg-amber-50/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 px-3 py-1.5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-deep">
          Sportskeeda{seasonVerified ? '' : ' · Season not verified'}
          <span className="ml-1.5 rounded bg-white/80 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-deep ring-1 ring-amber-300">Experimental</span>
        </p>
        {query.isFetching ? <span className="text-[9px] font-semibold normal-case text-slate-400">Refreshing…</span> : null}
      </div>
      <div className="px-3 py-2">
        {query.isPending ? (
          <LoadingCard label="Fetching additional source…" />
        ) : query.isError && !view ? (
          <ErrorState
            title="Additional source unavailable"
            detail="Sportskeeda could not be reached (the experimental route may not be released). The ESPN table above is unaffected."
            onRetry={() => query.refetch()}
          />
        ) : view ? (
          <>
            <p className="text-[11px] font-semibold text-slate-700">{view.title}</p>
            {!seasonVerified ? (
              <p className="mt-0.5 text-[10px] leading-4 text-amber-deep">
                Sportskeeda page loaded, but its season is <strong>not verified</strong> by this app — do not treat this as the confirmed current tournament table.
              </p>
            ) : null}
            {warnings.length ? (
              <ul className="mt-1 list-disc pl-4 text-[10px] leading-4 text-amber-deep/90">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            ) : null}
            <div className="mt-2 flex flex-col gap-2">
              {view.groups.map((group, gi) => (
                <div key={`${group.name}-${gi}`}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{group.name || 'Table'}</p>
                  <div className="score-scroll overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-amber-200/70 text-left">
                          <th scope="col" className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Team</th>
                          {['#', 'P', 'W', 'L', 'Pts', 'NRR'].map((h) => <th key={h} scope="col" className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((entry, i) => (
                          <tr key={`${entry.team?.id || 'no-id'}-${i}`} className="border-b border-amber-100 last:border-0 odd:bg-white/50">
                            <th scope="row" className="px-2 py-1.5">
                              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                <TeamIdentity assetKey={`sportskeeda:${entry.team?.id || entry.team?.name || i}`} name={entry.team?.name ?? 'Team'} short={entry.team?.short} imageUrl={entry.team?.imageUrl} size="xs" />
                                <span className="max-w-[150px] truncate">{entry.team?.name ?? 'Unknown team'}</span>
                              </span>
                            </th>
                            <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.stats.rank ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.stats.matchesPlayed ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.stats.matchesWon ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.stats.matchesLost ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.stats.matchPoints ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.stats.netrr ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[9px] leading-3 text-slate-400">
              Separate source, shown as supplied — never merged with the ESPN table. Fetched {view.provenance.fetchedAt ?? 'at an unrecorded time'}{view.provenance.cached === true ? ' (cached)' : ' (live page fetch)'}.
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
