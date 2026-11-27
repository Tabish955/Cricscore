'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadTeamAssets } from '@/lib/storage'

const assetCache: { map: Map<string, string> | null } = { map: null }

/**
 * Marks chain for a team: feed-verified imageUrl -> same-origin proxy of that
 * same official asset (only when the feed supplied one) -> verified registry
 * -> monogram. Each candidate advances on a failed image load; the monogram
 * renders underneath at all times, and the <img> fades in once loaded.
 *
 * A null feed imageUrl is authoritative: the API only nulls what is known to
 * be missing, so a miss gets NO network request at all — never a guessed or
 * substituted URL, never a retry of a known-404.
 */
const espnIdFromKey = (key: string): string | null => /^espn:(\d{1,7})$/.exec(key.trim())?.[1] ?? null
const proxyLogo = (id: string) => `/api/team-logo/espn/${id}`

function initials(short: string, name: string): string {
  const base = (short || name).trim()
  const words = base.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase()
  return base.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?'
}

/** Deterministic hue from a key – same team, same badge colour. */
function hueFromKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h % 360
}

export interface TeamIdentityProps {
  /** Provider-namespaced id, e.g. `espn:3609` – used for the asset registry key. */
  assetKey: string
  name: string
  short?: string | null
  /** Verified URL from feed/detail metadata. Preferred over the registry. */
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 64, xl: 88 } as const

export function TeamIdentity({ assetKey, name, short, imageUrl, size = 'md', className = '' }: TeamIdentityProps) {
  const px = SIZES[size]
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)

  if (assetCache.map === null && typeof window !== 'undefined') {
    assetCache.map = loadTeamAssets()
  }

  const candidates = useMemo(() => {
    const list: string[] = []
    const espnId = espnIdFromKey(assetKey)
    const feedUrl = imageUrl && /^https:\/\//i.test(imageUrl) ? imageUrl : null
    const registryUrl = assetCache.map?.get(assetKey) ?? null
    if (feedUrl) list.push(feedUrl)
    // Only when the feed verified a crest exists: the same-origin proxy serves
    // the server-side copy of the official asset, for browsers that cannot
    // hotlink the CDN directly. No feed URL, no proxy — nothing guessed.
    if (feedUrl && espnId) list.push(proxyLogo(espnId))
    if (registryUrl && registryUrl !== feedUrl) list.push(registryUrl)
    return list
  }, [imageUrl, assetKey])

  // Restart the chain when the inputs change (e.g. provider switch).
  useEffect(() => setIdx(0), [candidates])
  // A new candidate must prove itself before it covers the monogram.
  useEffect(() => setLoaded(false), [idx])

  const src = candidates[idx] ?? null
  const label = name || short || 'Unknown team'
  const hue = hueFromKey(assetKey || label)

  const monogram = (
    <span
      role={src ? undefined : 'img'}
      aria-hidden={src ? true : undefined}
      aria-label={src ? undefined : `${label} fallback badge (not an official crest)`}
      title="Fallback badge – not an official crest"
      style={{
        width: px,
        height: px,
        backgroundColor: `hsl(${hue} 38% 30%)`,
        fontSize: Math.round(px * 0.34),
      }}
      className="inline-flex h-full w-full select-none items-center justify-center rounded-full font-sans font-bold text-white/95 ring-1 ring-black/15"
    >
      {initials(short ?? '', name)}
    </span>
  )

  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: px, height: px }}>
      {monogram}
      {src ? (
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
          style={{ width: px, height: px, objectFit: 'contain', opacity: loaded ? 1 : 0 }}
          className="mark-fade absolute inset-0 rounded-full bg-card ring-1 ring-edge"
          onLoad={() => setLoaded(true)}
          onError={() => setIdx((i) => i + 1)}
        />
      ) : null}
    </span>
  )
}
