'use client'

import { useEffect, useState } from 'react'
import { formatFetchedAt } from '@/lib/format'

export interface FetchStatusProps {
  /** Website wall-clock time of last successful fetch (null = never). */
  lastOkMs: number | null
  isFetching: boolean
  /** True when the last refresh failed but we still hold good data. */
  isStale: boolean
  /** Provider-reported provenance, e.g. "espn-site · cached · fetchedAt …" */
  provenanceText?: string | null
  provider?: string | null
  onRefresh?: () => void
  /** Compact mode for dense headers. */
  compact?: boolean
}

/**
 * Honest freshness strip: shows provider identity, website last-OK time,
 * whether a refresh is in flight, and a stale/offline badge when failures
 * occur — old scores stay on screen, never silently swapped or faked.
 */
export function FetchStatus({ lastOkMs, isFetching, isStale, provenanceText, provider, onRefresh, compact = false }: FetchStatusProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 ${compact ? '' : 'mt-1'}`} role="status" aria-live="off">
      {provider ? (
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-slate-600">
          via {provider}
        </span>
      ) : null}
      <span title="Your local time">Updated {mounted ? formatFetchedAt(lastOkMs) : '…'}</span>
      {provenanceText ? <span title={provenanceText}>· provider: {provenanceText}</span> : null}
      {isFetching ? <span className="font-medium text-slate-600">Refreshing…</span> : null}
      {isStale ? (
        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-bold uppercase text-amber-deep">
          <span aria-hidden="true">⚠</span> Stale — showing last good data
        </span>
      ) : null}
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="rounded border border-edge bg-white px-1.5 py-0.5 font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand"
        >
          Refresh now
        </button>
      ) : null}
    </div>
  )
}
