'use client'

/**
 * Shared fetch of the newest recorded commentary items (the last page of
 * the record). Used by the score-tap replay overlay and the runs strip.
 * Never called at rest elsewhere; callers gate it (live match, overlay open,
 * runs strip mounted).
 */
import type { CommentaryView, MatchView } from '@/lib/api/normalize'
import { dedupeCommentary, latestCommentaryPage } from '@/lib/api/normalize'
import { fetchCommentaryPage } from '@/lib/api/client'

export async function fetchLatestCommentaryItems(match: MatchView, signal?: AbortSignal): Promise<CommentaryView[]> {
  const first = await fetchCommentaryPage(match, 1, signal)
  const pageCount = first.data.pageCount
  let items = first.data.items
  if (pageCount > 1) {
    const last = await fetchCommentaryPage(match, latestCommentaryPage(pageCount), signal)
    items = last.data.items
  }
  return dedupeCommentary(items)
}
