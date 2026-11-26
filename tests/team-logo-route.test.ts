import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The team-logo proxy serves numeric-ESPN-id logos from our own origin so
 * browsers never depend on espncdn hotlink behaviour. These tests stub the
 * GLOBAL fetch (what the route does upstream) and assert the route's own
 * behavior: strict id validation, image-only passthrough, byte cap, and
 * cache headers.
 */

const routeModule = await import('@/app/api/team-logo/espn/[id]/route')

function req(id: string): Request {
  return new Request(`http://localhost/api/team-logo/espn/${id}`, { method: 'GET' })
}
const params = (id: string) => ({ params: Promise.resolve({ id }) })

function pngUpstream(bytes = 2000): Response {
  return new Response(new Uint8Array(bytes).fill(7), { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(bytes) } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('team-logo proxy route', () => {
  it('serves the upstream image with day-long caching for valid numeric ids', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(pngUpstream())
    const res = await routeModule.GET(req('1559') as never, params('1559'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toContain('max-age=86400')
    const [upstreamUrl, init] = mockFetch.mock.calls[0]!
    expect(String(upstreamUrl)).toBe('https://a.espncdn.com/i/teamlogos/cricket/500/1559.png')
    expect((init as RequestInit).redirect).toBe('error')
  })

  it('serves single-digit national team ids (India = 6)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(pngUpstream())
    const res = await routeModule.GET(req('6') as never, params('6'))
    expect(res.status).toBe(200)
    expect(String(mockFetch.mock.calls[0]![0])).toBe('https://a.espncdn.com/i/teamlogos/cricket/500/6.png')
  })

  it('rejects non-numeric and malformed ids without ever calling upstream', async () => {
    const mockFetch = vi.mocked(fetch)
    for (const bad of ['', 'abc', '6/evil', '6.png', "1' OR '1'='1", '12345678']) {
      const res = await routeModule.GET(req(bad) as never, params(bad))
      expect(res.status).toBe(404)
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('maps upstream 404 to a no-store 404 (client falls back to next candidate)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response('nope', { status: 404, headers: { 'content-type': 'text/plain' } }))
    const res = await routeModule.GET(req('9999999') as never, params('9999999'))
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('refuses non-image upstream payloads (no HTML/JS passthrough)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response('<html>hi</html>', { status: 200, headers: { 'content-type': 'text/html', 'content-length': '15' } }))
    const res = await routeModule.GET(req('1559') as never, params('1559'))
    expect(res.status).toBe(404)
  })

  it('refuses oversize upstream payloads', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(pngUpstream(600 * 1024))
    const res = await routeModule.GET(req('1559') as never, params('1559'))
    expect(res.status).toBe(502)
  })

  it('returns 502 when upstream throws (client falls back to direct CDN)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    const res = await routeModule.GET(req('1559') as never, params('1559'))
    expect(res.status).toBe(502)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
