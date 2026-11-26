'use client'

import { useEffect, useState } from 'react'
import { isSampleMode, enableSampleMode, disableSampleMode } from '@/lib/sample/mode'

/**
 * Explicit opt-in switch for the offline sample dataset. Never on by default,
 * never silent. Toggling reloads so every query refetches against the sample
 * normalizers instead of a half-warm cache.
 */
export function SampleModeToggle() {
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => setOn(isSampleMode()), [])
  if (on === null) {
    return <div className="h-9 w-40 animate-pulse rounded-md bg-navy-100/40" aria-hidden="true" />
  }
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-bold text-amber-900">Sample mode (offline demo)</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
        Replaces every live fetch with a recorded FICTIONAL dataset so the app works with no
        network. Invented teams, players and scores — never a real match. A persistent amber
        banner stays on screen while it is on. Intended for classrooms where the API host is
        unreachable.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {on ? (
          <button
            type="button"
            onClick={() => {
              disableSampleMode()
              window.location.reload()
            }}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
          >
            Turn sample mode OFF
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              enableSampleMode()
              window.location.reload()
            }}
            className="rounded-md bg-navy-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand"
          >
            Turn sample mode ON
          </button>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
          Status: {on ? 'ON — fictional data' : 'off — live API'}
        </span>
      </div>
    </div>
  )
}
