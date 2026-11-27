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
 * The "runs bar" – a Google-style strip of the latest balls of the current
 * over (and the previous over, dimmed), for live matches only. Reads the
 * recorded latest commentary page; renders nothing when it has no data.
 */
export function OverStrip({ match, isLive }: { match: MatchView; isLive: boolean }) {
  const query = useQuery({
    queryKey: ['over-strip', match.key],
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchInterval: isLive ? POLL.commentaryLive : false,
    queryFn: ({ signal }) => fetchLatestCommentaryItems(match, signal),
  })

  const strip = buildOverStrip(query.data ?? [])
  if (!strip) return null

  const both = strip.previousBalls.length > 0

  return (
    <section
      aria-label={`Recent balls, over ${overOrdinal(strip.currentOver)}`}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-edge bg-card px-4 py-2.5 shadow-card"
    >
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Recent balls</span>

      {/* Current over */}
      <span className="flex items-center gap-2">
        <span className="tabular text-[10px] font-black uppercase tracking-[0.14em] text-pine-900">{overOrdinal(strip.currentOver)}</span>
        <span className="flex items-center gap-1.5">
          {strip.currentBalls.map((chip) => <Chip key={chip.key} chip={chip} />)}
        </span>
      </span>

      {/* Previous over, dimmed */}
      {both ? (
        <span className="flex items-center gap-2 opacity-60">
          <span aria-hidden="true" className="h-4 w-px bg-edge" />
          <span className="tabular text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{overOrdinal(strip.previousOver!)}</span>
          <span className="flex items-center gap-1.5">
            {strip.previousBalls.map((chip) => <Chip key={chip.key} chip={chip} />)}
          </span>
        </span>
      ) : null}
    </section>
  )
}
