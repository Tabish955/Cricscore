import { NextRequest, NextResponse } from 'next/server'
import { checkUpstreamPath, PRODUCTION_API_ORIGIN } from '@/lib/api/allowlist'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Vercel kills serverless functions at the plan's limit; our upstream timeout is 45s,
// so request the max Hobby/Pro window. On unsupported plans (or self-hosting) this export is ignored.
export const maxDuration = 60

/** Upstream base is fixed to the production API; override via env for self-hosting. */
const UPSTREAM_BASE = (process.env.CRICKET_API_BASE ?? PRODUCTION_API_ORIGIN).replace(/\/+$/, '')

const MAX_BODY_BYTES = 3 * 1024 * 1024 // 3 MB hard cap on upstream responses
const UPSTREAM_TIMEOUT_MS = 45_000 // cold starts can take tens of seconds

async function readBodyWithCap(res: Response): Promise<{ text: string; truncated: boolean }> {
  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) {
    return { text: '', truncated: true }
  }
  if (!res.body) {
    const text = await res.text()
    return { text: text.slice(0, MAX_BODY_BYTES), truncated: text.length > MAX_BODY_BYTES }
  }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      received += value.byteLength
      if (received > MAX_BODY_BYTES) {
        await reader.cancel()
        return { text: '', truncated: true }
      }
      chunks.push(value)
    }
  }
  const merged = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { text: new TextDecoder().decode(merged), truncated: false }
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params
  const segments = path ?? []
  // Root `/api/cricket/` maps to upstream `/` (route listing); otherwise join segments.
  const pathname = segments.join('/')
  const check = checkUpstreamPath(pathname || '/', new URL(req.url).search)
  // The root listing is allowed explicitly; everything else goes through the allowlist.
  if (!check.ok && pathname !== '') {
    return jsonResponse({ success: false, error: check.reason ?? 'Path not allowed.' }, 403)
  }
  const upstreamPath = pathname === '' ? '' : `/${check.path}`
  const upstreamUrl = `${UPSTREAM_BASE}${upstreamPath}${check.query ? `?${check.query}` : ''}`

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: 'application/json', 'User-Agent': 'CricScore-SchoolProject/1.0' },
    })
  } catch (err) {
    const name = (err as { name?: string })?.name ?? ''
    const isTimeout = name === 'TimeoutError' || name === 'AbortError'
    return jsonResponse(
      { success: false, error: isTimeout ? 'The cricket API took too long to respond (timeout).' : 'The cricket API could not be reached from the server.' },
      isTimeout ? 504 : 502,
    )
  }

  const { text, truncated } = await readBodyWithCap(upstream)
  if (truncated) {
    return jsonResponse({ success: false, error: 'Upstream response exceeded the size limit.' }, 502)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return jsonResponse(
      { success: false, error: `Upstream returned non-JSON content (HTTP ${upstream.status}).` },
      502,
    )
  }

  return jsonResponse(parsed, upstream.status)
}

export function POST() {
  return jsonResponse({ success: false, error: 'Only GET is supported.' }, 405)
}
export function PUT() {
  return POST()
}
export function PATCH() {
  return POST()
}
export function DELETE() {
  return POST()
}
