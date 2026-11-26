'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery, keepPreviousData } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchList, fetchServerSearch } from '@/lib/api/client'
import { listPollInterval } from '@/lib/polling'
import { useDebouncedValue, useOnlineStatus } from '@/lib/hooks'
import { MatchCard } from '@/components/MatchCard'
import { CoverageNote, EmptyState } from '@/components/States'


/** RFC-ish matchId from a same-origin proxy detail path: /api/cricket/espn/match/123?... */
function proxyToMatchHref(proxyUrl: string | null, teamsHint: string): string | null {
  if (!proxyUrl) return null
  const m = /^\/api\/cricket\/(espn|cb|crex)\/match\/(\d+)(?:\?.*)?$/.exec(proxyUrl)
  if (m) {
    let qs = ''
    try {
      const url = new URL(proxyUrl, 'http://internal')
      const league = url.searchParams.get('league')
      const date = url.searchParams.get('date')
      const p = new URLSearchParams()
      if (league) p.set('league', league)
      if (date) p.set('date', date)
      qs = p.toString() ? `?${p}` : ''
    } catch { qs = '' }
    return `/match/${m[1]}/${m[2]}${qs}`
  }
  return null
}

export default function SearchPage() {
  const [text, setText] = useState('')
  const [serverEnabled, setServerEnabled] = useState(true)
  const queryText = useDebouncedValue(text, 350)
  const online = useOnlineStatus()

  const lists = useQueries({
    queries: (['live', 'recent', 'upcoming'] as const).map((kind) => ({
      queryKey: ['cb-list', kind],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchList(kind, signal),
      refetchInterval: listPollInterval(kind),
    })),
  })

  const localHits = useMemo(() => {
    const q = queryText.trim().toLowerCase()
    const all = lists.flatMap((r) => r.data?.data.matches ?? [])
    if (!q) return all
    return all.filter((m) => {
      const hay = [m.teams, m.seriesName, m.venueGround, m.venueCity, m.team1?.name, m.team2?.name, m.format, m.status, m.provider]
        .filter(Boolean).join(' ').toLowerCase()
      return q.split(/\s+/).every((token) => hay.includes(token))
    })
  }, [lists, queryText])

  const server = useQuery({
    queryKey: ['server-search', queryText],
    queryFn: ({ signal }) => fetchServerSearch(queryText, signal),
    enabled: serverEnabled && online && queryText.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const serverHits = server.data?.data ?? []
  const seenKeys = new Set(localHits.map((m) => m.key))
  const freshServerHits = serverHits.filter((h) => !seenKeys.has(`${h.provider}:${h.matchId}`))

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-black tracking-tight text-navy-900">Search</h1>
      <label className="relative block max-w-2xl">
        <span className="sr-only">Search matches, teams and series</span>
        <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          type="search"
          placeholder="Search current matches, teams, series, venues…"
          className="w-full rounded-xl border border-edge bg-white py-3 pl-11 pr-4 text-base shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand"
        />
      </label>
      <p className="text-[10px] text-slate-400">
        Searches the matches currently on screen (live, recent, upcoming) plus, optionally, the API&apos;s match-search endpoint.
        It does <strong>not</strong> search all of history, players or rankings — the API cannot.
      </p>

      {/* Local results */}
      <section aria-label="Results from currently loaded feeds">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">In current feeds ({localHits.length})</h2>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <input type="checkbox" checked={serverEnabled} onChange={(e) => setServerEnabled(e.target.checked)} className="h-3.5 w-3.5 accent-navy-800" />
            Also query server match search
          </label>
        </div>
        {localHits.length === 0 ? (
          <EmptyState title={queryText ? 'No loaded match matches that' : 'Nothing loaded yet'} hint="Results reflect the live/recent/upcoming feeds, refreshed on their own schedules." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {localHits.map((m) => <MatchCard key={m.key} match={m} />)}
          </div>
        )}
      </section>

      {/* Server enrichment — reduced shape, rendered defensively */}
      {serverEnabled && queryText.trim().length >= 2 ? (
        <section aria-label="Additional server search results">
          <h2 className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Server match search{server.isFetching ? ' · searching…' : ` (${freshServerHits.length})`}
          </h2>
          {server.isError && !server.data ? (
            <CoverageNote>Server search is unavailable right now ({server.error instanceof Error ? server.error.message : 'error'}). Showing feed results only.</CoverageNote>
          ) : freshServerHits.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {freshServerHits.map((hit) => {
                const href = proxyToMatchHref(hit.detailProxyUrl, hit.teams)
                const body = (
                  <div className="flex items-center gap-3 rounded-lg border border-edge bg-card px-3 py-2">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${hit.live ? 'bg-live' : 'bg-slate-300'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-800">{hit.teams}</span>
                      <span className="block truncate text-[10px] text-slate-400">{hit.seriesName || 'Series not supplied'}{hit.status ? ` · ${hit.status}` : ''} · {hit.provider}</span>
                    </span>
                    {href ? <span className="shrink-0 text-[10px] font-bold text-navy-800">Open →</span> : null}
                  </div>
                )
                return <li key={hit.key}>{href ? <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">{body}</Link> : body}</li>
              })}
            </ul>
          ) : server.data ? (
            <p className="text-[11px] text-slate-400">No additional server results.</p>
          ) : null}
          <p className="mt-1 text-[9px] text-slate-400">Server search returns a reduced record (fixture label, status, series) — team marks and scores are unavailable for these rows by design.</p>
        </section>
      ) : null}
    </div>
  )
}
