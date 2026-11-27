/**
 * Team-visual resolution for Cricline.
 *
 * Pure: no fetch, no fabricated remote URLs. Our own franchise config supplies
 * trademark-safe two-tone shields (colours are ours, short codes are generic
 * abbreviations — not official marks). National teams show the feed-verified
 * flag when the API supplies one; the single sanctioned local asset is the
 * West Indies cricket flag at /public/flags/west-indies.png (no ISO code
 * exists for it, so the feed can never serve one honestly).
 *
 * Cascade lives in <TeamBadge>: feed crest → same-origin proxy (feed crest
 * only) → verified registry → WI local asset → feed flag → franchise shield →
 * deterministic monogram.
 */

export interface ShieldSpec {
  shortCode: string
  primary: string
  secondary: string
  text: string
}

export type LocalVisual =
  | { kind: 'asset'; src: string }
  | { kind: 'shield'; shield: ShieldSpec }

/** Lowercase, strip punctuation, collapse whitespace. Input for every lookup. */
export function normalizeTeamName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Strip trailing variant tokens (women/U19/A/XI/Shaheens …) repeatedly. */
export function stripVariantTokens(normalized: string): string {
  const VARIANT = /^(women|womens|woman|w|u17|u18|u19|u23|u|under\d+|a|xi|shaheens)$/
  let words = normalized.split(' ')
  while (words.length > 1 && VARIANT.test(words[words.length - 1]!)) {
    words = words.slice(0, -1)
  }
  return words.join(' ')
}

/** Deterministic hue from a key — same team, same badge colour. */
export function hashHueFromKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h % 360
}

/** WCAG-ish contrast pick for text on our shields/monograms. */
export function readableOn(hex: string): '#f5f0e4' | '#101a14' {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.45 ? '#101a14' : '#f5f0e4'
}

const WI = '/flags/west-indies.png'

/** The one sanctioned non-feed, non-generated asset (user-directed). */
export const NATIONAL_LOCAL_ASSETS: Record<string, string> = {
  'west indies': WI,
  windies: WI,
  wi: WI,
}

interface FranchiseEntry extends ShieldSpec {}

/**
 * Franchise config (IPL, PSL, BBL, CPL, SA20, ILT20, BPL, WPL, The Hundred).
 * Colours are trademark-safe two-tones chosen for instant recognition — NOT
 * official artwork, not fetched from anywhere. Missing/unknown teams fall
 * through to the monogram by design.
 */
const FRANCHISES: Record<string, FranchiseEntry> = Object.fromEntries(
  ([
    // IPL
    ['mumbai indians', ['MI', '#005caf', '#a9c3ee', '#f5f0e4']],
    ['chennai super kings', ['CSK', '#f9cd05', '#1a3d7c', '#1a3d7c']],
    ['royal challengers bengaluru', ['RCB', '#d71920', '#1f1f1f', '#f5f0e4']],
    ['kolkata knight riders', ['KKR', '#3a225d', '#b3a125', '#f5d76e']],
    ['delhi capitals', ['DC', '#17479e', '#ee2424', '#f5f0e4']],
    ['sunrisers hyderabad', ['SRH', '#f26522', '#111111', '#f5f0e4']],
    ['punjab kings', ['PBKS', '#ed1b24', '#a7a9ac', '#f5f0e4']],
    ['rajasthan royals', ['RR', '#ea1a85', '#ffd700', '#f5f0e4']],
    ['gujarat titans', ['GT', '#1b2133', '#c9a227', '#f5f0e4']],
    ['lucknow super giants', ['LSG', '#111f33', '#a3e635', '#a3e635']],
    // WPL (women’s variants resolve via stripVariantTokens; explicit entries here for distinct sides)
    ['up warriorz', ['UPW', '#6a329f', '#cda635', '#f5f0e4']],
    ['gujarat giants', ['GG', '#e75a29', '#1a2f6b', '#f5f0e4']],
    // PSL
    ['lahore qalandars', ['LQ', '#005da9', '#00a562', '#f5f0e4']],
    ['karachi kings', ['KK', '#27306b', '#ed1b24', '#f5f0e4']],
    ['islamabad united', ['IU', '#cf142b', '#111111', '#f5f0e4']],
    ['peshawar zalmi', ['PZ', '#f5c518', '#046a38', '#101a14']],
    ['quetta gladiators', ['QG', '#5a2d82', '#f39c12', '#f5f0e4']],
    ['multan sultans', ['MS', '#0a6c36', '#f7d100', '#f5f0e4']],
    // BBL
    ['sydney sixers', ['SIX', '#581c87', '#2dd4bf', '#f5f0e4']],
    ['sydney thunder', ['THU', '#10173c', '#ffb400', '#f5f0e4']],
    ['melbourne stars', ['STA', '#046a38', '#111111', '#f5f0e4']],
    ['melbourne renegades', ['REN', '#ce0e2d', '#1f2937', '#f5f0e4']],
    ['perth scorchers', ['SCO', '#f26522', '#111111', '#101a14']],
    ['adelaide strikers', ['STR', '#0055a5', '#d40000', '#f5f0e4']],
    ['brisbane heat', ['HEA', '#ee2c24', '#1f9b9e', '#f5f0e4']],
    ['hobart hurricanes', ['HUR', '#5b2a86', '#f2f2f2', '#f5f0e4']],
    // CPL
    ['trinbago knight riders', ['TKR', '#3a225d', '#b3a125', '#f5d76e']],
    ['guyana amazon warriors', ['GAW', '#9e1b32', '#f7d117', '#f5f0e4']],
    ['jamaica tallawahs', ['JAM', '#29abe2', '#111111', '#101a14']],
    ['barbados royals', ['BAR', '#002d62', '#f2b827', '#f5f0e4']],
    ['saint lucia kings', ['SLK', '#d4e157', '#006340', '#101a14']],
    ['saint kitts patriots', ['SKN', '#006341', '#ffd400', '#f5f0e4']],
    // SA20
    ['joburg super kings', ['JSK', '#ffd400', '#111111', '#101a14']],
    ['mi cape town', ['MCT', '#005caf', '#a9c3ee', '#f5f0e4']],
    ['durbans super giants', ['DSG', '#522785', '#00a94f', '#f5f0e4']],
    ['paarl royals', ['PRL', '#6f2da8', '#c9a227', '#f5f0e4']],
    ['pretoria capitals', ['PC', '#d1006c', '#111111', '#f5f0e4']],
    ['sunrisers eastern cape', ['SEC', '#f26522', '#111111', '#101a14']],
    // ILT20
    ['mi emirates', ['MIE', '#005caf', '#a9c3ee', '#f5f0e4']],
    ['dubai capitals', ['DCU', '#c8102e', '#ffd700', '#f5f0e4']],
    ['abu dhabi knight riders', ['ADKR', '#3a225d', '#b3a125', '#f5d76e']],
    ['sharjah warriorz', ['SW', '#d22630', '#111111', '#f5f0e4']],
    ['desert vipers', ['VIP', '#0e7a5a', '#f2f2f2', '#f5f0e4']],
    ['gulf giants', ['GG', '#12263f', '#c9a227', '#f5f0e4']],
    // BPL
    ['rangpur riders', ['RAN', '#e5261f', '#111111', '#f5f0e4']],
    ['comilla victorians', ['CV', '#f26522', '#1b5faa', '#f5f0e4']],
    ['dhaka capitals', ['DCA', '#0055a5', '#ee2424', '#f5f0e4']],
    ['chattogram challengers', ['CCH', '#005f46', '#f7d100', '#f5f0e4']],
    ['sylhet strikers', ['SYL', '#7b1fa2', '#ffd400', '#f5f0e4']],
    // The Hundred
    ['london spirit', ['LNS', '#3b0764', '#14b8a6', '#f5f0e4']],
    ['oval invincibles', ['OVI', '#38bdf8', '#ffffff', '#0b3d91']],
    ['welsh fire', ['WEF', '#dc2626', '#fde047', '#101a14']],
    ['northern superchargers', ['NOS', '#1e3a5f', '#f7d100', '#f5f0e4']],
    ['trent rockets', ['TRT', '#111111', '#a3e635', '#a3e635']],
    ['manchester originals', ['MNG', '#d63384', '#ffffff', '#f5f0e4']],
    ['birmingham phoenix', ['BMP', '#ff9f1c', '#1d3557', '#101a14']],
    ['southern brave', ['SBV', '#0047ab', '#ffd700', '#f5f0e4']],
  ] as Array<[string, [string, string, string, string]]>).map(([name, [shortCode, primary, secondary, text]]) => [
    name,
    { shortCode, primary, secondary, text },
  ]),
)

/** Alias → config key (already normalized). */
const ALIASES: Record<string, string> = {
  'royal challengers bangalore': 'royal challengers bengaluru',
  'kings xi punjab': 'punjab kings',
  'delhi daredevils': 'delhi capitals',
  'peshawari zalmi': 'peshawar zalmi',
  'barbados tridents': 'barbados royals',
  'st lucia zouks': 'saint lucia kings',
  'st kitts patriots': 'saint kitts patriots',
  'johannesburg super kings': 'joburg super kings',
  'durban super giants': 'durbans super giants',
  'northern super chargers': 'northern superchargers',
  'sharjah warriors': 'sharjah warriorz',
  'gujarat giants wpl': 'gujarat giants',
  'windies': 'west indies',
}

export function resolveLocalVisual(rawName: string | null | undefined): LocalVisual | null {
  const n = normalizeTeamName(rawName ?? '')
  if (!n) return null
  const direct = NATIONAL_LOCAL_ASSETS[n] ?? NATIONAL_LOCAL_ASSETS[ALIASES[n] ?? '']
  if (direct) return { kind: 'asset', src: direct }
  const stripped = stripVariantTokens(n)
  const key = FRANCHISES[n] ?? FRANCHISES[ALIASES[n] ?? ''] ?? FRANCHISES[stripped] ?? FRANCHISES[ALIASES[stripped] ?? '']
  return key ? { kind: 'shield', shield: key } : null
}
