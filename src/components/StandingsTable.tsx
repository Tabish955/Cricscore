'use client'

import type { StandingsView, StandingEntryView } from '@/lib/api/normalize'
import { TeamIdentity } from '@/components/TeamIdentity'
import { EmptyState } from '@/components/States'

const KNOWN_COLUMNS: Array<{ key: keyof StandingEntryView['known']; label: string }> = [
  { key: 'rank', label: '#' },
  { key: 'matchesPlayed', label: 'P' },
  { key: 'matchesWon', label: 'W' },
  { key: 'matchesLost', label: 'L' },
  { key: 'matchesTied', label: 'T' },
  { key: 'noresult', label: 'NR' },
  { key: 'matchPoints', label: 'Pts' },
  { key: 'netrr', label: 'NRR' },
]

/** Renders provider standings verbatim: group names preserved, missing stats as —. */
export function StandingsTable({ view }: { view: StandingsView }) {
  if (view.groups.length === 0) {
    return (
      <EmptyState
        title="No table published for this league"
        hint="Bilateral series and some cups have no standings — an empty table is a valid provider answer, not an error."
      />
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {view.groups.map((group) => {
        const extraKeys = [...new Set(group.entries.flatMap((e) => Object.keys(e.extra)))].slice(0, 6)
        const present = KNOWN_COLUMNS.filter(({ key }) => group.entries.some((e) => e.known[key] !== null))
        return (
          <div key={group.name}>
            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.name}</h3>
            <div className="score-scroll overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-edge text-left">
                    <th scope="col" className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Team</th>
                    {present.map(({ key }) => <th key={key} scope="col" className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">{KNOWN_COLUMNS.find((c) => c.key === key)!.label}</th>)}
                    {extraKeys.map((k) => <th key={k} scope="col" className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry, i) => (
                    <tr key={`${entry.team?.id ?? entry.team?.name ?? i}-${i}`} className="border-b border-edge/60 last:border-0 odd:bg-slate-50/40">
                      <th scope="row" className="px-2 py-1.5">
                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <TeamIdentity assetKey={entry.team?.id ? `espn:${entry.team.id}` : `espn:${entry.team?.name ?? i}`} name={entry.team?.name ?? 'Team'} short={entry.team?.short} imageUrl={entry.team?.imageUrl} size="xs" />
                          <span className="max-w-[160px] truncate">{entry.team?.short || entry.team?.name || 'Unknown team'}</span>
                        </span>
                      </th>
                      {present.map(({ key }) => (
                        <td key={key} className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.known[key] ?? '—'}</td>
                      ))}
                      {extraKeys.map((k) => (
                        <td key={k} className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.extra[k] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      <p className="text-[9px] text-slate-400">Provider-reported figures only; unranked groups keep provider order. Team marks may be fallback badges.</p>
    </div>
  )
}
