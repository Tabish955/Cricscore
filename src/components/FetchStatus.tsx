'use client'

import { useEffect, useState } from 'react'
import { formatFetchedAt } from '@/lib/format'

export interface FetchStatusProps {
  /** Website wall-clock time of last successful fetch (null = never). */
  lastOkMs: number | null
  isFetching: boolean
  /** True when the last refresh failed but we still hold good data. */
  isStale: boolean
  onRefresh?: () => void
  /** Compact mode for dense headers. */
  compact?: boolean
}

/**
 * Freshness strip: website last-OK time, in-flight refresh indicator, and a
 * stale badge when failures occur. Old scores stay on screen, never silently
 * swapped or faked.
 */
export function FetchStatus({ lastOkMs, isFetching, isStale, onRefresh, compact = false }: FetchStatusProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 ${compact ? '' : 'mt-1'}`} role="status" aria-live="off">
      <span title="Your local time">Updated {mounted ? formatFetchedAt(lastOkMs) : '…'}</span>
      {isFetching ? <span className="font-medium text-pine-800">Refreshing…</span> : null}
      {isStale ? (
        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-bold uppercase text-amber-900">
          <span aria-hidden="true">⚠</span> Stale, last good data shown
        </span>
      ) : null}
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-[28px] rounded border border-edge bg-card px-2 py-1 font-semibold text-pine-800 shadow-sm transition-colors hover:border-brass hover:text-brass-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          Refresh now
        </button>
      ) : null}
    </div>
  )
}
