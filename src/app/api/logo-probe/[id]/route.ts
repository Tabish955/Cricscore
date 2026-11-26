import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * TEMPORARY diagnostic for the upstream team-logo CDN. NOT part of the site.
 * Removed once the evidence report is captured; must not be merged permanently.
 *
 * GET /api/logo-probe/<id>[?path=500|200|defaultlogo]
 * Performs HEAD then GET against https://a.espncdn.com/i/teamlogos/cricket/<path>
 * and reports method, status, content-type, advertised vs downloaded bytes and
 * selected response headers (cache-control, etag, ACAO, CORP). No cookies, no
 * secrets; upstream is a public CDN.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const path = url.searchParams.get('path') ?? '500'

  let target: string
  if (path === 'defaultlogo') {
    target = 'https://a.espncdn.com/i/teamlogos/cricket/default-team-logo-500.png'
  } else if (path === '500' || path === '200') {
    if (!/^\d{1,7}$/.test(id)) {
      return NextResponse.json({ error: 'id must be 1-7 digits' }, { status: 400 })
    }
    target = `https://a.espncdn.com/i/teamlogos/cricket/${path}/${id}.png`
  } else {
    return NextResponse.json({ error: 'unsupported path option' }, { status: 400 })
  }

  const pickHeaders = (h: Headers) => ({
    contentType: h.get('content-type'),
    contentLength: h.get('content-length'),
    cacheControl: h.get('cache-control'),
    etag: h.get('etag'),
    lastModified: h.get('last-modified'),
    accessControlAllowOrigin: h.get('access-control-allow-origin'),
    crossOriginResourcePolicy: h.get('cross-origin-resource-policy'),
  })

  const out: Record<string, unknown> = { target, checkedAt: new Date().toISOString() }

  // HEAD first: advertised headers only, no body.
  try {
    const head = await fetch(target, { method: 'HEAD', signal: AbortSignal.timeout(8000), redirect: 'follow' })
    out.head = { method: 'HEAD', status: head.status, ok: head.ok, ...pickHeaders(head.headers) }
  } catch (err) {
    out.head = { method: 'HEAD', error: err instanceof Error ? err.message : String(err) }
  }

  // GET second: actual downloaded bytes + magic bytes.
  try {
    const res = await fetch(target, { method: 'GET', signal: AbortSignal.timeout(8000), redirect: 'follow' })
    const buf = await res.arrayBuffer()
    const magic = Array.from(new Uint8Array(buf.slice(0, 8))).map((b) => b.toString(16).padStart(2, '0')).join('')
    out.get = { method: 'GET', status: res.status, ok: res.ok, ...pickHeaders(res.headers), downloadedBytes: buf.byteLength, magicHex: magic }
  } catch (err) {
    out.get = { method: 'GET', error: err instanceof Error ? err.message : String(err) }
  }

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}
