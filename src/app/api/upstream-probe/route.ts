import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * TEMPORARY diagnostic for the incident review (production-cache headers and
 * commentary growth / ID stability). NOT part of the site. Removed once the
 * evidence is captured; must not be merged permanently.
 *
 * GET /api/upstream-probe?path=<allowlisted>&method=head|get|both
 * Allowlist: health, cb/(live|recent|upcoming), espn/match/<id>/commentary[?page=n]
 * No cookies, no secrets; upstream is the public production cricket API.
 */
const ALLOW = /^((health)|(cb\/(live|recent|upcoming))|(espn\/match\/\d+\/commentary))(\?page=\d+)?$/

const pickHeaders = (h: Headers) => ({
  contentType: h.get('content-type'),
  contentLength: h.get('content-length'),
  cacheControl: h.get('cache-control'),
  etag: h.get('etag'),
  lastModified: h.get('last-modified'),
  accessControlAllowOrigin: h.get('access-control-allow-origin'),
  crossOriginResourcePolicy: h.get('cross-origin-resource-policy'),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const path = url.searchParams.get('path') ?? ''
  const method = url.searchParams.get('method') ?? 'both'
  if (!ALLOW.test(path)) {
    return NextResponse.json({ error: 'path not allowlisted' }, { status: 400 })
  }
  const target = `https://cricketapi-beryl.vercel.app/${path}`
  const out: Record<string, unknown> = { target, checkedAt: new Date().toISOString() }

  if (method === 'head' || method === 'both') {
    const t0 = Date.now()
    try {
      const res = await fetch(target, { method: 'HEAD', signal: AbortSignal.timeout(20_000), redirect: 'error' })
      out.head = { method: 'HEAD', status: res.status, ms: Date.now() - t0, ...pickHeaders(res.headers) }
    } catch (err) {
      out.head = { method: 'HEAD', error: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 }
    }
  }

  if (method === 'get' || method === 'both') {
    const t0 = Date.now()
    try {
      const res = await fetch(target, { method: 'GET', signal: AbortSignal.timeout(30_000), redirect: 'error' })
      const buf = await res.arrayBuffer()
      let parsed: unknown = null
      let summary: Record<string, unknown> | null = null
      try {
        parsed = JSON.parse(new TextDecoder().decode(buf))
        const r = (parsed as { result?: Record<string, unknown> }).result
        if (r && Array.isArray(r.commentary)) {
          const items = r.commentary as Array<{ id?: unknown; over?: unknown; ball?: unknown }>
          summary = {
            page: r.page ?? null,
            pageCount: r.pageCount ?? null,
            pageSize: r.pageSize ?? null,
            total: r.total ?? null,
            items: items.length,
            firstId: items[0]?.id ?? null,
            lastId: items[items.length - 1]?.id ?? null,
            firstOver: items[0]?.over ?? null,
            lastOver: items[items.length - 1]?.over ?? null,
            lastBall: items[items.length - 1]?.ball ?? null,
          }
        }
      } catch {
        summary = null
      }
      out.get = { method: 'GET', status: res.status, ms: Date.now() - t0, ...pickHeaders(res.headers), downloadedBytes: buf.byteLength, summary }
    } catch (err) {
      out.get = { method: 'GET', error: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 }
    }
  }

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}
