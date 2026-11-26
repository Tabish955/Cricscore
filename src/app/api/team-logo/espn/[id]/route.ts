import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Same-origin team-logo proxy for numeric ESPN cricket team ids.
 *
 * Why this exists: the upstream feed references ESPN's public team-logo CDN
 * (a.espncdn.com). Loaded straight from the browser those images were being lost
 * to hotlink/referer/network blocking, leaving most marks as monograms. This
 * route fetches the very same public asset server-side and serves it from our
 * own origin. It bypasses no access control (the CDN asset is public; our
 * upstream feed is where the id came from) and proxies exactly one fixed URL
 * family — `espn:<numeric id>` — with a strict id regex, so it cannot be used
 * as an open proxy or SSRF vector.
 *
 * Responses are cached in the browser/edge for a day (logos rarely change).
 * Failures return no-store so transient upstream errors are never pinned.
 */

const ID_RE = /^\d{1,7}$/
const UPSTREAM_TIMEOUT_MS = 8_000
const MAX_BYTES = 512 * 1024 // real logos are a few KB; hard cap for safety

function fail(status: number): NextResponse {
  return new NextResponse(status === 404 ? 'No such team logo.' : 'Logo unavailable.', {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params
  if (!id || !ID_RE.test(id)) return fail(404)

  let upstream: Response
  try {
    upstream = await fetch(`https://a.espncdn.com/i/teamlogos/cricket/500/${id}.png`, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: 'image/png,image/*', 'User-Agent': 'CricScore-SchoolProject/1.0' },
    })
  } catch {
    return fail(502)
  }
  if (!upstream.ok) return fail(404)

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
}
