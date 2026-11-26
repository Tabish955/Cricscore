import { NextResponse } from 'next/server'

/**
 * TEMPORARY diagnostic (do not ship): reports what the server sees when it
 * fetches the same upstream asset the team-logo proxy uses. Answers whether
 * missing marks are our proxy's fault or the upstream CDN's.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params
  const started = Date.now()
  const report: Record<string, unknown> = { id, url: `https://a.espncdn.com/i/teamlogos/cricket/500/${id}.png` }
  try {
    const upstream = await fetch(report.url as string, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'image/png,image/*', 'User-Agent': 'Cricline/1.0' },
    })
    report.upstreamStatus = upstream.status
    report.finalUrl = upstream.url
    report.contentType = upstream.headers.get('content-type')
    report.contentLength = upstream.headers.get('content-length')
    const buf = await upstream.arrayBuffer()
    report.bytes = buf.byteLength
    const head = Array.from(new Uint8Array(buf.slice(0, 16))).map((b) => b.toString(16).padStart(2, '0')).join('')
    report.magicHex = head
    report.looksLikePng = head.startsWith('89504e47')
  } catch (error) {
    report.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  }
  report.elapsedMs = Date.now() - started
  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } })
}
