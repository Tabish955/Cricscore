'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { MatchView } from '@/lib/api/normalize'
import { matchHref, venueLine, formatMatchDate, formatMatchTime } from '@/lib/format'
import { TeamIdentity } from './TeamIdentity'
import { FlagMark } from './FlagMark'
import { RatesLine } from './RatesLine'
import { StatusBadge } from './StatusBadge'
import { FavoriteMatchButton } from './FavoriteToggle'
import { splitScoreForDisplay } from '@/lib/score'

function scoreForTeam(m: MatchView, name: string, short: string): { score: string; overs: string; declared: boolean } | null {
  const lower = name.toLowerCase()
  const shortLower = short.toLowerCase()
  const hit = m.scores.find((s) => {
    const t = s.team.toLowerCase()
    return t === lower || t === shortLower || lower.includes(t) || t.includes(lower)
  })
  return hit ? { score: hit.score, overs: hit.overs, declared: hit.declared } : null
}

function TeamRow({ m, team }: { m: MatchView; team: MatchView['team1'] }) {
  const label = team?.name ?? 'Team not supplied'
  const short = team?.short ?? ''
  const hit = team ? scoreForTeam(m, label, short) : null
  const disp = hit ? splitScoreForDisplay(hit.score) : null
  return (
    <div className="flex items-center gap-3 py-2.5">
      <TeamIdentity
        assetKey={team?.id ? `${m.provider}:${team.id}` : `${m.provider}:${label}`}
        name={label}
        short={short}
        imageUrl={team?.imageUrl ?? null}
        size="md"
      />
      <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink" title={label}>
        {label}
      </span>
      <FlagMark flagUrl={team?.flagUrl} name={label} />
      {hit ? (
        <span key={hit.score + hit.overs} className="score-flash score-nums whitespace-nowrap font-display text-xl font-black text-pine-950">
          {disp!.main}
          {hit.declared ? <span title="declared">*</span> : null}
          {hit.overs ? <span className="ml-1 align-baseline font-sans text-[10px] font-medium text-slate-500">({hit.overs} ov)</span> : disp!.sub ? <span className="score-nums ml-1 align-baseline font-sans text-[9.5px] font-medium text-slate-500">{disp!.sub}</span> : null}
        </span>
      ) : null}
    </div>
  )
}

export function MatchCard({ match, index }: { match: MatchView; index?: number }) {
  // Date/time text renders only after mount; server (UTC) and browser timezones
  // differ, so SSR and hydration would otherwise print different clocks.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const href = matchHref(match)
  const t1 = match.team1
  const t2 = match.team2
  // Innings that did not map to either team (name mismatch), shown plainly, never forced into alignment.
  const used = new Set<string>()
  for (const t of [t1, t2]) {
    if (t) {
      const hit = scoreForTeam(match, t.name, t.short)
      if (hit) used.add(hit.score + hit.overs)
    }
  }
  const unmatched = match.scores.filter((s) => !used.has(s.score + s.overs))
  const time = formatMatchTime(match.startDateMs)
  const venue = venueLine(match.venueGround, match.venueCity, match.venueCountry)
  const dateText = match.startDateMs ? `${formatMatchDate(match.startDateMs)}${time ? ` · ${time}` : ''}` : match.startTimeText ?? 'Time not supplied'
  const live = match.badge === 'live'

  return (
    <article
      className={`group lift flex flex-col overflow-hidden rounded-2xl border shadow-card transition-shadow duration-200 hover:shadow-lift ${
        live ? 'border-pine-700/30 border-l-4 border-l-brass bg-liveSoft' : 'border-edge bg-card'
      }`}
      aria-label={match.teams || 'Match'}
    >
      <div className="flex items-center gap-2 border-b border-edge/70 px-4 pb-2.5 pt-3.5">
        <span className="min-w-0 truncate font-display text-[11px] font-semibold text-pine-900" title={match.seriesName}>
          {match.seriesName || 'Series not supplied'}
        </span>
        {match.format ? (
          <span className="shrink-0 rounded border border-pine-800/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-pine-800">
            {match.format}
          </span>
        ) : (
          <span className="shrink-0 rounded border border-edge px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Format n/a</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <StatusBadge badge={match.badge} label={match.badgeLabel} />
          <FavoriteMatchButton
            match={{
              key: match.key,
              provider: match.provider,
              matchId: match.matchId,
              label: match.teams || `${t1?.name ?? '?'} vs ${t2?.name ?? '?'}`,
              seriesName: match.seriesName,
              href,
            }}
          />
        </div>
      </div>

      <Link href={href} className="block rounded-b-2xl px-4 pb-3 pt-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass">
        <TeamRow m={match} team={t1} />
        <div className="border-t border-edge/50" />
        <TeamRow m={match} team={t2} />
        {unmatched.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2 border-t border-dashed border-edge/70 py-0.5 text-[11px] text-slate-500">
            <span className="truncate">{s.team || `Innings ${i + 1}`}</span>
            <span className="score-nums whitespace-nowrap">{s.score}{s.declared ? '*' : ''}{s.overs ? ` (${s.overs} ov)` : ''}</span>
          </div>
        ))}
        {match.status ? (
          <p className="mt-2 font-display text-[13px] italic leading-snug text-pine-800" title={match.status}>
            {match.status}
          </p>
        ) : null}
        {live ? <RatesLine scores={match.scores} tone="light" /> : null}
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-x-2 border-t border-edge/70 px-4 py-2 text-[10px] text-slate-400">
        {venue ? <span className="max-w-[55%] truncate" title={venue}>{venue}</span> : null}
        <span className="tabular ml-auto whitespace-nowrap" title="Times shown in your local time">{mounted ? dateText : '–'}</span>
      </div>
    </article>
  )
}
