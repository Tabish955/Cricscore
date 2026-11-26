'use client'

import type { StandingsView, StandingEntryView } from '@/lib/api/normalize'
import { TeamIdentity } from '@/components/TeamIdentity'
import { EmptyState } from '@/components/States'

const KNOWN_COLUMNS: Array<{ key: keyof StandingEntryView['known']; label: string; title?: string }> = [
  { key: 'rank', label: '#' },
  { key: 'matchesPlayed', label: 'P' },
  { key: 'matchesWon', label: 'W' },
  { key: 'matchesLost', label: 'L' },
  { key: 'matchesTied', label: 'T' },
  { key: 'matchesDraw', label: 'D' },
  { key: 'noresult', label: 'NR' },
  { key: 'matchPoints', label: 'Pts' },
  { key: 'netrr', label: 'NRR', title: 'Net run rate exactly as published' },
]

/** Display string wins; numeric fallbacks render via String(); null stays –. */
function cell(entry: StandingEntryView, key: keyof StandingEntryView['known']): string {
  const display = entry.display[key as keyof StandingEntryView['display']]
  if (display !== undefined) return display
  const known = entry.known[key]
  if (known === null) return '–'
  return String(known)
}

/** Renders provider standings verbatim: group names preserved, missing stats as –. */
export function StandingsTable({ view }: { view: StandingsView }) {
  const seasonBits = [
    view.season ? `Season ${view.season}` : null,
    view.seasonMeta?.startDate ? `${view.seasonMeta.startDate} → ${view.seasonMeta.endDate ?? '…'}` : null,
  ].filter(Boolean)

  if (view.groups.length === 0 || view.groups.every((g) => g.entries.length === 0)) {
    return (
      <EmptyState
        title="No table published for this league"
        hint="Bilateral series and some cups have no standings; an empty table is a valid answer, not an error."
      />
    )
  }

  const allEntries = view.groups.flatMap((g) => g.entries)
  const showForAgainst = allEntries.some((e) => e.display.for !== undefined) || allEntries.some((e) => e.display.against !== undefined)
  const forTitle = 'displayStats strings carry runs/overs (e.g. 137/20.0); a bare number is a run-rate-scale figure as supplied; never recomputed.'

  return (
    <div className="flex flex-col gap-3">
      {(view.name || seasonBits.length) ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {view.name ? <span className="text-slate-500">{view.name} · </span> : null}{seasonBits.join(' · ')}
        </p>
      ) : null}

      {view.groups.map((group, gi) => {
        const extraKeys = [...new Set(group.entries.flatMap((e) => Object.keys(e.extra)))].slice(0, 6)
        const present = KNOWN_COLUMNS.filter(({ key }) => group.entries.some((e) => e.known[key] !== null || cell(e, key) !== '–'))
        return (
          <div key={group.id ?? `${group.name}-${gi}`}>
            <h3 className="mb-1 flex flex-wrap items-baseline gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{group.name || 'Table'}</span>
              {group.season !== null ? <span className="rounded bg-slate-100 px-1 py-0.5 text-[8px] font-bold uppercase text-slate-500 ring-1 ring-edge" title="Season label as published for this group">Season {group.season}</span> : null}
            </h3>
            <div className="score-scroll overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-edge text-left">
                    <th scope="col" className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Team</th>
                    {present.map(({ key, label, title }) => <th key={key} scope="col" title={title} className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</th>)}
                    {showForAgainst ? <th scope="col" title={forTitle} className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">For</th> : null}
                    {showForAgainst ? <th scope="col" title={forTitle} className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">Ag</th> : null}
                    {extraKeys.map((k) => <th key={k} scope="col" className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry, i) => (
                    <tr key={group.id ? `${group.id}:${entry.team?.id ?? i}` : `${entry.team?.id ?? entry.team?.name ?? i}-${i}`} className="border-b border-edge/60 last:border-0 odd:bg-slate-50/40">
                      <th scope="row" className="px-2 py-1.5">
                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <TeamIdentity assetKey={entry.team?.id ? `espn:${entry.team.id}` : `espn:${entry.team?.name ?? i}`} name={entry.team?.name ?? 'Team'} short={entry.team?.short} imageUrl={entry.team?.imageUrl} size="xs" />
                          <span className="max-w-[160px] truncate">{entry.team?.short || entry.team?.name || 'Unknown team'}</span>
                        </span>
                      </th>
                      {present.map(({ key }) => (
                        <td key={key} className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{cell(entry, key)}</td>
                      ))}
                      {showForAgainst ? <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700" title={forTitle}>{entry.display.for ?? '–'}</td> : null}
                      {showForAgainst ? <td className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700" title={forTitle}>{entry.display.against ?? '–'}</td> : null}
                      {extraKeys.map((k) => (
                        <td key={k} className="px-2 py-1.5 text-right text-[11px] tabular text-slate-700">{entry.extra[k] ?? '–'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      <p className="text-[9px] leading-3 text-slate-400">Figures exactly as published; unranked groups keep their published order. Net run rate is shown verbatim. Marks may be fallback badges.</p>
    </div>
  )
}
