'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Live Center' },
  { href: '/series', label: 'Series' },
  { href: '/teams', label: 'Teams' },
  { href: '/standings', label: 'Standings' },
  { href: '/search', label: 'Search' },
  { href: '/favorites', label: 'Favorites' },
  { href: '/about', label: 'About' },
]

export function HeaderNav() {
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  return (
    <nav aria-label="Primary" className="order-3 -mx-1 flex w-full gap-0.5 overflow-x-auto pb-0.5 sm:order-none sm:ml-auto sm:w-auto sm:overflow-visible sm:pb-0">
      {NAV.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] items-center whitespace-nowrap border-b-2 px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-light ${
              active ? 'border-brass-light text-[#f5f0e4]' : 'border-transparent text-[#aebfb2] hover:text-[#f5f0e4]'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
