'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadTeamAssets } from '@/lib/storage'

const assetCache: { map: Map<string, string> | null } = { map: null }

/**
 * ESPN cricket team-logo CDN — the exact family of URLs the live feed emits.
 * Marks for numeric `espn:<id>` asset keys are served primarily through our
 * same-origin proxy (`/api/team-logo/espn/<id>`, which fetches the very same
 * public asset server-side — direct browser loads were being lost to
 * hotlink/referer blocking, leaving most marks blank). The direct CDN URL is
 * kept as a second chance; a failure there falls back to the monogram, so a
 * missing file can never show a wrong crest.
 */
const ESPN_LOGO_BASE = 'https://a.espncdn.com/i/teamlogos/cricket/500/'
const espnIdFromKey = (key: string): string | null => /^espn:(\d{1,7})$/.exec(key.trim())?.[1] ?? null
const proxyLogo = (id: string) => `/api/team-logo/espn/${id}`

function initials(short: string, name: string): string {
  const base = (short || name).trim()
  const words = base.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase()
  return base.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?'
}

/** Deterministic hue from a key — same team, same badge color. */
function hueFromKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h % 360
}

export interface TeamIdentityProps {
  /** Provider-namespaced id, e.g. `espn:3609` — used for the asset registry key. */
  assetKey: string
  name: string
  short?: string | null
  /** Verified URL from feed/detail metadata. Preferred over the registry. */
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 64, xl: 88 } as const

/**
 * One reusable identity mark everywhere. Candidate chain: same-origin ESPN
 * logo proxy (numeric espn keys) -> feed imageUrl -> verified registry ->
 * direct ESPN CDN -> monogram fallback (never an official crest claim).
 * Each candidate advances on a single failed image load; cannot loop, and a
 * missing file can never show a wrong crest.
 */
export function TeamIdentity({ assetKey, name, short, imageUrl, size = 'md', className = '' }: TeamIdentityProps) {
  const px = SIZES[size]
  const [idx, setIdx] = useState(0)

  if (assetCache.map === null && typeof window !== 'undefined') {
    assetCache.map = loadTeamAssets()
  }

  const candidates = useMemo(() => {
    const list: string[] = []
    const espnId = espnIdFromKey(assetKey)
    const feedUrl = imageUrl && /^https:\/\//i.test(imageUrl) ? imageUrl : null
    const registryUrl = assetCache.map?.get(assetKey) ?? null
    if (espnId) list.push(proxyLogo(espnId))
    if (feedUrl) list.push(feedUrl)
    if (registryUrl && registryUrl !== feedUrl) list.push(registryUrl)
    if (espnId) list.push(`${ESPN_LOGO_BASE}${espnId}.png`)
    return list
  }, [imageUrl, assetKey])

  // Restart the chain when the inputs change (e.g. provider switch).
  useEffect(() => setIdx(0), [candidates])

  const src = candidates[idx] ?? null

  const label = name || short || 'Unknown team'
  const showImg = src !== null
  const hue = hueFromKey(assetKey || label)

  return showImg ? (
    // eslint-disable-next-line @next/next/no-img-element -- API hosts are not in next/image config by design
    <img
      key={src}
      src={src}
      alt={`${label} badge`}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      style={{ width: px, height: px, objectFit: 'contain' }}
      className={`shrink-0 rounded-full bg-white ring-1 ring-edge ${className}`}
      onError={() => setIdx((i) => i + 1)}
    />
  ) : (
    <span
      role="img"
      aria-label={`${label} fallback badge (not an official crest)`}
      title="Fallback badge — not an official crest"
      style={{
        width: px,
        height: px,
        backgroundColor: `hsl(${hue} 42% 32%)`,
        fontSize: px * 0.36,
      }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ring-1 ring-black/10 ${className}`}
    >
      {initials(short ?? '', name)}
    </span>
  )
}
