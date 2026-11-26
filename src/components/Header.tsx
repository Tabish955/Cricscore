import Link from 'next/link'

const NAV = [
  { href: '/', label: 'Live Center' },
  { href: '/series', label: 'Series' },
  { href: '/teams', label: 'Teams' },
  { href: '/standings', label: 'Standings' },
  { href: '/search', label: 'Search' },
  { href: '/favorites', label: 'Favorites' },
  { href: '/about', label: 'About' },
]

/** Persistent, discreet educational disclaimer required on every page. */
export function DisclaimerBar() {
  return (
    <p className="bg-navy-950 px-3 py-1 text-center text-[10px] leading-4 text-navy-100/90 sm:text-[11px]">
      School project · Educational presentation only · Commercial use prohibited. Cricket data and team marks belong to
      their respective owners. Not affiliated with Cricbuzz, ESPNcricinfo or CREX.
    </p>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-900/95 backdrop-blur supports-[backdrop-filter]:bg-navy-900/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 sm:px-4">
        <Link href="/" className="group flex items-baseline gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand rounded">
          <span aria-hidden="true" className="text-lg font-black tracking-tight text-white">
            Cric<span className="text-amber-brand">Score</span>
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-100/70 group-hover:text-navy-100 md:inline">
            Cricket, clearly
          </span>
        </Link>
        <nav aria-label="Primary" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:overflow-visible sm:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-semibold text-navy-100 transition-colors hover:bg-navy-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-10 border-t border-edge bg-navy-950 text-navy-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-[11px] leading-5">
        <p className="font-semibold text-white">CricScore — educational cricket scores demo</p>
        <p>
          Data is proxied live from a community cricket API that chains Cricbuzz → Cricinfo → ESPN public scoreboards →
          CREX. We do not guarantee completeness, accuracy or instantaneous updates. &quot;Updates when our provider updates&quot;
          means polling every few seconds — more than the underlying source updates, never less honestly.
        </p>
        <p>
          Team marks may come from the upstream feed or be generic fallback badges. No affiliation with any club, board,
          broadcaster or data provider. No betting, no ads, no tracking, no accounts.
        </p>
        <p className="text-navy-100/70">
          School project · Educational presentation only · Commercial use prohibited · Cricket data and team marks belong
          to their respective owners · Not affiliated with Cricbuzz, ESPNcricinfo or CREX.{' '}
          <Link href="/about" className="underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand rounded-sm">
            Sources &amp; coverage
          </Link>
          {' · '}
          <Link href="/demo" className="underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand rounded-sm">
            Recorded demo
          </Link>
        </p>
      </div>
    </footer>
  )
}
