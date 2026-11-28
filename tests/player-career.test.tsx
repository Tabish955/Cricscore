// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CareerProfileContent, parseCareerProfile, PlayerCareer } from '@/components/PlayerCareer'
import { PlayerObserved } from '@/components/PlayerObserved'
import { checkUpstreamPath } from '@/lib/api/allowlist'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const payload = () => ({ success: true, result: { player: {
  provider: 'espn', playerId: '300631', name: 'Kusal Perera', personalInfo: { birthDate: '1990-08-17', role: 'Wicketkeeper batter' },
  biography: 'Synthetic test biography. <script>bad()</script>', careerStats: { batting: { title: 'Batting Career Summary', formats: [{ format: 'Test', statistics: { Runs: '0', Average: null } }] }, bowling: null },
  careerSourceUrl: 'https://www.cricbuzz.com/profiles/8116/kusal-perera', careerPlayerId: '8116', careerProvider: 'cricbuzz', careerCoverage: 'Provider totals may lag.',
} } })
it('preserves zero, missing values and escaped attributed biography', () => {
  const { container } = render(<CareerProfileContent profile={parseCareerProfile(payload(), '300631')} />)
  expect(screen.getByText('0')).toBeTruthy(); expect(screen.getByText('—')).toBeTruthy()
  expect(screen.getByText(/Synthetic test biography/).textContent).toContain('<script>')
  expect(container.querySelector('script')).toBeNull()
  expect(screen.getByRole('link', { name: /Source: Cricbuzz/ }).getAttribute('href')).toContain('/8116/')
})
it('rejects mismatched ESPN IDs and namespaces', () => {
  expect(() => parseCareerProfile(payload(), '253802')).toThrow(/identity/)
  const raw = payload(); raw.result.player.provider = 'cb'
  expect(() => parseCareerProfile(raw, '300631')).toThrow()
})
it('drops career data with unsafe or conflicting source URLs', () => {
  for (const url of ['javascript:alert(1)', 'https://evil.test/profiles/8116/kusal-perera', 'https://www.cricbuzz.com/profiles/265/ms-dhoni']) {
    const raw = payload(); raw.result.player.careerSourceUrl = url
    const p = parseCareerProfile(raw, '300631'); expect(p.biography).toBeNull(); expect(p.careerStats.batting).toBeNull()
  }
})
it('allowlists only bounded numeric ESPN profile paths', () => {
  expect(checkUpstreamPath('espn/player/300631', '').ok).toBe(true)
  for (const path of ['espn/player/0', 'espn/player/abc', 'cb/player/300631', 'espn/player/300631/bio']) expect(checkUpstreamPath(path, '').ok).toBe(false)
})
it('loads profile independently when match context is absent and removes obsolete notice', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload()), { status: 200 })); vi.stubGlobal('fetch', fetcher)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const view = render(<QueryClientProvider client={client}><PlayerObserved provider="espn" playerId="300631" name="Kusal Perera" matchId="" league="" date="" /></QueryClientProvider>)
  expect(await screen.findByText('Read biography from Cricbuzz')).toBeTruthy()
  expect(screen.queryByText(/does not currently request biography/)).toBeNull()
  expect(fetcher).toHaveBeenCalledWith('/api/cricket/espn/player/300631', expect.objectContaining({ cache: 'no-store' }))
  expect(fetcher).toHaveBeenCalledTimes(1); view.unmount(); client.clear()
})
it('unsupported providers do not send profile requests', () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  const client = new QueryClient(); const view = render(<QueryClientProvider client={client}><PlayerCareer provider="cb" playerId="300631" /></QueryClientProvider>)
  expect(fetcher).not.toHaveBeenCalled(); view.unmount(); client.clear()
})
