import type { Metadata } from 'next'
import { PlayerObserved } from '@/components/PlayerObserved'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ provider: string; id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Player ${id}` }
}

/**
 * Player profile with independently loaded career coverage where verified.
 * Match-performance tables below retain their separate match context.
 * Context arrives via query params: matchId, league, date, name.
 */
export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { provider, id } = await params
  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const p = provider === 'espn' || provider === 'crex' || provider === 'cb' ? provider : 'espn'
  return (
    <PlayerObserved
      provider={p}
      playerId={decodeURIComponent(id)}
      name={first(sp.name) ?? ''}
      matchId={first(sp.match) ?? ''}
      league={first(sp.league) ?? ''}
      date={first(sp.date) ?? ''}
    />
  )
}
