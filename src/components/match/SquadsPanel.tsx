'use client'

import { useState } from 'react'
import type { SquadsView } from '@/lib/api/normalize'
import { CoverageNote } from '@/components/States'

export function SquadsPanel({ view }: { view: SquadsView }) {
  const [active, setActive] = useState(0)
  if (view.teams.length === 0) {
    return <CoverageNote>The squads endpoint answered but listed no teams — common for fixtures far from kickoff.</CoverageNote>
  }
  const current = view.teams[Math.min(active, view.teams.length - 1)]!
  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label="Squads" className="flex flex-wrap gap-1.5">
        {view.teams.map((t, i) => (
          <button
            key={`${t.teamId ?? i}`}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`rounded-lg border px-3 py-2 text-xs font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand ${active === i ? 'border-navy-900 bg-navy-900 text-white' : 'border-edge bg-white text-slate-600 hover:text-navy-900'}`}
          >
            {t.teamName}
            <span className="tabular ml-1.5 text-[9px] font-semibold opacity-70">{t.players.length} players</span>
          </button>
        ))}
      </div>
      <CoverageNote>
        &quot;XI&quot; marks the provider&apos;s starter flag, not a confirmed playing combination. Roles and styles are as the API returns them —
        no biographies, caps or portraits are available.
      </CoverageNote>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {current.players.map((p, i) => (
          <li key={`${p.id ?? p.name}-${i}`} className="flex items-start gap-2 rounded-lg border border-edge bg-card px-3 py-2">
            <span aria-hidden="true" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[9px] font-black text-navy-800">
              {p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{p.name}</span>
                {p.isCaptain ? <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-black uppercase text-amber-deep ring-1 ring-amber-300" title="Captain (provider flag)">C</span> : null}
                {p.isStarter ? <span className="rounded bg-emerald-100 px-1 py-0.5 text-[8px] font-black uppercase text-emerald-800 ring-1 ring-emerald-300" title="Starter (provider flag)">XI</span> : null}
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
