import type { Metadata } from 'next'
import { ServiceStatus } from '@/components/ServiceStatus'
import { SampleModeToggle } from '@/components/SampleModeToggle'

export const metadata: Metadata = {
  title: 'About Cricline',
  description: 'What Cricline is, how fresh the data is, and exactly which features exist.',
}

const MATRIX: Array<{ feature: string; status: 'verified' | 'conditional' | 'unsupported'; note: string }> = [
  { feature: 'Live / recent / upcoming match lists', status: 'verified', note: 'Polled every 15/60/120 seconds' },
  { feature: 'Match detail (matches with detail access)', status: 'conditional', note: 'League and date are required; polls at 10 seconds while live' },
  { feature: 'Batting & bowling scorecards', status: 'conditional', note: 'Full or totals-only per match; four innings supported; 0 is real data; extras, fall of wickets and partnerships render only when published' },
  { feature: 'Ball-by-ball commentary', status: 'conditional', note: 'Pages of 25 balls; page 1 is not necessarily the latest; availability varies by match' },
  { feature: 'Squads & roles', status: 'conditional', note: 'Roles, styles and starter flags as published; no bios, caps or portraits' },
  { feature: 'Dated series scoreboard', status: 'conditional', note: 'Single day only; one date per query' },
  { feature: 'Standings / points table', status: 'conditional', note: 'Season label and validated dates; published stats shown verbatim; empty for bilateral series by design' },
  { feature: 'Match / team / series search (current data)', status: 'verified', note: 'Local across loaded data; server search is optional enrichment with a reduced shape' },
  { feature: 'Favorites (browser-local)', status: 'verified', note: 'localStorage, namespaced keys, no account' },
  { feature: 'ICC rankings', status: 'unsupported', note: 'Not available in this product, intentionally absent' },
  { feature: 'Career records / profiles / bios', status: 'unsupported', note: 'No endpoint; player pages show match-observed stats only' },
  { feature: 'Full season calendars / archives', status: 'unsupported', note: 'Dated scoreboard is not an archive; exhaustive history is impossible here' },
  { feature: 'Head-to-head histories / venue stats', status: 'unsupported', note: 'Not available in this product' },
  { feature: 'Ball tracking / wagon wheels / win predictors', status: 'unsupported', note: 'Not available; no proprietary models reproduced' },
  { feature: 'Streaming, video, fantasy, betting', status: 'unsupported', note: 'Out of scope' },
  { feature: 'News, articles, headlines', status: 'unsupported', note: 'There is no news anywhere in this product, by requirement' },
]

const PILL = {
  verified: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  conditional: 'bg-amber-100 text-amber-900 ring-amber-300',
  unsupported: 'bg-slate-200 text-slate-600 ring-slate-300',
} as const

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight text-pine-950">About Cricline</h1>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
          Cricline is an <strong>original, educational</strong> cricket-scores web app built for a school presentation. It is inspired by
          the function of major cricket products and copies none of their branding, copy or artwork. There is no advertising, no betting,
          no payments, no tracking and no news, ever.
        </p>
        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-slate-500">
          A school presentation project. Team and league marks belong to their respective owners; no rights are claimed by this project.
        </p>
      </div>

      <section aria-labelledby="freshness" className="rounded-xl border border-edge bg-card p-4 shadow-card">
        <h2 id="freshness" className="text-xs font-black uppercase tracking-[0.16em] text-pine-900">How fresh the data is</h2>
        <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-600">
          Cricline is <strong>polling, not push</strong>. The site re-fetches on a schedule; there is no WebSocket or SSE stream anywhere in it.
          Scores can only be as fresh as the latest published update. The site tracks <em>its</em> last successful fetch and in-flight refreshes,
          and it never shows a live badge on stale data.
        </p>
        <table className="mt-2 w-full max-w-2xl border-collapse text-left text-[10px]">
          <thead><tr className="border-b border-edge text-slate-400"><th className="py-1 pr-3">Surface</th><th className="py-1">Poll interval (visible tab)</th></tr></thead>
          <tbody className="text-slate-600">
            {[['Live match lists','15s'],['Recent lists','60s'],['Upcoming lists','120s'],['Live match detail & scorecard','10s'],['Live commentary + pagination metadata','20s'],['Squads & standings','5 min, on entry'],['Completed matches','no polling, manual refresh'],['Hidden / offline tab','polling paused; refresh on return']].map(([a,b]) => (
              <tr key={a} className="border-b border-edge/60 last:border-0"><td className="py-1 pr-3">{a}</td><td className="tabular py-1 font-semibold">{b}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="matrix" className="overflow-hidden rounded-xl border border-edge bg-card shadow-card">
        <h2 id="matrix" className="border-b border-edge bg-pine-100/50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-pine-900">Feature &amp; data coverage matrix</h2>
        <div className="score-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-edge"><th className="px-4 py-2 text-[9px] uppercase tracking-wider text-slate-400">Feature</th><th className="px-4 py-2 text-[9px] uppercase tracking-wider text-slate-400">Coverage</th><th className="px-4 py-2 text-[9px] uppercase tracking-wider text-slate-400">Notes</th></tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.feature} className="border-b border-edge/60 align-top last:border-0">
                  <td className="px-4 py-1.5 text-[11px] font-semibold text-slate-700">{row.feature}</td>
                  <td className="px-4 py-1.5"><span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase ring-1 ${PILL[row.status]}`}>{row.status}</span></td>
                  <td className="px-4 py-1.5 text-[10px] leading-4 text-slate-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sample-mode" className="rounded-xl border border-edge bg-card p-4 shadow-card">
        <h2 id="sample-mode" className="text-xs font-black uppercase tracking-[0.16em] text-pine-900">Offline sample mode</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          If the network is unreachable from the presentation venue, this switch makes every page run from a recorded,
          <strong> fictional</strong> dataset (invented teams, players and scores, league <code>9001</code>). It is never on by default,
          shows a persistent amber banner while active, and never fabricates a live badge.
        </p>
        <div className="mt-2">
          <SampleModeToggle />
        </div>
      </section>

      <section aria-labelledby="service-status" className="rounded-xl border border-edge bg-card p-4 shadow-card">
        <h2 id="service-status" className="text-xs font-black uppercase tracking-[0.16em] text-pine-900">Service status</h2>
        <p className="mt-1 text-[11px] text-slate-600">A quick check of whether the service is answering right now.</p>
        <ServiceStatus />
      </section>
    </div>
  )
}
