'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchScorecard, fetchSquads } from '@/lib/api/client'
import { formatInt, formatRate } from '@/lib/format'
import { CoverageNote, ErrorState, LoadingCard } from '@/components/States'
import type { MatchView } from '@/lib/api/normalize'

function seedMatch(provider: string, matchId: string, league: string, date: string): MatchView {
  const qs = new URLSearchParams()
  if (league) qs.set('league', league)
  if (date) qs.set('date', date)
  const suffix = qs.toString() ? `?${qs}` : ''
  return {
    key: `${provider}:${matchId}`, provider: provider as MatchView['provider'], matchId, teams: '',
    team1: null, team2: null, scores: [], category: '', live: false, status: '', state: '', stateTitle: '',
    seriesName: '', seriesId: league || null, format: '', venueGround: '', venueCity: '', venueCountry: '',
    startDateMs: null, endDateMs: null, startTimeText: null, source: provider,
    badge: 'unknown', badgeLabel: 'Unknown',
    links: { detail: `/espn/match/${matchId}${suffix}`, scorecard: `/espn/match/${matchId}/scorecard${suffix}`, commentary: null, squads: `/espn/match/${matchId}/squads${league ? `?league=${league}` : ''}`, upstream: null },
    playerOfTheMatch: [],
  }
}

export function PlayerObserved({ provider, playerId, name, matchId, league, date }: { provider: string; playerId: string; name: string; matchId: string; league: string; date: string }) {
  const canFetch = provider === 'espn' && !!matchId && !!league
  const seed = canFetch ? seedMatch(provider, matchId, league, date) : null

  const scorecardQ = useQuery({
    queryKey: ['scorecard', `espn:${matchId}`, league, date],
    enabled: canFetch,
    queryFn: ({ signal }) => fetchScorecard(seed!, signal),
    placeholderData: keepPreviousData,
  })
  const squadsQ = useQuery({
    queryKey: ['squads', `espn:${matchId}`, league],
    enabled: canFetch,
    queryFn: ({ signal }) => fetchSquads(seed!, signal),
    placeholderData: keepPreviousData,
  })

  const batting: Array<{ innings: number; runs: number | null; balls: number | null; fours: number | null; sixes: number | null; strikeRate: number | null; dismissal: string | null }> = []
  const bowling: Array<{ innings: number; overs: string; maidens: number | null; runs: number | null; wickets: number | null; economy: number | null }> = []
  const scorecard = scorecardQ.data?.data
  if (scorecard) {
    for (const inn of scorecard.innings) {
      for (const b of inn.batsmen) {
        if (b.id === playerId || (name && b.name.toLowerCase() === name.toLowerCase())) {
          batting.push({ innings: inn.inningsId ?? 0, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, strikeRate: b.strikeRate, dismissal: b.dismissal })
        }
      }
      for (const b of inn.bowlers) {
        if (b.id === playerId || (name && b.name.toLowerCase() === name.toLowerCase())) {
          bowling.push({ innings: inn.inningsId ?? 0, overs: b.overs, maidens: b.maidens, runs: b.runs, wickets: b.wickets, economy: b.economy })
        }
      }
    }
  }
  const squadPlayer = squadsQ.data?.data.teams.flatMap((t) => t.players.map((p) => ({ ...p, teamName: t.teamName }))).find((p) => p.id === playerId || (name && p.name.toLowerCase() === name.toLowerCase()))

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-navy-800 bg-navy-900 p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-brand/90">Match-observed player · {provider}</p>
        <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">{squadPlayer?.name || name || `Player ${playerId}`}</h1>
        {squadPlayer ? (
          <p className="mt-1 text-[11px] text-navy-100/80">{squadPlayer.teamName} · {squadPlayer.role || 'Unknown role'}{squadPlayer.isCaptain ? ' · Captain' : ''}{squadPlayer.isStarter ? ' · Provider starter (XI)' : ''}</p>
        ) : null}
        {(squadPlayer?.battingStyle || squadPlayer?.bowlingStyle) ? (
          <p className="mt-0.5 text-[10px] text-navy-100/60">{[squadPlayer?.battingStyle && `Bat: ${squadPlayer.battingStyle}`, squadPlayer?.bowlingStyle && `Bowl: ${squadPlayer.bowlingStyle}`].filter(Boolean).join(' · ')}</p>
        ) : null}
      </section>

      <CoverageNote>
        This API has <strong>no career profiles, bios, portraits, rankings or records</strong>. Everything below is what the provider
        returned for <strong>this match only</strong>{matchId ? ` (match ${matchId}${date ? `, ${date}` : ''})` : ''} — it is not a career summary, and 0/— mean what they mean there.
      </CoverageNote>

      {!canFetch ? (
        <div className="rounded-xl border border-dashed border-edge bg-card p-5 text-center text-sm text-slate-600">
          <p className="font-bold text-slate-800">Pick a player from a scorecard</p>
          <p className="mt-1 text-xs">Open any ESPN match → Scorecard → tap a batter or bowler. This page fills in from that match&apos;s data.</p>
          <Link href="/" className="mt-3 inline-block rounded-md border border-edge bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">Go to the Live Center →</Link>
        </div>
      ) : (
        <>
          {scorecardQ.isPending ? <LoadingCard label="Fetching match scorecard…" /> : scorecardQ.isError && !scorecard ? (
            <ErrorState title="Scorecard unavailable" detail={scorecardQ.error instanceof Error ? scorecardQ.error.message : undefined} onRetry={() => scorecardQ.refetch()} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="overflow-hidden rounded-xl border border-edge bg-card">
                <h2 className="border-b border-edge bg-navy-100/40 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-navy-900">Batting in this match</h2>
                <div className="p-3 text-xs">
                  {batting.length === 0 ? (
                    <p className="text-slate-500">Did not bat in this match (or the innings data is missing).</p>
                  ) : batting.map((b) => (
                    <div key={b.innings} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-edge/60 py-1.5 last:border-0">
                      <span className="font-semibold text-slate-700">Innings {b.innings}</span>
                      <span className="tabular text-slate-600">{formatInt(b.runs)} ({formatInt(b.balls)}b) · {formatInt(b.fours)}×4 {formatInt(b.sixes)}×6 · SR {formatRate(b.strikeRate)}</span>
                      <span className="w-full text-[10px] text-slate-400">{b.dismissal ?? 'dismissal not supplied'}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="overflow-hidden rounded-xl border border-edge bg-card">
                <h2 className="border-b border-edge bg-navy-100/40 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-navy-900">Bowling in this match</h2>
                <div className="p-3 text-xs">
                  {bowling.length === 0 ? (
                    <p className="text-slate-500">Did not bowl in this match (or bowling data is missing).</p>
                  ) : bowling.map((b) => (
                    <div key={b.innings} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-edge/60 py-1.5 last:border-0">
                      <span className="font-semibold text-slate-700">Innings {b.innings}</span>
                      <span className="tabular text-slate-600">{b.overs || '—'} ov · {formatInt(b.maidens)}m {formatInt(b.runs)}r {formatInt(b.wickets)}w · Econ {formatRate(b.economy)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          {squadsQ.isFetching ? <p className="text-[10px] text-slate-400">Refreshing squad context…</p> : null}
        </>
      )}
    </div>
  )
}
