'use client'

import { useQuery } from '@tanstack/react-query'
import type { MatchView } from '@/lib/api/normalize'
import { fetchLatestCommentaryItems } from '@/lib/latest-commentary'
import { buildOverStrip, overOrdinal, type BallChip } from '@/lib/over-strip'
import { POLL } from '@/lib/polling'

function chipClasses(chip: BallChip): string {
  switch (chip.kind) {
    case 'wicket': return 'border-red-300 bg-red-100 text-red-800'
    case 'six': return 'border-violet-300 bg-violet-100 text-violet-800'
    case 'four': return 'border-emerald-300 bg-emerald-100 text-emerald-900'
    case 'dot': return 'border-edge bg-slate-100 text-slate-500'
    case 'extra': return 'border-amber-300 bg-amber-50 text-amber-900'
    default: return 'border-edge bg-white text-ink'
  }
}

function Chip({ chip }: { chip: BallChip }) {
  return (
    <span
      title={chip.phrase}
      className={`score-nums inline-flex h-8 w-8 items-center justify-center rounded-md border text-[12px] font-black ${chipClasses(chip)}`}
    >
      {chip.label}
    </span>
  )
}

/**
 * The "runs bar" – a Google/Cricinfo-style strip of the recorded balls, over by
 * over. Renders as many recorded overs as the latest commentary pages cover
 * (horizontally scrollable, oldest → newest, current over emphasised). For
 * live matches only. Reads the recorded tail pages; renders nothing when
 * there is no data.
 */
export function OverStrip({ match, isLive }: { match: MatchView; isLive: boolean }) {
  const query = useQuery({
    queryKey: ['over-strip', match.key],
    staleTime: 15_000,
    refetchInterval: isLive ? POLL.commentaryLive : false,
    queryFn: ({ signal }) => fetchLatestCommentaryItems(match, signal),
  })

  const strip = buildOverStrip(query.data ?? [])
  if (!strip) return null

  const totalOvers = strip.overs.length

  return (
    <section
      aria-label={`Ball by ball by over, up to over ${overOrdinal(strip.currentOver)}`}
      className="rounded-2xl border border-edge bg-card px-4 py-2.5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Runs by over</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">{strip.inningsId !== null ? `Innings ${strip.inningsId} · ` : ''}{totalOvers} over{totalOvers === 1 ? '' : 's'} recorded</span>
      </div>
      <div className="mt-1.5 overflow-x-auto pb-1">
        <div className="flex w-max items-center gap-3">
          {strip.overs.map((group, i) => {
            const isCurrent = i === strip.overs.length - 1
            return (
              <span
                key={group.over}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
                  isCurrent ? 'border-pine-700/40 bg-pine-50 ring-1 ring-[#a87b24]/60' : 'border-transparent'
                }`}
              >
                <span className={`tabular text-[9px] font-black uppercase tracking-[0.12em] ${isCurrent ? 'text-pine-900' : 'text-slate-500'}`}>
                  {overOrdinal(group.over)}
                </span>
                <span className="flex items-center gap-1">
                  {group.balls.map((chip) => <Chip key={chip.key} chip={chip} />)}
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
