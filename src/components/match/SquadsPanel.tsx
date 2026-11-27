'use client'

import { useState } from 'react'
import type { Provider, SquadsView, TeamView } from '@/lib/api/normalize'
import { CoverageNote } from '@/components/States'
import { TeamBadge } from '@/components/TeamBadge'

export function SquadsPanel({ view, provider = 'espn', team1 = null, team2 = null }: { view: SquadsView; provider?: Provider; team1?: TeamView | null; team2?: TeamView | null }) {
  const [active, setActive] = useState(0)
  if (view.teams.length === 0) {
    return <CoverageNote>The squads endpoint answered but listed no teams – common for fixtures far from kickoff.</CoverageNote>
  }
  const current = view.teams[Math.min(active, view.teams.length - 1)]!
  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label="Squads" className="flex flex-wrap gap-1.5">
        {view.teams.map((t, i) => {
          const side = [team1, team2].find((x) => x?.id && x.id === t.teamId) ?? null
          return (
          <button
            key={`${t.teamId ?? i}`}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${active === i ? 'border-pine-900 bg-pine-900 text-white' : 'border-edge bg-white text-slate-600 hover:text-pine-900'}`}
          >
            <TeamBadge assetKey={t.teamId ? `${provider}:${t.teamId}` : `squads:${t.teamName}`} name={side?.name ?? t.teamName} short={side?.short ?? null} imageUrl={side?.imageUrl ?? null} flagUrl={side?.flagUrl ?? null} size="xs" />
            {t.teamName}
            <span className="tabular ml-1.5 text-[9px] font-semibold opacity-70">{t.players.length} players</span>
          </button>
          )
        })}
      </div>
      <CoverageNote>
        &quot;XI&quot; marks the starter flag as published, not a confirmed playing combination. Roles and styles are as reported;
        no biographies, caps or portraits are available.
      </CoverageNote>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {current.players.map((p, i) => (
          <li key={`${p.id ?? p.name}-${i}`} className="flex items-start gap-2 rounded-lg border border-edge bg-card px-3 py-2">
            <span aria-hidden="true" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-100 text-[9px] font-black text-pine-800">
              {p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{p.name}</span>
                {p.isCaptain ? <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-black uppercase text-amber-900 ring-1 ring-amber-300" title="Captain (flag as published)">C</span> : null}
                {p.isStarter ? <span className="rounded bg-emerald-100 px-1 py-0.5 text-[8px] font-black uppercase text-emerald-800 ring-1 ring-emerald-300" title="Starter (flag as published)">XI</span> : null}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-500">{p.role || 'Unknown'}</span>
              {(p.battingStyle || p.bowlingStyle) ? (
                <span className="block text-[9px] text-slate-400">{[p.battingStyle && `Bat: ${p.battingStyle}`, p.bowlingStyle && `Bowl: ${p.bowlingStyle}`].filter(Boolean).join(' · ')}</span>
              ) : null}
            </span>
          </li>
        ))}
        {current.players.length === 0 ? <li className="col-span-full rounded-lg border border-dashed border-edge px-3 py-4 text-center text-[11px] text-slate-500">No players listed for this team.</li> : null}
      </ul>
    </div>
  )
}
