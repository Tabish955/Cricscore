/** Provider-local identity only. A conflicting published ID must never match by name. */
export function matchesPlayer(candidate: { id: string | null; name: string }, id: string, name: string): boolean {
  if (candidate.id) return candidate.id === id
  return !!name.trim() && candidate.name.trim().toLowerCase() === name.trim().toLowerCase()
}

/** External profile navigation, not an image URL or cross-provider ID mapping. */
export function playerProfileUrl(provider: string, id: string): string | null {
  if (provider !== 'espn' || !/^[1-9]\d*$/.test(id)) return null
  return `https://www.cricinfo.com/ci/content/player/${id}.html`
}
