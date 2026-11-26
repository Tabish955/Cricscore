'use client'

import { useState } from 'react'
import { fetchDiagnostics } from '@/lib/api/client'

export function ServiceStatus() {
  const [result, setResult] = useState<{ ok: boolean; status: number | null; fetchedAtMs: number } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      const outcome = await fetchDiagnostics('health')
      setResult({ ok: outcome.ok, status: outcome.status, fetchedAtMs: outcome.fetchedAtMs })
    } catch {
      setResult({ ok: false, status: null, fetchedAtMs: Date.now() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-fit min-h-[44px] rounded-md bg-pine-900 px-4 py-2 text-[11px] font-bold text-[#f5f0e4] shadow-sm transition-colors hover:bg-pine-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      >
        {busy ? 'Checking…' : 'Check service status'}
      </button>
      {result ? (
        <p className="text-[11px] text-slate-600" role="status">
          <span className={`font-black tabular ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            HTTP {result.status ?? 'unreachable'}
          </span>
          {' '}at {new Date(result.fetchedAtMs).toLocaleTimeString()}.
          {result.ok ? ' The service is answering.' : ' The service did not answer; scores on screen are the last good data.'}
        </p>
      ) : (
        <p className="text-[9px] text-slate-400">Press the button to ask the service how it is doing right now. Nothing polls by itself.</p>
      )}
    </div>
  )
}
