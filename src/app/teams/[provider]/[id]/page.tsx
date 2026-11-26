import type { Metadata } from 'next'
import { TeamDetail } from '@/components/TeamDetail'

export async function generateMetadata({ params }: { params: Promise<{ provider: string; id: string }> }): Promise<Metadata> {
  const { provider, id } = await params
  return { title: `Team ${id}` }
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { provider, id } = await params
  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const p = provider === 'espn' || provider === 'crex' || provider === 'cb' ? provider : 'cb'
  return <TeamDetail provider={p} id={decodeURIComponent(id)} name={first(sp.name) ?? ''} short={first(sp.short) ?? ''} />
}
