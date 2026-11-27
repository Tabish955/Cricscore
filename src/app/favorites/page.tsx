'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { loadFavorites, toggleFavoriteMatch, toggleFavoriteTeam, type FavoritesStore } from '@/lib/storage'
import { fetchList } from '@/lib/api/client'
import { listPollInterval } from '@/lib/polling'
import { StatusBadge } from '@/components/StatusBadge'
import { TeamBadge } from '@/components/TeamBadge'
import { formatFetchedAt } from '@/lib/format'
import type { MatchView } from '@/lib/api/normalize'

export default function FavoritesPage() {
  const [store, setStore] = useState<FavoritesStore | null>(null)
  useEffect(() => setStore(loadFavorites()), [])

  const results = useQueries({
    queries: (['live', 'recent', 'upcoming'] as const).map((kind) => ({
      queryKey: ['cb-list', kind],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchList(kind, signal),
      refetchInterval: listPollInterval(kind),
    })),
  })

  const feedIndex = useMemo(() => {
    const map = new Map<string, MatchView>()
    for (const r of results) for (const m of r.data?.data.matches ?? []) map.set(m.key, m)
    return map
  }, [results])
  const feedsFetching = results.some((r) => r.isFetching)
  const retryFeeds = () => results.forEach((r) => r.refetch())
  const lastOk = Math.max(0, ...results.map((r) => r.dataUpdatedAt || 0)) || null

  if (!store) {
    return <div className="rounded-xl border border-edge bg-card p-6 text-center text-xs text-slate-500">Loading your favorites…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-black tracking-tight text-pine-950">Favorites</h1>
          <p className="text-[11px] text-slate-500">Stored only in this browser (no account, no tracking). Keys are namespaced, so the same fixture seen through different views never collides.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span>Updated {formatFetchedAt(lastOk)}{feedsFetching ? ' · refreshing…' : ''}</span>
          <button type="button" onClick={retryFeeds} className="rounded-md border border-edge bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">Refresh</button>
        </div>
      </div>

      {/* Favorite matches */}
      <section aria-labelledby="fav-matches">
        <h2 id="fav-matches" className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-pine-950">Matches ({store.matches.length})</h2>
        {store.matches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-edge bg-card px-4 py-6 text-center text-xs text-slate-500">No favorite matches yet. Tap the star on any match card.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {store.matches.map((m) => {
              const live = feedIndex.get(m.key)
              return (
                <li key={m.key} className="rounded-xl border border-edge bg-card p-3 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{m.seriesName || 'Series not supplied'}</p>
                      <Link href={m.href} className="mt-0.5 block truncate text-sm font-bold text-pine-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded-sm">{m.label}</Link>
                      <p className="mt-0.5 text-[9px] text-slate-400">Saved {new Date(m.savedAt).toLocaleDateString()} · Ref {m.matchId}</p>
                    </div>
                    <button type="button" aria-label={`Remove ${m.label} from favorites`} onClick={() => setStore(toggleFavoriteMatch(m))} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-edge/70 pt-2 text-[10px]">
                    {live ? (
                      <>
                        <StatusBadge badge={live.badge} label={live.badgeLabel} />
                        <span className="truncate text-slate-500">{live.scores.map((s) => `${s.team}: ${s.score}`).join(' · ') || live.status}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">Not in the current data · last seen at save time.{' '}
                        <button type="button" onClick={retryFeeds} className="font-bold text-pine-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">Retry</button>
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Favorite teams */}
      <section aria-labelledby="fav-teams">
        <h2 id="fav-teams" className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-pine-950">Teams ({store.teams.length})</h2>
        {store.teams.length === 0 ? (
          <p className="rounded-xl border border-dashed border-edge bg-card px-4 py-6 text-center text-xs text-slate-500">No favorite teams yet. Open a team and tap the star.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {store.teams.map((t) => (
              <li key={t.key} className="flex items-center gap-3 rounded-xl border border-edge bg-card p-3 shadow-card">
                <TeamBadge assetKey={t.key} name={t.name} short={t.short} size="md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/teams/${t.provider}/${encodeURIComponent(t.teamId)}?name=${encodeURIComponent(t.name)}&short=${encodeURIComponent(t.short)}`} className="block truncate text-sm font-bold text-pine-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded-sm">{t.name}</Link>
                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Saved {new Date(t.savedAt).toLocaleDateString()}</p>
                </div>
                <button type="button" aria-label={`Remove ${t.name} from favorites`} onClick={() => setStore(toggleFavoriteTeam(t))} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-[9px] text-slate-400">Favorites never leave your browser. Clearing site data removes them.</p>
    </div>
  )
}
