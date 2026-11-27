/**
 * "Runs bar" — the Google/ESPN-style recent-balls strip for the batting side.
 * Derived purely from the recorded latest commentary page; never invented.
 * Pure; no I/O.
 */
import type { CommentaryView } from '@/lib/api/normalize'
import { classifyBallEvent, type BallEventKind } from '@/lib/event-glyph'

export interface BallChip {
  key: string
  /** Short label inside the chip: "0", "1", "4", "6", "W", "wd", … */
  label: string
  kind: BallEventKind
  /** Plain-language outcome for aria-titles. */
  phrase: string
}

export interface OverStripData {
  /** Innings the strip belongs to (latest non-info ball's innings). */
  inningsId: number | null
  /** Over integer of the current (newest) over, e.g. 33. */
  currentOver: number
  currentBalls: BallChip[]
  /** Over integer of the previous over, when present on the page. */
  previousOver: number | null
  previousBalls: BallChip[]
}

/** Note tokens: commentary notes share the ball slot but are not deliveries. */
const NOTE_RE = /milestone|fifty|hundred|century/i

function parseOverLabel(label: string): { over: number; ball: number } | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(label.trim())
  if (!m) return null
  const over = Number(m[1])
  const ball = m[2] !== undefined ? Number(m[2]) : 0
  return Number.isFinite(over) && Number.isFinite(ball) ? { over, ball } : null
}

/**
 * Build the strip from raw commentary items (any order; a full recorded
 * page may span the tail of the previous over and the current one).
 * Returns null when the page carries no deliveries.
 */
export function buildOverStrip(items: CommentaryView[]): OverStripData | null {
  const deliveries: Array<{ item: CommentaryView; over: number; ball: number }> = []
  for (const item of items) {
    // Deliveries are balls of cricket: dots, runs, boundaries, sixes, wickets,
    // extras (wides/no-balls share the ball index — kept). Pure notes are skipped.
    if (NOTE_RE.test(item.eventRaw || item.event)) continue
    const probe = classifyBallEvent({ event: item.eventRaw || item.event, runs: item.runs, wicket: item.wicket })
    if (probe.kind === 'unknown') continue
    const parsed = parseOverLabel(item.overLabel)
    if (!parsed) continue
    deliveries.push({ item, over: parsed.over, ball: parsed.ball })
  }
  if (deliveries.length === 0) return null

  const byOver = new Map<number, Array<{ item: CommentaryView; ball: number }>>()
  for (const d of deliveries) {
    const list = byOver.get(d.over) ?? []
    list.push({ item: d.item, ball: d.ball })
    byOver.set(d.over, list)
  }
  const overs = [...byOver.keys()].sort((a, b) => a - b)
  const currentOver = overs[overs.length - 1]!
  const previousOver = overs.length > 1 ? overs[overs.length - 2]! : null

  const chip = (entry: { item: CommentaryView; ball: number }): BallChip => {
    const glyph = classifyBallEvent({ event: entry.item.eventRaw || entry.item.event, runs: entry.item.runs, wicket: entry.item.wicket })
    const label =
      glyph.kind === 'wicket' ? 'W'
      : glyph.kind === 'extra' ? (/wide/i.test(entry.item.eventRaw) ? 'wd' : glyph.label.slice(0, 2).toLowerCase())
      : String(entry.item.runs ?? 0)
    return { key: entry.item.key, label, kind: glyph.kind, phrase: glyph.phrase }
  }

  const ordered = (over: number) =>
    (byOver.get(over) ?? [])
      .slice()
      .sort((a, b) => a.ball - b.ball) // page order preserved for equal ball numbers (wides share notation)
      .map(chip)

  const lastDelivery = deliveries[deliveries.length - 1]!
  const inningsId = lastDelivery.item.inningsId

  return {
    inningsId,
    currentOver,
    currentBalls: ordered(currentOver),
    previousOver,
    previousBalls: previousOver !== null ? ordered(previousOver) : [],
  }
}

export function overOrdinal(over: number): string {
  const mod100 = over % 100
  const mod10 = over % 10
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th'
  return `${over}${suffix}`
}
