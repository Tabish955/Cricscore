import type { MatchBadge } from '@/lib/api/normalize'

const STYLES: Record<MatchBadge, string> = {
  live: 'bg-liveSoft text-live ring-1 ring-live/40',
  result: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
  upcoming: 'bg-amber-50 text-amber-deep ring-1 ring-amber-300',
  unknown: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

/** Text + dot always carry meaning — never color alone. */
export function StatusBadge({ badge, label }: { badge: MatchBadge; label: string }) {
  const text = badge === 'live' ? 'LIVE' : badge === 'result' ? 'RESULT' : badge === 'upcoming' ? 'UPCOMING' : 'STATUS'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[badge]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge === 'live' ? 'bg-live' : 'bg-current opacity-60'} ${badge === 'live' ? 'live-dot' : ''}`} />
      <span>{text}</span>
      {label && label.toUpperCase() !== text ? <span className="font-semibold normal-case tracking-normal opacity-80">· {label}</span> : null}
    </span>
  )
}
