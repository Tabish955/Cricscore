'use client'

import { useState } from 'react'
import { fetchDiagnostics, type DiagnosticsOutcome } from '@/lib/api/client'

function DiagnosticsResult({ label, outcome }: { label: string; outcome: DiagnosticsOutcome }) {
  const statusColor = outcome.ok ? 'text-emerald-700' : 'text-red-700'
  const sources = extractSources(outcome.body)
  return (
    <div className="rounded-lg border border-edge bg-slate-50/60 p-3">
      <p className="flex flex-wrap items-baseline gap-2 text-[11px]">
        <code className="font-bold text-slate-700">{label}</code>
        <span className={`font-black tabular ${statusColor}`}>HTTP {outcome.status ?? '—'}</span>
        <span className="text-slate-400">at {new Date(outcome.fetchedAtMs).toLocaleTimeString()}</span>
      </p>
      {sources ? (
        <table className="mt-2 w-full border-collapse text-left text-[10px]">
          <thead><tr className="border-b border-edge text-slate-400"><th className="py-1 pr-3">Source</th><th className="py-1">Available</th></tr></thead>
          <tbody>
            {sources.map((s, i) => (
              <tr key={i} className="border-b border-edge/60 last:border-0">
                <td className="py-1 pr-3 font-semibold text-slate-700">{s.name}</td>
                <td className="py-1">
                  <span className={`inline-flex items-center gap-1 font-bold ${s.available === true ? 'text-emerald-700' : s.available === false ? 'text-red-700' : 'text-slate-400'}`}>
                    <span aria-hidden="true">{s.available === true ? '●' : s.available === false ? '●' : '○'}</span>
                    {s.available === true ? 'yes' : s.available === false ? 'no' : 'unknown'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <pre className="score-scroll mt-2 max-h-48 overflow-auto rounded bg-navy-950 p-2 text-[9px] leading-4 text-emerald-200/90">{safeJson(outcome.body)}</pre>
    </div>
  )
}

function extractSources(body: unknown): Array<{ name: string; available: boolean | null }> | null {
  if (!body || typeof body !== 'object') return null
  const raw = (body as Record<string, unknown>).sources
  if (!Array.isArray(raw)) return null
  return raw.map((entry) => {
    if (!entry || typeof entry !== 'object') return { name: 'unknown source', available: null }
    const e = entry as Record<string, unknown>
    return { name: String(e.name ?? e.source ?? 'unnamed'), available: typeof e.available === 'boolean' ? e.available : null }
  })
}

function safeJson(body: unknown): string {
  try {
    return JSON.stringify(body, null, 2)?.slice(0, 4000) ?? '(empty body)'
  } catch {
    return '(unserializable body)'
  }
}

export function Diagnostics() {
  const [health, setHealth] = useState<DiagnosticsOutcome | null>(null)
  const [sources, setSources] = useState<DiagnosticsOutcome | null>(null)
  const [busy, setBusy] = useState<'health' | 'sources' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (kind: 'health' | 'sources/status') => {
    setBusy(kind === 'health' ? 'health' : 'sources')
    setError(null)
    try {
      const outcome = await fetchDiagnostics(kind)
      if (kind === 'health') setHealth(outcome)
      else setSources(outcome)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => run('health')} disabled={busy !== null} className="rounded-md bg-navy-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-navy-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">
          {busy === 'health' ? 'Checking /health…' : 'Check /health'}
        </button>
        <button type="button" onClick={() => run('sources/status')} disabled={busy !== null} className="rounded-md border border-edge bg-white px-3 py-1.5 text-[11px] font-bold text-navy-900 shadow-sm hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">
          {busy === 'sources' ? 'Checking /sources/status…' : 'Check /sources/status'}
        </button>
      </div>
      {error ? <p role="alert" className="text-[10px] font-semibold text-red-700">{error}</p> : null}
      <p className="text-[9px] text-slate-400">/health proves the server answers, not that every upstream is healthy — read each source&apos;s availability in /sources/status, not the outer success flag.</p>
      {health ? <DiagnosticsResult label="GET /health" outcome={health} /> : null}
      {sources ? <DiagnosticsResult label="GET /sources/status" outcome={sources} /> : null}
    </div>
  )
}
