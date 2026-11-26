import Link from 'next/link'
import { HeaderNav } from './HeaderNav'

/** Brand mark: the pavilion ball. Same motif as /icon.svg, kept in sync. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="14" fill="#0c261b" />
      <circle cx="32" cy="32" r="17" fill="#e2b659" />
      <path d="M27.5 16.5c-4.5 9.5-4.5 21.5 0 31" fill="none" stroke="#0c261b" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36.5 16.5c4.5 9.5 4.5 21.5 0 31" fill="none" stroke="#0c261b" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M29.6 24.5h-2.2M29.6 32h-2.2M29.6 39.5h-2.2M36.4 24.5h2.2M36.4 32h2.2M36.4 39.5h2.2" stroke="#0c261b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-pine-950 shadow-[0_2px_0_0_#a87b24]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1.5 px-3 py-2.5 sm:px-4">
        <Link href="/" className="group flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light">
          <BrandMark size={30} />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[22px] font-black tracking-tight text-[#f5f0e4] transition-colors group-hover:text-brass-light">
              Cricline
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#9db4a4] group-hover:text-[#c4d4c8]">
              Cricket, clearly
            </span>
          </span>
        </Link>
        <HeaderNav />
      </div>
    </header>
  )
}

export function Footer() {
  const links = [
    { href: '/', label: 'Live Center' },
    { href: '/series', label: 'Series' },
    { href: '/teams', label: 'Teams' },
    { href: '/standings', label: 'Standings' },
    { href: '/search', label: 'Search' },
    { href: '/favorites', label: 'Favorites' },
    { href: '/about', label: 'About' },
    { href: '/demo', label: 'Recorded demo' },
  ]
  return (
    <footer className="mt-12 bg-pine-950 text-[#aebfb2]">
      <div className="mx-auto max-w-7xl px-4 py-7">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <p className="font-display text-2xl font-black tracking-tight text-[#f5f0e4]">Cricline</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8aa392]">Cricket, clearly</p>
            </div>
          </div>
          <nav aria-label="Footer" className="flex max-w-md flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-sm underline-offset-4 transition-colors hover:text-[#f5f0e4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-5 max-w-3xl text-[11px] leading-5 text-[#8aa392]">
          A school presentation project. Team and league marks belong to their respective owners; no rights are claimed by this project.
          No betting, no ads, no tracking, no accounts.
        </p>
      </div>
    </footer>
  )
}
