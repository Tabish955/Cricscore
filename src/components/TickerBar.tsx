'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchList } from '@/lib/api/client'
import { sortByImportance } from '@/lib/importance'
import { matchHref } from '@/lib/format'

/**
 * Global live ticker – a thin brass-on-pine scoreboard band of verdict lines
 * for every live match, in importance order, scrolling slowly. Pauses on
 * hover/focus; under reduced motion it renders as a wrapped static row.
 */
export function TickerBar() {
  const query = useQuery({
    queryKey: ['cb-list', 'live'],
    queryFn: ({ signal }) => fetchList('live', signal),
    refetchInterval: 30_000,
  })

  const live = sortByImportance((query.data?.data?.matches ?? []).filter((m) => m.badge === 'live'))
  const items = live
    .map((m) => ({ key: m.key, text: m.status ? (m.seriesName ? `${m.seriesName}: ${m.status}` : m.status) : m.seriesName, href: matchHref(m) }))
    .filter((i): i is { key: string; text: string; href: string } => !!i.text)

  if (items.length === 0) return null

  const Row = ({ hidden }: { hidden?: boolean }) => (
    <>
      {items.map((i) => (
        <Link
          key={`${hidden ? 'dup-' : ''}${i.key}`}
          href={i.href}
          tabIndex={-1}
          aria-hidden={true}
          className="mx-4 rounded-sm transition-colors hover:text-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
        >
          {i.text}
          <span className="ml-4 text-brass">•</span>
        </Link>
      ))}
    </>
  )

  return (
    <div className="border-b border-brass/40 bg-pine-900 text-[#e8e4d4]">
      <div className="relative flex items-stretch overflow-hidden">
        <span className="z-10 flex shrink-0 items-center gap-1.5 bg-brass px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-pine-950">
          <span aria-hidden="true" className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-pine-950" />
          Live
        </span>
        <ul className="sr-only">
          {items.map((i) => <li key={i.key}>{i.text}</li>)}
        </ul>
        <div className="ticker-viewport flex items-center overflow-hidden whitespace-nowrap" aria-hidden="true">
          <div className="ticker-track flex items-center py-1 text-[11px] font-semibold">
            <Row />
            <span className="ticker-duplicate flex items-center"><Row hidden /></span>
          </div>
        </div>
      </div>
    </div>
  )
}
