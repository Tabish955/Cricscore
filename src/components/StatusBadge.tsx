import type { MatchBadge } from '@/lib/api/normalize'

const STYLES: Record<MatchBadge, string> = {
  live: 'bg-pine-900 text-[#f5f0e4] ring-1 ring-pine-700',
  result: 'bg-[#eeede6] text-slate-600 ring-1 ring-edge',
  upcoming: 'bg-transparent text-brass-deep ring-1 ring-brass/60',
  unknown: 'bg-[#eeede6] text-slate-500 ring-1 ring-edge',
}

/** Text + dot always carry meaning; never color alone. */
export function StatusBadge({ badge, label }: { badge: MatchBadge; label: string }) {
  const text = badge === 'live' ? 'LIVE' : badge === 'result' ? 'RESULT' : badge === 'upcoming' ? 'UPCOMING' : 'STATUS'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${STYLES[badge]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge === 'live' ? 'bg-brass-light live-dot' : 'bg-current opacity-60'}`} />
      <span>{text}</span>
      {label && label.toUpperCase() !== text ? <span className="font-semibold normal-case tracking-normal opacity-80">· {label}</span> : null}
    </span>
  )
}
