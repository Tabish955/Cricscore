import type { MatchView } from '@/lib/api/normalize'
import { computeRates, formatRate } from '@/lib/rates'

/**
 * Google-style run-rate line for a live/chasing innings. The feed embeds the
 * overs and target in the score string; when they are absent the figure is
 * omitted — never estimated.
 */
export function RatesLine({ scores, tone = 'dark' }: { scores: MatchView['scores']; tone?: 'dark' | 'light' }) {
  const live = scores.length ? scores[scores.length - 1]! : null
  if (!live) return null
  const { crr, rrr } = computeRates(live.score, live.overs)
  if (crr === null) return null
  const color = tone === 'dark' ? 'text-[#9db4a4]' : 'text-slate-500'
  return (
    <p className={`tabular mt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] ${color}`}>
      CRR {formatRate(crr)}
      {rrr !== null ? <span> · RRR <span className="text-brass-light">{formatRate(rrr)}</span></span> : null}
    </p>
  )
}
