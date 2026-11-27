/**
 * Run-rate utilities (CRR / RRR). Pure; no I/O.
 *
 * Sources: the feed embeds everything needed inside the score string, e.g.
 * "141/6 (19.2/20 ov, target 168)" — used overs, innings ball allowance and
 * the chase target. Nothing is inferred when the string lacks them; the
 * figure is simply omitted.
 */
import { parseScoreText } from './score'

export interface RateSet {
  /** Current run rate (runs per over, one decimal's worth of precision). */
  crr: number | null
  /** Required run rate for the chasing side; null for a first innings or a finished chase. */
  rrr: number | null
}

const ONE_DECIMAL = /^(\d+)(?:\.(\d{1,2}))?$/

/** "42.6" (42 overs, 6 balls) -> 258 balls. Notation part must be 0-6. Never returns a guess. */
export function oversToBalls(overs: string): number | null {
  const m = ONE_DECIMAL.exec(overs.trim())
  if (!m) return null
  const full = Number(m[1])
  const part = m[2] !== undefined ? Number(m[2]) : 0
  if (!Number.isFinite(full) || !Number.isFinite(part) || part > 6) return null
  return full * 6 + part
}

/** "179/7 (42.6/50 ov, target 168)" -> { balls: 258, allowanceBalls: 300, target: 168 } */
export function parseScoreContext(score: string): { balls: number | null; allowanceBalls: number | null; target: number | null } {
  const used = /\((\d+(?:\.\d{1,2})?)\s*\/\s*(\d+)\s*ov/.exec(score)
  const usedBare = /\((\d+(?:\.\d{1,2})?)\s*ov/.exec(score)
  const target = /target\s+(\d+)/.exec(score)
  const balls = used ? oversToBalls(used[1]!) : usedBare ? oversToBalls(usedBare[1]!) : null
  const allowanceBalls = used ? oversToBalls(`${used[2]}.0`) : null
  return { balls, allowanceBalls, target: target ? Number(target[1]) : null }
}

/**
 * Compute CRR/RRR from the embedded score context.
 * `oversFallback` is the separate `overs` field (often empty in this feed) — used only when the
 * score string carries no overs of its own.
 */
export function computeRates(score: string, oversFallback = ''): RateSet {
  const parsed = parseScoreText(score)
  if (!parsed) return { crr: null, rrr: null }
  const ctx = parseScoreContext(score)
  const balls = ctx.balls ?? (oversFallback ? oversToBalls(oversFallback) : null)
  if (balls === null || balls <= 0) return { crr: null, rrr: null }
  const crr = (parsed.runs * 6) / balls

  let rrr: number | null = null
  if (ctx.target !== null && ctx.allowanceBalls !== null) {
    const remainingRuns = ctx.target - parsed.runs
    const remainingBalls = ctx.allowanceBalls - balls
    // Chase already won, or the innings is over: required rate is meaningless.
    if (remainingRuns > 0 && remainingBalls > 0) rrr = (remainingRuns * 6) / remainingBalls
  }
  return { crr, rrr }
}

/** "4.15" style; em-dash when unknown. */
export function formatRate(rate: number | null): string {
  return rate === null || !Number.isFinite(rate) ? '–' : rate.toFixed(2)
}
