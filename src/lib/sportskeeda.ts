/**
 * Verified ESPN-league -> Sportskeeda-slug registry for the experimental
 * secondary standings source.
 *
 * Rules (hard):
 *  - Slugs are NEVER derived from a numeric ESPN league ID, and a full URL is
 *    never accepted as a slug. Only explicit, human-verified mappings belong
 *    in VERIFIED_SPORTSKEEDA_MAPPINGS.
 *  - The Sportskeeda backend route is EXPERIMENTAL and NOT released yet
 *    (checked 2026-11-26: upstream root index does not advertise it and a
 *    direct request fails). Until it ships and a mapping is verified against
 *    the public Sportskeeda page, this registry stays empty and the UI shows
 *    "Additional source not configured" instead of any table.
 */

export const SPORTSKEEDA_SLUG_RE = /^[a-z0-9-]{1,100}$/
export const SPORTSKEEDA_PATH_RE = /^sportskeeda\/series\/([a-z0-9-]{1,100})\/points-table$/

export interface VerifiedSportskeedaMapping {
  /** ESPN league id (digits only). */
  leagueId: string
  /** Sportskeeda series slug, e.g. "syed-mushtaq-ali-trophy". */
  seriesSlug: string
  /** Why this mapping is considered verified. */
  note: string
}

export const VERIFIED_SPORTSKEEDA_MAPPINGS: readonly VerifiedSportskeedaMapping[] = Object.freeze([])

/** The mapping for a league, or null when none is verified/configured. */
export function sportskeedaMappingFor(leagueId: string | null | undefined): VerifiedSportskeedaMapping | null {
  if (!leagueId || !/^\d{1,12}$/.test(leagueId)) return null
  return VERIFIED_SPORTSKEEDA_MAPPINGS.find((m) => m.leagueId === leagueId) ?? null
}

/** True only for the exact path shape the experimental adapter serves. */
export function isSportskeedaPointsTablePath(pathname: string): boolean {
  return SPORTSKEEDA_PATH_RE.test(pathname.replace(/^\/+/, '').replace(/\/+$/, ''))
}
