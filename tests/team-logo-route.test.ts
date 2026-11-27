import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * The feed-asset proxy serves the exact feed-supplied asset from our own origin
 * so browsers never depend on CDN hotlink behaviour. The upstream URL is
 * caller-supplied, so the route is an allowlist (fixed public image hosts),
 * not a general proxy. These tests stub the GLOBAL fetch (what the route does
 * upstream) and assert the route's own behavior.
 */

const routeModule = await import('@/app/api/team-logo/feed/route')

const req = (u?: string) =>
  new NextRequest(`http://localhost/api/team-logo/feed${u === undefined ? '' : `?u=${encodeURIComponent(u)}`}`)

function pngUpstream(bytes = 2000): Response {
  return new Response(new Uint8Array(bytes).fill(7), { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(bytes) } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('feed-asset proxy route', () => {
  it('serves the exact feed-supplied asset with day-long caching', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(pngUpstream())
    const u = 'https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_80/lsci/db/PICTURES/CMS/394600/394631.png'
    const res = await routeModule.GET(req(u) as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toContain('max-age=86400')
    const [upstreamUrl, init] = mockFetch.mock.calls[0]!
    expect(String(upstreamUrl)).toBe(u) // the exact feed URL, nothing substituted
    expect((init as RequestInit).redirect).toBe('error')
  })

  it('proxies flagcdn flag URLs too', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(pngUpstream(99))
    const res = await routeModule.GET(req('https://flagcdn.com/w40/bd.png') as never)
    expect(res.status).toBe(200)
    expect(String(mockFetch.mock.calls[0]![0])).toBe('https://flagcdn.com/w40/bd.png')
  })

  it('refuses non-https, non-allowlisted hosts and malformed URLs without calling upstream', async () => {
    const mockFetch = vi.mocked(fetch)
    for (const bad of [
      'http://a.espncdn.com/x.png',
      'https://evil.example.com/x.png',
      'https://a.espncdn.com.evil.com/x.png',
      'https://169.254.169.254/latest/meta-data',
      'file:///etc/passwd',
      'not-a-url',
    ]) {
      const res = await routeModule.GET(req(bad) as never)
      expect(res.status).toBe(404)
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
    // missing param entirely
    const missing = await routeModule.GET(req() as never)
    expect(missing.status).toBe(404)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('maps upstream 404 to a no-store 404 (client falls back to next candidate)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response('nope', { status: 404, headers: { 'content-type': 'text/plain' } }))
    const res = await routeModule.GET(req('https://a.espncdn.com/i/teamlogos/cricket/500/9999999.png') as never)
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('refuses non-image upstream payloads (no HTML/JS passthrough)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response('<html>hi</html>', { status: 200, headers: { 'content-type': 'text/html', 'content-length': '15' } }))
    const res = await routeModule.GET(req('https://a.espncdn.com/x.png') as never)
    expect(res.status).toBe(404)
  })

  it('refuses oversize upstream payloads', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(pngUpstream(600 * 1024))
    const res = await routeModule.GET(req('https://a.espncdn.com/x.png') as never)
    expect(res.status).toBe(502)
  })

  it('returns 502 when upstream throws (client falls back to next candidate)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    const res = await routeModule.GET(req('https://a.espncdn.com/x.png') as never)
    expect(res.status).toBe(502)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
