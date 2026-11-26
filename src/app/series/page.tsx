'use client'

import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { fetchList } from '@/lib/api/client'
import { POLL, listPollInterval } from '@/lib/polling'
import { useDebouncedValue } from '@/lib/hooks'
import type { MatchView } from '@/lib/api/normalize'
import { EmptyState, LoadingCard } from '@/components/States'

interface SeriesSummary {
  key: string
  leagueId: string
  name: string
  provider: string
  formats: string[]
  live: number
  recent: number
  upcoming: number
  total: number
}

export default function SeriesDirectoryPage() {
  const [filter, setFilter] = useState('')
  const queryText = useDebouncedValue(filter, 250)
  const results = useQueries({
    queries: (['live', 'recent', 'upcoming'] as const).map((kind) => ({
      queryKey: ['cb-list', kind],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchList(kind, signal),
      refetchInterval: listPollInterval(kind),
    })),
  })
  const pending = results.every((r) => r.isPending)

  const series = useMemo(() => {
    const map = new Map<string, SeriesSummary>()
    const lists: Array<MatchView[]> = results.map((r) => r.data?.data.matches ?? [])
    const [live, recent, upcoming] = lists
    const ingest = (list: MatchView[] | undefined, bucket: 'live' | 'recent' | 'upcoming') => {
      for (const m of list ?? []) {
        const id = m.seriesId
        if (!id) continue
        const key = `${m.provider}:${id}`
        const existing = map.get(key) ?? { key, leagueId: id, name: m.seriesName || `League ${id}`, provider: m.provider, formats: [], live: 0, recent: 0, upcoming: 0, total: 0 }
        existing[bucket] += 1
        existing.total += 1
        if (m.format && !existing.formats.includes(m.format)) existing.formats.push(m.format)
        if (!existing.name && m.seriesName) existing.name = m.seriesName
        map.set(key, existing)
      }
    }
    ingest(live, 'live'); ingest(recent, 'recent'); ingest(upcoming, 'upcoming')
    let out = [...map.values()]
    const q = queryText.trim().toLowerCase()
    if (q) out = out.filter((s) => `${s.name} ${s.leagueId} ${s.provider} ${s.formats.join(' ')}`.toLowerCase().includes(q))
    out.sort((a, b) => b.live - a.live || b.total - a.total || a.name.localeCompare(b.name))
    return out
  }, [results, queryText])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-black tracking-tight text-pine-950">Series</h1>
        <p className="text-[11px] text-slate-500">
          Discovered from the current live, recent and upcoming lists. Not a complete global directory; some series deep-dive into
          dated fixtures and standings, others show what the current scores see only.
        </p>
      </div>
      <label className="relative max-w-md">
        <span className="sr-only">Filter series</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} type="search" placeholder="Filter series…" className="w-full rounded-lg border border-edge bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass" />
      </label>
      {pending ? (
        <LoadingCard label="Reading series data…" />
      ) : series.length === 0 ? (
        <EmptyState title="No series visible right now" hint="Series cards appear when the current scores reference them. Try again later or check the Live Center." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => {
            const deepDive = s.provider === 'espn'
            const inner = (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">League {s.leagueId}</p>
                <h2 className="mt-0.5 line-clamp-2 text-sm font-bold leading-5 text-slate-800">{s.name}</h2>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  {s.formats.length ? s.formats.join(' · ') : 'Format unknown'} · {s.total} match{s.total === 1 ? '' : 'es'} observed
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1 text-[9px] font-bold">
                  {s.live > 0 ? <span className="rounded bg-liveSoft px-1.5 py-0.5 uppercase text-live">{s.live} live</span> : null}
                  {s.recent > 0 ? <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase text-slate-600">{s.recent} recent</span> : null}
                  {s.upcoming > 0 ? <span className="rounded bg-amber-50 px-1.5 py-0.5 uppercase text-amber-900">{s.upcoming} upcoming</span> : null}
                </div>
                <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  {deepDive ? 'Open dated matches & standings' : 'No deeper fixtures or table published'}
                </p>
              </>
            )
            return (
              <li key={s.key}>
                {deepDive ? (
                  <Link href={`/series/${encodeURIComponent(s.leagueId)}`} className="block h-full rounded-xl border border-edge bg-card p-3 shadow-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">{inner}</Link>
                ) : (
                  <div className="h-full rounded-xl border border-dashed border-edge bg-card p-3">{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
