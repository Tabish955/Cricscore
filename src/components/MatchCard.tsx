'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { MatchView } from '@/lib/api/normalize'
import { matchHref, venueLine, formatMatchDate, formatMatchTime } from '@/lib/format'
import { TeamIdentity } from './TeamIdentity'
import { StatusBadge } from './StatusBadge'
import { FavoriteMatchButton } from './FavoriteToggle'

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
  return (
    <div className="flex items-center gap-2 py-1">
      <TeamIdentity
        assetKey={team?.id ? `${m.provider}:${team.id}` : `${m.provider}:${label}`}
        name={label}
        short={short}
        imageUrl={team?.imageUrl ?? null}
        size="sm"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800" title={label}>
        {label}
      </span>
      {hit ? (
        <span className="score-nums whitespace-nowrap text-sm font-bold text-navy-900">
          {hit.score}
          {hit.declared ? <span title="declared">*</span> : null}
          {hit.overs ? <span className="ml-1 text-[10px] font-medium text-slate-400">({hit.overs} ov)</span> : null}
        </span>
      ) : null}
    </div>
  )
}

export function MatchCard({ match, index }: { match: MatchView; index?: number }) {
  // Date/time text renders only after mount — server (UTC) and browser timezones
  // differ, so SSR and hydration would otherwise print different clocks.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const href = matchHref(match)
  const t1 = match.team1
  const t2 = match.team2
  // Innings that did not map to either team (name mismatch) — shown plainly, not misaligned.
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

  return (
    <article
      className="flex flex-col overflow-hidden rounded-xl border border-edge bg-card shadow-card transition-shadow hover:shadow-md"
      aria-label={match.teams || 'Match'}
    >
      <div className="flex items-center gap-1.5 border-b border-edge/70 bg-slate-50/60 px-3 py-1.5">
        <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wide text-slate-500" title={match.seriesName}>
          {match.seriesName || 'Series not supplied'}
        </span>
        {match.format ? (
          <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-edge">
            {match.format}
          </span>
        ) : (
          <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-edge">Format n/a</span>
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

      <Link href={href} className="block px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-brand">
        <TeamRow m={match} team={t1} />
        <TeamRow m={match} team={t2} />
        {unmatched.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2 border-t border-dashed border-edge/70 py-0.5 text-[11px] text-slate-500">
            <span className="truncate">{s.team || `Innings ${i + 1}`}</span>
            <span className="score-nums whitespace-nowrap">{s.score}{s.declared ? '*' : ''}{s.overs ? ` (${s.overs} ov)` : ''}</span>
          </div>
        ))}
        {match.status ? (
          <p className="mt-1 border-t border-edge/70 pt-1 text-[11px] font-medium leading-4 text-emerald-900/80" title={match.status}>
            {match.status}
          </p>
        ) : null}
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-x-2 border-t border-edge/70 px-3 py-1.5 text-[9px] text-slate-400">
        {venue ? <span className="max-w-[45%] truncate" title={venue}>{venue}</span> : null}
        <span className="tabular whitespace-nowrap" title="Times shown in your local time">{mounted ? dateText : '—'}</span>
        <span className="ml-auto font-semibold uppercase tracking-wide">{match.provider}</span>
      </div>
    </article>
  )
}
