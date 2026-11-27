'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { MatchView } from '@/lib/api/normalize'
import { matchHref, venueLine, formatMatchDate, formatMatchTime } from '@/lib/format'
import { TeamBadge } from './TeamBadge'
import { RatesLine } from './RatesLine'
import { StatusBadge } from './StatusBadge'
import { FavoriteMatchButton } from './FavoriteToggle'
import { splitScoreForDisplay, scoreForTeam } from '@/lib/score'

/**
 * Featured live match – the scoreboard hero pinned above the grid.
 * Big tabular figures, marks, verdict in serif italic, one CTA.
 */
export function HeroMatch({ match }: { match: MatchView }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const href = matchHref(match)
  const t1 = match.team1
  const t2 = match.team2
  const s1 = t1 ? scoreForTeam(match.scores, t1) : null
  const s2 = t2 ? scoreForTeam(match.scores, t2) : null
  const time = formatMatchTime(match.startDateMs)
  const venue = venueLine(match.venueGround, match.venueCity, match.venueCountry)
  const dateText = match.startDateMs ? `${formatMatchDate(match.startDateMs)}${time ? ` · ${time}` : ''}` : match.startTimeText ?? ''

  const TeamBlock = ({ team, score }: { team: MatchView['team1']; score: ReturnType<typeof scoreForTeam> }) => {
    const label = team?.name ?? 'Team not supplied'
    const disp = score ? splitScoreForDisplay(score.score) : null
    return (
      <div className="flex min-w-0 items-center gap-4 border-b border-white/10 py-3 last:border-b-0">
        <TeamBadge
          assetKey={team?.id ? `${match.provider}:${team.id}` : `${match.provider}:${label}`}
          name={label}
          short={team?.short ?? ''}
          imageUrl={team?.imageUrl ?? null}
          flagUrl={team?.flagUrl}
          size="lg"
        />
        <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-lg font-bold text-[#f5f0e4] sm:text-xl" title={label}>{label}</p>
        {score ? (
          <p className="score-nums whitespace-nowrap text-right font-display text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
            {disp!.main}
            {score.overs ? <span className="ml-2 align-baseline font-sans text-xs font-semibold text-[#9db4a4]">({score.overs} ov)</span> : disp!.sub ? <span className="ml-2 align-baseline font-sans text-xs font-semibold text-[#9db4a4]">{disp!.sub}</span> : null}
          </p>
        ) : (
          <p className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8aa392]">To bat</p>
        )}
      </div>
    )
  }

  return (
    <section aria-label={`Featured match: ${match.teams || 'live match'}`} className="card-in overflow-hidden rounded-2xl border border-brass/40 bg-pine-950 shadow-lift">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-2.5">
        <span className="min-w-0 max-w-full truncate font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-light" title={match.seriesName}>
          {match.seriesName || 'Live match'}
        </span>
        {match.format ? <span className="rounded border border-brass-light/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-brass-light">{match.format}</span> : null}
        <div className="ml-auto flex items-center gap-1.5">
          <StatusBadge badge={match.badge} label={match.badgeLabel} />
          <FavoriteMatchButton match={{ key: match.key, provider: match.provider, matchId: match.matchId, label: match.teams || `${t1?.name ?? '?'} vs ${t2?.name ?? '?'}`, seriesName: match.seriesName, href }} />
        </div>
      </div>

      <Link href={href} className="block px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-light">
        {match.live ? <div className="mb-1 sm:mb-2"><RatesLine scores={match.scores} /></div> : null}
        <div className="flex flex-col">
          <TeamBlock team={t1} score={s1} />
          <TeamBlock team={t2} score={s2} />
        </div>
        {match.status ? (
          <p className="mt-4 border-t border-white/10 pt-3.5 font-display text-lg italic leading-snug text-brass-light" title={match.status}>
            {match.status}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#8aa392]">
          {venue ? <span className="max-w-[70%] truncate" title={venue}>{venue}</span> : null}
          <span className="tabular">{mounted ? dateText : '–'}</span>
          <span className="ml-auto inline-flex items-center gap-1 font-bold uppercase tracking-[0.14em] text-brass-light">
            Open match center
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </span>
        </div>
      </Link>
    </section>
  )
}
