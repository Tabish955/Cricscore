/**
 * Classify a recorded delivery into a single outcome glyph for the
 * ball-event re-enactment. Pure and synchronous; no I/O.
 *
 * The re-enactment re-plays the *event class* only: dot, 1, 2, 3, 4, 6,
 * wicket, or wide/no-ball. It never invents shot telemetry the feed did
 * not publish.
 */
export type BallEventKind =
  | 'dot'
  | 'single'
  | 'two'
  | 'three'
  | 'four'
  | 'six'
  | 'wicket'
  | 'extra'
  | 'unknown'

export interface BallGlyph {
  kind: BallEventKind
  /** Short label shown on the result badge, e.g. "FOUR", "W", "2". */
  label: string
  /** Longer plain-language phrase for aria-labels and captions. */
  phrase: string
  runs: number | null
  wicket: boolean
}

export function classifyBallEvent(input: {
  event: string
  runs: number | null
  wicket: boolean
}): BallGlyph {
  const ev = (input.event || '').toLowerCase().trim()
  const runs = input.runs

  if (input.wicket || /\bwicket\b/.test(ev)) {
    return { kind: 'wicket', label: 'W', phrase: 'wicket fell', runs: runs ?? 0, wicket: true }
  }
  if (/\b(wide|no.?ball|noball|bye|leg.?bye|penalty)\b/.test(ev)) {
    return { kind: 'extra', label: ev.includes('wide') ? 'WIDE' : 'EXTRA', phrase: ev.includes('wide') ? 'wide ball' : 'extra delivery', runs, wicket: false }
  }
  if (/\b(six|maximum)\b/.test(ev) || runs === 6) {
    return { kind: 'six', label: 'SIX', phrase: 'six runs', runs: runs ?? 6, wicket: false }
  }
  if (/\b(four|boundary)\b/.test(ev) || runs === 4) {
    return { kind: 'four', label: 'FOUR', phrase: 'four runs', runs: runs ?? 4, wicket: false }
  }
  if (runs === 1) return { kind: 'single', label: '1', phrase: 'taken for a single', runs: 1, wicket: false }
  if (runs === 2) return { kind: 'two', label: '2', phrase: 'taken for two runs', runs: 2, wicket: false }
  if (runs === 3) return { kind: 'three', label: '3', phrase: 'taken for three runs', runs: 3, wicket: false }
  if (runs === 0 || /\b(no run|dot)\b/.test(ev)) return { kind: 'dot', label: '0', phrase: 'no run', runs: 0, wicket: false }
  if (runs !== null && runs > 0) {
    return { kind: 'single', label: String(runs), phrase: `${runs} runs`, runs, wicket: false }
  }
  return { kind: 'unknown', label: '–', phrase: 'ball recorded', runs, wicket: false }
}
