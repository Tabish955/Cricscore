import type { Metadata } from 'next'
import { SeriesDetail } from '@/components/SeriesDetail'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ leagueId: string }> }): Promise<Metadata> {
  const { leagueId } = await params
  return { title: `League ${leagueId} — Series` }
}

export default async function SeriesDetailPage({ params, searchParams }: { params: Promise<{ leagueId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { leagueId } = await params
  const sp = await searchParams
  const safeId = /^\d{1,12}$/.test(leagueId) ? leagueId : ''
  const date = (Array.isArray(sp.date) ? sp.date[0] : sp.date) ?? ''
  return <SeriesDetail leagueId={safeId} initialDate={/^\d{8}$/.test(date) ? date : undefined} />
}
