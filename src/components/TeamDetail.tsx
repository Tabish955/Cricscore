'use client'

import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo } from 'react'
import { fetchList } from '@/lib/api/client'
import { listPollInterval } from '@/lib/polling'
import { TeamIdentity } from '@/components/TeamIdentity'
import { MatchCard } from '@/components/MatchCard'
import { FavoriteTeamButton } from '@/components/FavoriteToggle'
import { EmptyState, LoadingCard, CoverageNote } from '@/components/States'

export function TeamDetail({ provider, id, name, short }: { provider: 'espn' | 'crex' | 'cb'; id: string; name: string; short: string }) {
  const results = useQueries({
    queries: (['live', 'recent', 'upcoming'] as const).map((kind) => ({
      queryKey: ['cb-list', kind],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchList(kind, signal),
      refetchInterval: listPollInterval(kind),
    })),
  })
  const pending = results.every((r) => r.isPending)

  const { team, matches } = useMemo(() => {
    const all = results.flatMap((r) => r.data?.data.matches ?? [])
    const matches = all.filter((m) => {
      const mine = (t: typeof m.team1) =>
        t && ((t.id && t.id === id) || (name && t.name.toLowerCase() === name.toLowerCase()))
      return mine(m.team1) || mine(m.team2)
    })
    const foundFromFeed = matches.flatMap((m) => [m.team1, m.team2]).find((t) => t && (t.id === id || (name && t.name.toLowerCase() === name.toLowerCase())))
    const team = foundFromFeed ?? (name ? { id, name, short: short || name.slice(0, 4).toUpperCase(), imageUrl: null } : null)
    return { team, matches }
  }, [results, id, name, short])

  const displayName = team?.name || name || `Team ${id}`
  const displayShort = team?.short || short || displayName.slice(0, 4).toUpperCase()
  const assetKey = `${provider}:${team?.id ?? id}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pine-800 bg-pine-950 p-4 text-[#f5f0e4]">
        <div className="flex items-center gap-4">
          <TeamIdentity assetKey={assetKey} name={displayName} short={displayShort} imageUrl={team?.imageUrl ?? null} size="xl" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brass-light">{team?.id ? `Ref ${team.id}` : 'Team'}</p>
            <h1 className="text-lg font-black tracking-tight sm:text-2xl">{displayName}</h1>
            <p className="text-[10px] text-[#a9bfb0]">{matches.length} match{matches.length === 1 ? '' : 'es'} observed in current data</p>
          </div>
        </div>
        <FavoriteTeamButton
          team={{ key: assetKey, provider, teamId: team?.id ?? id, name: displayName, short: displayShort }}
        />
      </div>

      <CoverageNote>
        Team pages are scoped to what the scores expose. Profiles, histories, rankings and records are not part of this site;
        nothing on this page is a career stat. Match-observed player performance lives behind each scorecard.
      </CoverageNote>

      <section aria-labelledby="team-matches">
        <h2 id="team-matches" className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-pine-950">Observed fixtures &amp; results</h2>
        {pending ? (
          <LoadingCard label="Scanning matches…" />
        ) : matches.length === 0 ? (
          <EmptyState
            title="Not in the current data"
            hint="This team has no live, recent or upcoming matches right now. Check the Live Center later; absence here means there is nothing to show, not that the club does not exist."
          >
            <Link href="/" className="rounded-md border border-edge bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">Live Center</Link>
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map((m) => <MatchCard key={m.key} match={m} />)}
          </div>
        )}
      </section>
    </div>
  )
}
