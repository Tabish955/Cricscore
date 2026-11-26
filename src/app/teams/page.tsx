'use client'

import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { fetchList } from '@/lib/api/client'
import { listPollInterval } from '@/lib/polling'
import { useDebouncedValue } from '@/lib/hooks'
import { TeamIdentity } from '@/components/TeamIdentity'
import { EmptyState, LoadingCard } from '@/components/States'

interface TeamSummary {
  key: string
  provider: string
  id: string | null
  name: string
  short: string
  imageUrl: string | null
  total: number
}

export default function TeamsDirectoryPage() {
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

  const teams = useMemo(() => {
    const map = new Map<string, TeamSummary>()
    for (const r of results) {
      for (const m of r.data?.data.matches ?? []) {
        for (const t of [m.team1, m.team2]) {
          if (!t) continue
          const key = t.id ? `${m.provider}:${t.id}` : `${m.provider}:name:${(t.name || '').toLowerCase()}`
          const existing = map.get(key)
          if (existing) {
            existing.total += 1
            if (!existing.imageUrl && t.imageUrl) existing.imageUrl = t.imageUrl
            continue
          }
          map.set(key, { key, provider: m.provider, id: t.id, name: t.name, short: t.short, imageUrl: t.imageUrl, total: 1 })
        }
      }
    }
    let out = [...map.values()]
    const q = queryText.trim().toLowerCase()
    if (q) out = out.filter((t) => `${t.name} ${t.short} ${t.provider}`.toLowerCase().includes(q))
    out.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    return out
  }, [results, queryText])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-black tracking-tight text-navy-900">Teams</h1>
        <p className="text-[11px] text-slate-500">Every team in the current feeds — scoped to available data, not a global registry. Marks may be fallback badges where the provider sends no logo.</p>
      </div>
      <label className="relative max-w-md">
        <span className="sr-only">Filter teams</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} type="search" placeholder="Search teams…" className="w-full rounded-lg border border-edge bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand" />
      </label>
      {pending ? (
        <LoadingCard label="Reading feeds for teams…" />
      ) : teams.length === 0 ? (
        <EmptyState title="No teams visible" hint="Team cards appear when the current feeds reference them. Try clearing the filter or check the Live Center." />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((t) => {
            const href = t.id
              ? `/teams/${t.provider}/${encodeURIComponent(t.id)}?name=${encodeURIComponent(t.name)}&short=${encodeURIComponent(t.short)}`
              : null
            const body = (
              <div className="flex h-full items-center gap-3 rounded-xl border border-edge bg-card p-3 shadow-card">
                <TeamIdentity assetKey={t.key} name={t.name} short={t.short} imageUrl={t.imageUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800" title={t.name}>{t.name}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.provider}{t.id ? ` · ${t.id}` : ''}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Seen in {t.total} match{t.total === 1 ? '' : 'es'} · {t.short || 'no abbreviation'}</p>
                </div>
              </div>
            )
            return (
              <li key={t.key}>
                {href ? <Link href={href} className="block h-full rounded-xl transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">{body}</Link> : body}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
