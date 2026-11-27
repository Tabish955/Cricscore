'use client'

/**
 * Shared fetch of the newest recorded commentary pages (the last `pages`
 * pages of the record — up to 125 deliveries ≈ the latest ~20 overs). Used by
 * the score-tap replay overlay and the runs bar, which shows as many
 * recorded overs as the tail pages cover. Never called at rest elsewhere;
 * callers gate it (live match, overlay open, runs bar mounted).
 */
import type { CommentaryView, MatchView } from '@/lib/api/normalize'
import { dedupeCommentary, latestCommentaryPage } from '@/lib/api/normalize'
import { fetchCommentaryPage } from '@/lib/api/client'

export async function fetchLatestCommentaryItems(match: MatchView, signal?: AbortSignal, pages = 5): Promise<CommentaryView[]> {
  const probe = await fetchCommentaryPage(match, 1, signal)
  const pageCount = probe.data.pageCount
  if (pageCount <= 1) return dedupeCommentary(probe.data.items)
  const lastPage = latestCommentaryPage(pageCount)
  const from = Math.max(1, lastPage - pages + 1)
  const results = await Promise.all(
    Array.from({ length: lastPage - from + 1 }, (_, i) => {
      const page = from + i
      return page === 1
        ? Promise.resolve(probe)
        : fetchCommentaryPage(match, page, signal).catch(() => null)
    }),
  )
  const items = results.flatMap((r) => (r ? r.data.items : []))
  return dedupeCommentary(items)
}
