import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-edge bg-card p-8 text-center shadow-card">
      <p className="text-5xl font-black tabular text-navy-200">404</p>
      <h1 className="mt-2 text-base font-black text-navy-900">That page isn&apos;t on any scorecard</h1>
      <p className="mt-1 text-xs text-slate-500">The URL may be wrong, or the provider no longer lists this match. Nothing is fabricated to fill the gap.</p>
      <Link href="/" className="mt-4 inline-block rounded-md bg-navy-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">
        Back to the Live Center
      </Link>
    </div>
  )
}
