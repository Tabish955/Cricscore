'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadTeamAssets } from '@/lib/storage'
import { resolveLocalVisual, hashHueFromKey } from '@/lib/team-visuals'
import { ShieldMark } from './ShieldMark'

const assetCache: { map: Map<string, string> | null } = { map: null }

/**
 * Marks chain for a team: feed-verified imageUrl -> same-origin proxy of that
 * same official asset (only when the feed supplied one) -> verified registry
 * -> feed-verified flag -> monogram. Each candidate advances on a failed image load; the monogram
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

const hueFromKey = hashHueFromKey

export interface TeamBadgeProps {
  /** Provider-namespaced id, e.g. `espn:3609` – used for the asset registry key. */
  assetKey: string
  name: string
  short?: string | null
  /** Verified URL from feed/detail metadata. Preferred over the registry and over any flag. */
  imageUrl?: string | null
  /** Feed-supplied flag URL; used as the left-slot badge only when no verified crest exists. */
  flagUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 64, xl: 88 } as const

export function TeamBadge({ assetKey, name, short, imageUrl, flagUrl, size = 'md', className = '' }: TeamBadgeProps) {
  const px = SIZES[size]
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)

  if (assetCache.map === null && typeof window !== 'undefined') {
    assetCache.map = loadTeamAssets()
  }

  const candidates = useMemo(() => {
    const list: Array<{ src: string; isFlag: boolean }> = []
    const espnId = espnIdFromKey(assetKey)
    const feedUrl = imageUrl && /^https:\/\//i.test(imageUrl) ? imageUrl : null
    const flag = flagUrl && /^https:\/\//i.test(flagUrl) ? flagUrl : null
    const registryUrl = assetCache.map?.get(assetKey) ?? null
    if (feedUrl) list.push({ src: feedUrl, isFlag: false })
    // Only when the feed verified a crest exists: the same-origin proxy serves
    // the server-side copy of the official asset, for browsers that cannot
    // hotlink the CDN directly. No feed URL, no proxy — nothing guessed.
    if (feedUrl && espnId) list.push({ src: proxyLogo(espnId), isFlag: false })
    if (registryUrl && registryUrl !== feedUrl) list.push({ src: registryUrl, isFlag: false })
    // Sanctioned local asset (the West Indies flag) — ours, reliable, no feed needed.
    const local = resolveLocalVisual(name)
    if (local?.kind === 'asset') list.push({ src: local.src, isFlag: true })
    // A feed-verified flag is a legitimate national-team badge — allowed to carry the slot when no crest exists.
    if (flag && flag !== feedUrl && flag !== registryUrl) list.push({ src: flag, isFlag: true })
    return list
  }, [imageUrl, flagUrl, assetKey, name])

  // Restart the chain when the inputs change (e.g. provider switch).
  useEffect(() => setIdx(0), [candidates])
  // A new candidate must prove itself before it covers the monogram.
  useEffect(() => setLoaded(false), [idx])

  const local = resolveLocalVisual(name)
  const shield = local?.kind === 'shield' ? local.shield : null
  const current = candidates[idx] ?? null
  const src = current?.src ?? null
  const isFlag = current?.isFlag ?? false
  const label = name || short || 'Unknown team'
  const hue = hueFromKey(assetKey || label)

  // Decorative: the team's visible name sits beside this in every surface, so the
  // badge carries no independent accessible name (spec §4). Initials are text only.
  const monogram = (
    <span
      aria-hidden="true"
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
      {!src && shield ? (
        <span aria-hidden="true" className="absolute inset-0">
          <ShieldMark shield={shield} size={px} />
        </span>
      ) : null}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- API hosts are not in next/image config by design
        <img
          key={src}
          src={src}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ width: px, height: px, objectFit: 'contain', opacity: loaded ? 1 : 0 }}
          className={`mark-fade absolute inset-0 bg-card ring-1 ring-edge ${isFlag ? 'rounded-lg' : 'rounded-full'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setIdx((i) => i + 1)}
        />
      ) : null}
    </span>
  )
}
