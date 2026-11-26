/**
 * Score-shape utilities shared by the scoreboard surfaces.
 * The upstream embeds the chase context inside the score string, e.g.
 * "265/1 (35.1/50 ov, target 318)" — keep the figure big and split the
 * context into a subordinate run. Pure; no I/O.
 */

/** Parse the leading "runs/wickets" (or bare "runs") of a score string. */
export function parseScoreText(score: string): { runs: number; wickets: number } | null {
  const m = /^(\d+)\s*(?:\/\s*(\d+))?/.exec(score.trim())
  if (!m) return null
  const runs = Number(m[1])
  const wickets = m[2] !== undefined ? Number(m[2]) : 0
  return Number.isFinite(runs) && Number.isFinite(wickets) ? { runs, wickets } : null
}

export interface DisplayScore {
  /** The big figure, e.g. "265/1". */
  main: string
  /** The embedded context, e.g. "(35.1/50 ov, target 318)", or "" when absent. */
  sub: string
}

/** Split a raw score string into the headline figure and its embedded context. */
export function splitScoreForDisplay(score: string): DisplayScore {
  const m = /^(\d+(?:\s*\/\s*\d+)?)\s*(.*)$/.exec(score.trim())
  if (!m) return { main: score.trim(), sub: '' }
  return { main: m[1]!.replace(/\s+/g, ''), sub: (m[2] ?? '').trim() }
}
