'use client'

import type { ScorecardView as Scorecard } from '@/lib/api/normalize'
import { formatRate, formatInt, formatFetchedAt } from '@/lib/format'
import { TeamIdentity } from '@/components/TeamIdentity'
import { CoverageNote } from '@/components/States'
import { ExtendedInningsSections } from '@/components/match/ExtendedInningsSections'
import Link from 'next/link'

const CELL = 'px-2 py-1.5 text-right text-xs tabular text-slate-700 whitespace-nowrap'
const HEAD = 'px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 text-right whitespace-nowrap'

function coverageBanner(view: Scorecard) {
  if (view.coverageLevel === 'totals-only')
    return 'The API returned totals only for this match — no ball-by-ball batting/bowling tables. Nothing is invented below.'
  if (view.coverageLevel === 'partial')
    return 'Partial scorecard: some innings are missing batting or bowling tables from the provider (or the provider flagged gaps). Missing values render as —, never as 0.'
  if (view.coverageLevel === 'unknown')
    return 'Coverage unknown: treat any table below as the provider sent it.'
  return null
}

export interface PlayerLinkContext {
  matchId: string
  league: string | null
  date: string | null
}

function playerHref(id: string, name: string, ctx?: PlayerLinkContext): string {
  const base = `/players/espn/${encodeURIComponent(id)}`
  if (!ctx?.matchId || !ctx.league) return base
  const p = new URLSearchParams({ match: ctx.matchId, league: ctx.league, name })
  if (ctx.date) p.set('date', ctx.date)
  return `${base}?${p.toString()}`
}

export function ScorecardView({ view, stale, refreshedAt, onRefresh, isFetching, matchContext }: {
  view: Scorecard
  stale: boolean
  refreshedAt: number | null
  onRefresh: () => void
  isFetching: boolean
  matchContext?: PlayerLinkContext
}) {
  if (view.innings.length === 0) {
    return (
      <CoverageNote>
        The scorecard endpoint answered but returned no innings. This is common for matches without recorded scoreboards.
      </CoverageNote>
    )
  }
  const banner = coverageBanner(view)
  // Provider gave nothing for extras/FOW/partnerships in ANY innings (current live
  // backend): say it once, compactly — don't repeat three placeholders per innings.
  const extAllMissing = view.innings.length > 0 && view.innings.every((i) => i.extras === null && i.fallOfWickets === null && i.partnerships === null)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {banner ? <CoverageNote>{banner}</CoverageNote> : <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Batting &amp; bowling as supplied by the provider</span>}
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {stale ? <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold uppercase text-amber-deep">Stale</span> : null}
          <span>Updated {formatFetchedAt(refreshedAt)}</span>
          {isFetching ? <span>Refreshing…</span> : null}
          <button type="button" onClick={onRefresh} className="rounded border border-edge bg-white px-1.5 py-0.5 font-semibold text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">Refresh</button>
        </div>
      </div>
      {view.provenance.playerStatistics ? (
        <p className="text-[10px] text-slate-400">
          Player statistics fetched {view.provenance.playerStatistics.fetchedAt ?? 'at an unrecorded time'}{view.provenance.playerStatistics.cached === true ? ' (cached)' : view.provenance.playerStatistics.cached === false ? ' (live)' : ''} · {view.provenance.playerStatistics.upstream ? 'provider summary endpoint' : 'provider'}
        </p>
      ) : null}
      {view.warnings.length ? (
        <ul className="list-disc rounded-md border border-amber-200 bg-amber-50 py-2 pl-8 pr-3 text-[11px] text-amber-deep">
          {view.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      ) : null}

      {view.innings.map((inn) => (
        <section key={inn.inningsId ?? inn.team} className="overflow-hidden rounded-xl border border-edge bg-card" aria-labelledby={`inn-${inn.inningsId ?? inn.team}`}>
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-edge bg-navy-100/40 px-3 py-2">
            <h3 id={`inn-${inn.inningsId ?? inn.team}`} className="text-xs font-black uppercase tracking-[0.14em] text-navy-900">
              {inn.team || `Innings ${inn.inningsId ?? ''}`}{inn.declared ? ' — declared' : ''}
            </h3>
            <p className="score-nums text-xs font-bold text-navy-900">
              {inn.score || '—'}{inn.overs ? ` (${inn.overs} ov)` : ''}
            </p>
          </header>
          <div className="score-scroll overflow-x-auto">
            {inn.batsmen.length > 0 ? (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-edge">
                    <th scope="col" className={`${HEAD} w-7 text-left`}>#</th>
                    <th scope="col" className={`${HEAD} sticky-col bg-card text-left min-w-[150px]`}>Batter</th>
                    <th scope="col" className={`${HEAD} text-left`}>Dismissal</th>
                    <th scope="col" className={HEAD}>R</th><th scope="col" className={HEAD}>B</th><th scope="col" className={HEAD}>4s</th><th scope="col" className={HEAD}>6s</th><th scope="col" className={HEAD}>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.batsmen.map((b, i) => (
                    <tr key={`${b.id ?? b.name}-${i}`} className="border-b border-edge/60 last:border-0 odd:bg-slate-50/40">
                      <td className="px-2 py-1.5 text-[10px] tabular text-slate-400">{b.position}</td>
                      <th scope="row" className="sticky-col bg-inherit px-2 py-1.5 text-left text-xs font-semibold text-slate-800">
                        {b.id ? (
                          <Link href={playerHref(b.id, b.name, matchContext)} className="hover:text-navy-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand rounded-sm">{b.name}</Link>
                        ) : b.name}
                        {b.isBatting ? <span title="At the crease (provider flag)" aria-label="at the crease"> •</span> : null}
                      </th>
                      <td className="max-w-[220px] whitespace-normal px-2 py-1.5 text-[10px] leading-4 text-slate-500">{b.dismissal ?? '—'}</td>
                      <td className={`${CELL} font-bold text-navy-900`}>{formatInt(b.runs)}</td>
                      <td className={CELL}>{formatInt(b.balls)}</td>
                      <td className={CELL}>{formatInt(b.fours)}</td>
                      <td className={CELL}>{formatInt(b.sixes)}</td>
                      <td className={CELL}>{formatRate(b.strikeRate, 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-edge bg-slate-50/60">
                    <td colSpan={3} className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</td>
                    <td className={`${CELL} font-black text-navy-900`} colSpan={5}>{inn.score || '—'}{inn.overs ? ` · ${inn.overs} ov` : ''}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="px-3 py-2 text-[11px] text-slate-400">Batting table not returned for this innings (totals-only coverage).</p>
            )}
            {inn.bowlers.length > 0 ? (
              <table className="w-full border-collapse border-t border-edge">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-edge">
                    <th scope="col" className={`${HEAD} sticky-col bg-card text-left min-w-[150px]`}>Bowler</th>
                    <th scope="col" className={HEAD}>O</th><th scope="col" className={HEAD}>M</th><th scope="col" className={HEAD}>R</th><th scope="col" className={HEAD}>W</th><th scope="col" className={HEAD}>Econ</th><th scope="col" className={HEAD}>Wd</th><th scope="col" className={HEAD}>Nb</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.bowlers.map((b, i) => (
                    <tr key={`${b.id ?? b.name}-${i}`} className="border-b border-edge/60 last:border-0 odd:bg-slate-50/40">
                      <th scope="row" className="sticky-col bg-inherit px-2 py-1.5 text-left text-xs font-semibold text-slate-800">
                        {b.id ? (
                          <Link href={playerHref(b.id, b.name, matchContext)} className="hover:text-navy-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand rounded-sm">{b.name}</Link>
                        ) : b.name}
                      </th>
                      <td className={CELL}>{b.overs || '—'}</td>
                      <td className={CELL}>{formatInt(b.maidens)}</td>
                      <td className={CELL}>{formatInt(b.runs)}</td>
                      <td className={`${CELL} font-bold text-navy-900`}>{formatInt(b.wickets)}</td>
                      <td className={CELL}>{formatRate(b.economy, 2)}</td>
                      <td className={CELL}>{formatInt(b.wides)}</td>
                      <td className={CELL}>{formatInt(b.noBalls)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-3 py-2 text-[11px] text-slate-400">Bowling table not returned for this innings.</p>
            )}
            {!extAllMissing && <ExtendedInningsSections innings={inn} />}
          </div>
        </section>
      ))}
      {extAllMissing ? (
        <p className="rounded-md border border-edge bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">
          <strong className="font-semibold text-slate-600">Extras, fall of wickets and partnerships:</strong> not supplied by the provider for this match — &quot;not supplied&quot; means the provider sent nothing, not zero. These sections render automatically once the provider sends them.
        </p>
      ) : null}
      <p className="text-[10px] leading-4 text-slate-400">
        {extAllMissing ? '' : 'Extras, fall of wickets and partnerships render only when the endpoint supplies them; "not supplied" means the provider sent nothing, not zero. '}
        Overs are cricket notation (19.5 = 19 overs, 5 balls). &quot;•&quot; marks the provider&apos;s at-the-crease flag, not an out/not-out ruling.
      </p>
    </div>
  )
}
