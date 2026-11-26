import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The proxy route is the only way the browser reaches the API. These tests stub
 * the GLOBAL fetch (i.e. what the route does to the upstream host) and assert
 * the route's own behavior: allowlist enforcement, timeouts, size caps, and
 * that no redirects/credentials ever happen.
 */

const routeModule = await import('@/app/api/cricket/[...path]/route')

function makeRequest(url: string): Request {
  return new Request(url, { method: 'GET' })
}

function jsonUpstream(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('same-origin proxy route', () => {
  it('forwards allowlisted paths upstream with no-store and no redirects', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(jsonUpstream({ success: true, result: { matches: [] } }))
    const req = makeRequest('http://localhost/api/cricket/cb/live')
    const res = await routeModule.GET(req as never, { params: Promise.resolve({ path: ['cb', 'live'] }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [upstreamUrl, init] = mockFetch.mock.calls[0]!
    expect(String(upstreamUrl)).toBe('https://cricketapi-beryl.vercel.app/cb/live')
    expect((init as RequestInit).cache).toBe('no-store')
    expect((init as RequestInit).redirect).toBe('error')
    expect((init as RequestInit).method ?? 'GET').toBe('GET')
  })

  it('preserves league/date query strings on ESPN paths', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(jsonUpstream({ success: true, result: { matchId: '1', innings: [] } }))
    const req = makeRequest('http://localhost/api/cricket/espn/match/1546783/scorecard?league=8661&date=20261126')
    await routeModule.GET(req as never, { params: Promise.resolve({ path: ['espn', 'match', '1546783', 'scorecard'] }) })
    expect(String(mockFetch.mock.calls[0]![0])).toBe('https://cricketapi-beryl.vercel.app/espn/match/1546783/scorecard?league=8661&date=20261126')
  })

  it('refuses non-allowlisted paths with 403 and never calls upstream', async () => {
    const mockFetch = vi.mocked(fetch)
    for (const path of [['admin'], ['espn', 'match', '1', '..', '..'], ['cb', 'match', '123'], ['sources', 'status', 'x']]) {
      const res = await routeModule.GET(makeRequest('http://localhost/api/cricket/' + path.join('/')) as never, { params: Promise.resolve({ path }) })
      expect(res.status).toBe(403)
    }
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses disallowed query keys with 403', async () => {
    const mockFetch = vi.mocked(fetch)
    const res = await routeModule.GET(makeRequest('http://localhost/api/cricket/cb/search?q=india&api_key=LEAKED') as never, { params: Promise.resolve({ path: ['cb', 'search'] }) })
    expect(res.status).toBe(403)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('maps upstream timeouts to 504 and upstream garbage to 502', async () => {
    const mockFetch = vi.mocked(fetch)
    const timeoutErr = Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' })
    mockFetch.mockRejectedValueOnce(timeoutErr)
    const res1 = await routeModule.GET(makeRequest('http://localhost/api/cricket/cb/live') as never, { params: Promise.resolve({ path: ['cb', 'live'] }) })
    expect(res1.status).toBe(504)

    mockFetch.mockResolvedValueOnce(new Response('<html>502</html>', { status: 502, headers: { 'content-type': 'text/html' } }))
    const res2 = await routeModule.GET(makeRequest('http://localhost/api/cricket/cb/live') as never, { params: Promise.resolve({ path: ['cb', 'live'] }) })
    expect(res2.status).toBe(502)
    const body = await res2.json()
    expect(body.success).toBe(false)
  })

  it('rejects oversized upstream responses instead of buffering them', async () => {
    const mockFetch = vi.mocked(fetch)
    const huge = 'x'.repeat(1024)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, pad: huge.repeat(4000) }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'content-length': String(4 * 1024 * 1024 + 1) },
      }),
    )
    const res = await routeModule.GET(makeRequest('http://localhost/api/cricket/cb/live') as never, { params: Promise.resolve({ path: ['cb', 'live'] }) })
    expect(res.status).toBe(502)
  })

  it('returns 405 for non-GET verbs', async () => {
    const res = routeModule.POST()
    expect(res.status).toBe(405)
  })
})
