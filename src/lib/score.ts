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

/* ---------------------------------------------------------------- teamId join
 * Spec §1: match scores to teams using `scores[].teamId` and the team's own id —
 * never array position, never abbreviation alone. The normalized fuzzy fallback
 * exists ONLY for recorded demo fixtures whose scores carry no teamId; it
 * compares full names (and never short codes on their own) so an abbreviation
 * alone cannot alias a different side.
 */

export interface ScoreJoinTeam {
  id: string | null
  name: string
  short: string
}

const normToken = (v: string) => v.toLowerCase().replace(/[\u2018\u2019']/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Find the score entry belonging to `team`, or null. Id first; name fallback. */
export function scoreForTeam<T extends { score: string; overs: string; team: string; teamId?: string | null }>(
  scores: readonly T[],
  team: ScoreJoinTeam | null | undefined,
): T | null {
  if (!team) return null
  if (team.id) {
    const hit = scores.find((s) => s.teamId && s.teamId === team.id)
    if (hit) return hit
  }
  const n = normToken(team.name || '')
  if (!n) return null
  return (
    scores.find((s) => {
      if (s.teamId) return false // an id-bearing row belongs to exactly one side; never name-grab it
      const t = normToken(s.team)
      return t.length > 0 && (t === n || n.includes(t) || t.includes(n))
    }) ?? null
  )
}

/** Which side of the match a score row belongs to; id first, name fallback. */
export function sideForScore(
  match: { team1: ScoreJoinTeam | null; team2: ScoreJoinTeam | null },
  score: { team: string; teamId?: string | null },
): 1 | 2 | null {
  if (score.teamId) {
    if (match.team1?.id && match.team1.id === score.teamId) return 1
    if (match.team2?.id && match.team2.id === score.teamId) return 2
    return null
  }
  const t = normToken(score.team)
  if (!t) return null
  const hit = (side: ScoreJoinTeam | null) => {
    const n = normToken(side?.name ?? '')
    return n.length > 0 && (t === n || n.includes(t) || t.includes(n))
  }
  if (hit(match.team1)) return 1
  if (hit(match.team2)) return 2
  return null
}
