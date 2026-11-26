import type { ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-slate-500">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-pine-800 motion-reduce:animate-none" />
      {label ? <span className="text-xs">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  )
}

export function LoadingCard({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-edge bg-card p-6 text-center">
      <Spinner label={label} />
      <p className="text-[11px] text-slate-400">Scores can take a few seconds to arrive. The screen never fakes them.</p>
    </div>
  )
}

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-edge bg-card p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

export function ErrorState({ title, detail, onRetry }: { title: string; detail?: string | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-bold">{title}</p>
      {detail ? <p className="mt-1 text-xs text-red-800/90">{detail}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 shadow-sm transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function CoverageNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">
      {children}
    </p>
  )
}
