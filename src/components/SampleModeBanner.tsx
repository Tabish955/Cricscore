'use client'

import { useEffect, useState } from 'react'
import { isSampleMode } from '@/lib/sample/mode'

/**
 * Persistent, unmissable amber banner shown on EVERY page while Sample Mode is
 * on. Sample Mode is opt-in only (localStorage flag set from /demo or /about);
 * this banner is the guarantee that fictional data is never mistaken for live.
 */
export function SampleModeBanner() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    setOn(isSampleMode())
  }, [])
  if (!on) return null
  return (
    <a
      href="/demo"
      role="status"
      className="block bg-amber-400 px-3 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-wider text-amber-950 outline-none hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-900"
    >
      Sample mode — fictional demo data. Not live, not a real match. Turn off in About →
    </a>
  )
}
