import type { Metadata } from 'next'
import { Diagnostics } from '@/components/Diagnostics'
import { SampleModeToggle } from '@/components/SampleModeToggle'

export const metadata: Metadata = {
  title: 'About & data sources',
  description: 'What CricScore is, where the data comes from, how fresh it is, and exactly which features the API cannot support.',
}

const MATRIX: Array<{ feature: string; status: 'verified' | 'conditional' | 'unsupported'; note: string }> = [
  { feature: 'Live / recent / upcoming match lists', status: 'verified', note: 'Primary /cb/* feed (Cricbuzz → ESPN fallback chain); polled 15/60/120s' },
  { feature: 'Match detail (ESPN matches)', status: 'conditional', note: 'Works for ESPN-ID matches with league+date; polls at 10s while live' },
  { feature: 'Batting & bowling scorecards', status: 'conditional', note: 'Full or totals-only per match; four innings supported; 0 is real data; extras / FOW / partnerships render only when supplied (backend release pending)' },
  { feature: 'Ball-by-ball commentary', status: 'conditional', note: 'Paginated pages of 25; page 1 is not necessarily latest; per-match availability' },
  { feature: 'Squads & roles', status: 'conditional', note: 'Provider roles/styles/starter flags; no bios, caps or portraits' },
  { feature: 'Dated series scoreboard', status: 'conditional', note: '/espn/series/:league/matches?date=YYYYMMDD — single day only' },
  { feature: 'Standings / points table', status: 'conditional', note: '/espn/standings/:leagueId — season year label + validated dates; displayStats verbatim (137/20.0); group season preserved; empty for bilateral series by design' },
  { feature: 'Additional standings source (Sportskeeda)', status: 'unsupported', note: 'Experimental route not released upstream; registry ships empty — shown as “not configured”, never merged or labelled current-season' },
  { feature: 'Match / team / series search (current data)', status: 'verified', note: 'Local across loaded feeds; server /cb/search is optional enrichment (reduced shape)' },
  { feature: 'Favorites (browser-local)', status: 'verified', note: 'localStorage, provider-scoped keys, no account' },
  { feature: 'ICC rankings', status: 'unsupported', note: 'Not exposed by the API — intentionally absent' },
  { feature: 'Career records / profiles / bios', status: 'unsupported', note: 'No endpoint; player pages show match-observed stats only' },
  { feature: 'Full season calendars / archives', status: 'unsupported', note: 'Dated scoreboard ≠ archive; exhaustive history impossible' },
  { feature: 'Head-to-head histories / venue stats', status: 'unsupported', note: 'No such endpoints' },
  { feature: 'Ball tracking / wagon wheels / win predictors', status: 'unsupported', note: 'Not exposed; no proprietary models reproduced' },
  { feature: 'Streaming, video, fantasy, betting', status: 'unsupported', note: 'Out of scope and prohibited for this school project' },
  { feature: 'News, articles, headlines', status: 'unsupported', note: 'No news anywhere in this product — by requirement' },
]

const PILL = {
  verified: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  conditional: 'bg-amber-100 text-amber-deep ring-amber-300',
  unsupported: 'bg-slate-200 text-slate-600 ring-slate-300',
} as const

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black tracking-tight text-navy-900">About CricScore &amp; its data</h1>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
          CricScore is an <strong>original, educational</strong> cricket-scores web app built for a school presentation. It is inspired by the
          functionality of major cricket products and copies none of their branding, copy or artwork. There is no advertising, no betting,
          no payments, no tracking and no news — ever.
        </p>
      </div>

      <section aria-labelledby="disclaimer" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[11px] leading-5 text-amber-deep">
        <h2 id="disclaimer" className="text-xs font-black uppercase tracking-[0.16em]">Required disclaimer</h2>
        <p className="mt-1 font-semibold">
          School project · Educational presentation only · Commercial use prohibited. Cricket data and team marks belong to their respective
          owners. Not affiliated with Cricbuzz, ESPNcricinfo or CREX.
        </p>
        <p className="mt-1">
          An educational purpose does not override copyright, provider terms or access controls. CricScore uses one public, key-less
          community API and never scrapes, bypasses or impersonates anything. Fallback badges are not official crests; we say so wherever they appear.
        </p>
      </section>

      <section aria-labelledby="attribution" className="rounded-xl border border-edge bg-card p-4">
        <h2 id="attribution" className="text-xs font-black uppercase tracking-[0.16em] text-navy-900">Attribution &amp; sources</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-5 text-slate-600">
          <li>Match data: <strong>cricketapi-beryl.vercel.app</strong> — a community API whose list chain is Cricbuzz → Cricinfo → ESPN public scoreboards → independent CREX. Used as-is; no keys, no scraping of sources.</li>
          <li>Team marks: from the upstream feed when provided (via <code>TeamIdentity</code>); otherwise ESPN&apos;s public team-logo CDN keyed to the provider&apos;s numeric team id (same CDN family the feed uses — a failed image falls back silently); otherwise generic monogram badges labelled as fallbacks. Nothing here is an official club, board or broadcaster logo unless it comes from the feed or ESPN&apos;s CDN for that exact team.</li>
          <li>This site is not affiliated with Cricbuzz, ESPNcricinfo, CREX, the ICC, any board, franchise or broadcaster.</li>
        </ul>
      </section>

      <section aria-labelledby="refresh" className="rounded-xl border border-edge bg-card p-4">
        <h2 id="refresh" className="text-xs font-black uppercase tracking-[0.16em] text-navy-900">How fresh the data is</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          This API is <strong>polling, not push</strong>. &quot;Updates when our provider updates&quot; means the site re-fetches on a schedule —
          you will never see a WebSocket/SSE stream here. The API itself caches (live lists ~15s, recent ~60s, upcoming ~120s, squads/standings ~300s,
          commentary ~20s), so even perfect polling cannot beat the provider&apos;s own freshness. We track <em>provider</em> fetch time,
          <em> our</em> last successful fetch, and in-flight refreshes separately, and we never show a green &quot;live&quot; badge on stale data.
        </p>
        <table className="mt-2 w-full border-collapse text-left text-[10px]">
          <thead><tr className="border-b border-edge text-slate-400"><th className="py-1 pr-3">Surface</th><th className="py-1">Poll interval (visible tab)</th></tr></thead>
          <tbody className="text-slate-600">
            {[['Live match lists','15s'],['Recent lists','60s'],['Upcoming lists','120s'],['Live match detail & scorecard','10s'],['Live commentary + pagination metadata','20s'],['Squads & standings','5 min, on entry'],['Completed matches','no polling — manual refresh'],['Hidden/offline tab','polling paused; refresh on return']].map(([a,b]) => (
              <tr key={a} className="border-b border-edge/60 last:border-0"><td className="py-1 pr-3">{a}</td><td className="tabular py-1 font-semibold">{b}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="matrix" className="overflow-hidden rounded-xl border border-edge bg-card">
        <h2 id="matrix" className="border-b border-edge bg-navy-100/40 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-navy-900">Feature &amp; data coverage matrix</h2>
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
        <p className="border-t border-edge/70 px-4 py-2 text-[10px] text-slate-400">The full matrix with verified/conditional/unsupported tiers lives in <code>docs/COVERAGE-MATRIX.md</code> in the repository.</p>
      </section>

      <section aria-labelledby="sample-mode" className="rounded-xl border border-edge bg-card p-4">
        <h2 id="sample-mode" className="text-xs font-black uppercase tracking-[0.16em] text-navy-900">Offline sample mode</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          If the API host is unreachable from the presentation network, this switch makes every page run from a recorded,
          <strong> fictional</strong> dataset (invented teams, players and scores — league <code>9001</code>). It is never on by default,
          shows a persistent amber banner while active, and never fabricates a &quot;live&quot; badge.
        </p>
        <div className="mt-2">
          <SampleModeToggle />
        </div>
      </section>

      <section aria-labelledby="diagnostics" className="rounded-xl border border-edge bg-card p-4">
        <h2 id="diagnostics" className="text-xs font-black uppercase tracking-[0.16em] text-navy-900">Source diagnostics (you trigger these)</h2>
        <p className="mt-1 text-[11px] text-slate-600">No polling happens here. Press a button to ask the API how it is doing right now.</p>
        <Diagnostics />
      </section>
    </div>
  )
}
