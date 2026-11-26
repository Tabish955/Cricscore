'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadTeamAssets } from '@/lib/storage'

const assetCache: { map: Map<string, string> | null } = { map: null }

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
 * One reusable identity mark everywhere. Priority: feed imageUrl -> verified
 * registry -> monogram fallback (never an official crest claim). Single-shot
 * onError; cannot loop.
 */
export function TeamIdentity({ assetKey, name, short, imageUrl, size = 'md', className = '' }: TeamIdentityProps) {
  const px = SIZES[size]
  const [failed, setFailed] = useState(false)

  if (assetCache.map === null && typeof window !== 'undefined') {
    assetCache.map = loadTeamAssets()
  }

  const resolved = useMemo(() => {
    if (imageUrl && /^https:\/\//i.test(imageUrl)) return imageUrl
    return assetCache.map?.get(assetKey) ?? null
  }, [imageUrl, assetKey])

  // Reset failure state when the resolved URL changes (e.g. provider switch).
  useEffect(() => setFailed(false), [resolved])

  const label = name || short || 'Unknown team'
  const showImg = resolved && !failed
  const hue = hueFromKey(assetKey || label)

  return showImg ? (
    // eslint-disable-next-line @next/next/no-img-element -- API hosts are not in next/image config by design
    <img
      src={resolved}
      alt={`${label} badge`}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      style={{ width: px, height: px, objectFit: 'contain' }}
      className={`shrink-0 rounded-full bg-white ring-1 ring-edge ${className}`}
      onError={() => setFailed(true)}
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
