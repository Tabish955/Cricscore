'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-black uppercase tracking-wide text-red-800">Something broke</p>
      <p className="mt-1 text-xs text-red-700">{error.message || 'An unexpected error occurred while rendering.'}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-md bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        Try again
      </button>
    </div>
  )
}
