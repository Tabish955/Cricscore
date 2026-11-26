import type { MatchView } from '@/lib/api/normalize'
import { rememberTeamAssets } from '@/lib/storage'

/** Feed verified imageUrls into the provider:id asset registry. Never guesses URLs. */
export function teamAssetsFromMatches(matches: MatchView[]): void {
  const entries: Array<{ key: string; imageUrl: string | null }> = []
  for (const m of matches) {
    for (const t of [m.team1, m.team2]) {
      if (t?.id) entries.push({ key: `${m.provider}:${t.id}`, imageUrl: t.imageUrl })
    }
  }
  rememberTeamAssets(entries)
}
