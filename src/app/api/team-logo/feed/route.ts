import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Same-origin proxy for feed-supplied team assets (crests and flags).
 *
 * Why this exists: the upstream feed references public CDNs (ESPN's team-logo
 * CDN, Cricinfo's hscicdn image host, flagcdn). Loaded straight from the browser
 * those images can be lost to hotlink/referer/network blocking. This route
 * fetches the very asset the feed supplied, server-side, and serves it from our
 * own origin.
 *
 * Safety: the upstream URL is caller-supplied, so the route is an allowlist, not
 * a general proxy — HTTPS only, a fixed set of known public image hosts, no
 * redirects, image/* content only, a hard body cap, and an 8s timeout. It cannot
 * fetch arbitrary URLs, and failures return no-store so transient upstream
 * errors are never pinned.
 */

const ALLOWED_HOSTS = new Set([
  'a.espncdn.com',
  'img1.hscicdn.com',
  'img2.hscicdn.com',
  'flagcdn.com',
  'i.cricbuzz.com',
])
const UPSTREAM_TIMEOUT_MS = 8_000
const MAX_BYTES = 512 * 1024 // real logos/flags are a few KB; hard cap for safety

function fail(status: number): NextResponse {
  return new NextResponse(status === 404 ? 'No such team asset.' : 'Asset unavailable.', {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function GET(req: NextRequest) {
  // Belt and braces: this handler must never surface an unhandled 500 – any
  // unexpected failure degrades to a controlled 502 with no-store.
  try {
    const raw = req.nextUrl.searchParams.get('u')
    if (!raw) return fail(404)
    let target: URL
    try {
      target = new URL(raw)
    } catch {
      return fail(404)
    }
    if (target.protocol !== 'https:') return fail(404)
    const host = target.hostname.toLowerCase()
    if (!ALLOWED_HOSTS.has(host)) return fail(404)

    let upstream: Response
    try {
      upstream = await fetch(target, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        headers: { Accept: 'image/png,image/jpeg,image/webp,image/svg+xml,image/*', 'User-Agent': 'Cricline/1.0' },
      })
    } catch {
      return fail(502)
    }
    if (!upstream.ok) return fail(upstream.status === 404 ? 404 : 502)

    const contentType = (upstream.headers.get('content-type') ?? 'image/png').split(';')[0]!.trim().toLowerCase()
    if (!contentType.startsWith('image/')) return fail(404)
    const declared = Number(upstream.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES) return fail(502)

    let buf: ArrayBuffer
    try {
      buf = await upstream.arrayBuffer()
    } catch {
      return fail(502)
    }
    if (buf.byteLength > MAX_BYTES) return fail(502)

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return fail(502)
  }
}
