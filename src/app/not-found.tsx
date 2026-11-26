import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-edge bg-card p-8 text-center shadow-card">
      <p className="text-5xl font-black tabular text-pine-100">404</p>
      <h1 className="mt-2 text-base font-black text-pine-950">That page isn&apos;t on any scorecard</h1>
      <p className="mt-1 text-xs text-slate-500">The URL may be wrong, or the fixture may no longer be listed. Nothing is fabricated to fill the gap.</p>
      <Link href="/" className="mt-4 inline-block rounded-md bg-pine-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-pine-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
        Back to the Live Center
      </Link>
    </div>
  )
}
