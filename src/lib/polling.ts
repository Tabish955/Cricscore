/**
 * Polling configuration and failure backoff.
 *
 * The API is polling-based (no WebSocket/SSE). Intervals respect the upstream's
 * own cache TTLs plus headroom; background tabs and explicit "completed" matches
 * do not poll. Failures back off exponentially with jitter and never hammer the API.
 */

/** Milliseconds between polls, or false to disable. */
export const POLL = {
  liveList: 15_000,
  recentList: 60_000,
  upcomingList: 120_000,
  matchDetailLive: 10_000,
  scorecardLive: 10_000,
  commentaryLive: 20_000,
  squads: 300_000,
  standings: 300_000,
  completed: false as const,
} as const

export function listPollInterval(tab: 'live' | 'recent' | 'upcoming'): number {
  return tab === 'live' ? POLL.liveList : tab === 'recent' ? POLL.recentList : POLL.upcomingList
}

const BACKOFF_STEPS_MS = [15_000, 30_000, 60_000] as const

/** Exponential backoff with ±20% jitter, capped at 60s: 15s → 30s → 60s. */
export function retryDelayMs(failureCount: number, random: () => number = Math.random): number {
  const idx = Math.min(Math.max(failureCount - 1, 0), BACKOFF_STEPS_MS.length - 1)
  const base = BACKOFF_STEPS_MS[idx]!
  const jitter = 0.8 + random() * 0.4
  return Math.round(base * jitter)
}

export const MAX_QUERY_RETRIES = 3

/**
 * Decide whether to retry a failed query. 4xx (other than 429) is usually not
 * transient for the caller's purposes, but the API's cold start and upstream
 * hiccups surface as 500/502 — retry those with backoff, bounded.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false
  const status = (error as { status?: number | null } | null)?.status
  if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return failureCount < 1 // one quick retry for 404s (route may be warming)
  }
  return true
}

/** Human label for consecutive failure streaks, used by stale badges. */
export function staleLabel(lastOkMs: number | null, nowMs: number): string {
  if (lastOkMs === null) return 'No successful fetch yet'
  const seconds = Math.max(0, Math.round((nowMs - lastOkMs) / 1000))
  if (seconds < 90) return `Last updated ${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `Last updated ${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `Last updated ${hours}h ago`
}
