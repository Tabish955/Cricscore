import type { Metadata } from 'next'
import { MatchCenter } from '@/components/match/MatchCenter'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ provider: string; id: string }> }): Promise<Metadata> {
  const { provider, id } = await params
  return { title: `Match · ${provider.toUpperCase()} ${id}` }
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { provider, id } = await params
  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const league = first(sp.league)
  const date = first(sp.date)
  const tab = first(sp.tab)
  // Provider is route-scoped; distrust anything else.
  const safeProvider = provider === 'espn' || provider === 'crex' || provider === 'cb' ? provider : 'cb'
  return <MatchCenter provider={safeProvider} matchId={id} league={league ?? null} date={date ?? null} tab={tab ?? 'overview'} />
}
