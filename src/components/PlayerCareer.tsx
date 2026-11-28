'use client'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { isSampleMode } from '@/lib/sample/mode'

const text = z.string().nullable().optional()
const table = z.object({ title: z.string(), formats: z.array(z.object({ format: z.string(), statistics: z.record(z.string(), z.string().nullable()) })) }).nullable()
const schema = z.object({ success: z.literal(true), result: z.object({ player: z.object({
  provider: z.literal('espn'), playerId: z.string(), name: z.string(),
  personalInfo: z.object({ birthDate: text, role: text, battingStyle: text, bowlingStyle: text }),
  biography: z.string().nullable(), careerStats: z.object({ batting: table, bowling: table }),
  careerSourceUrl: text, careerPlayerId: text, careerProvider: text, careerCoverage: z.string(),
}) }) })
export function parseCareerProfile(raw: unknown, id: string) {
  const p = schema.parse(raw).result.player
  if (p.playerId !== id) throw new Error('Player identity mismatch')
  let sourceValid = false
  try {
    const u = new URL(p.careerSourceUrl || '')
    sourceValid = u.origin === 'https://www.cricbuzz.com' && /^\/profiles\/\d+\/[a-z0-9-]+$/.test(u.pathname)
      && !u.search && !u.hash && !u.username && !u.password && p.careerProvider === 'cricbuzz' && u.pathname.split('/')[2] === p.careerPlayerId
  } catch { /* Missing source stays unavailable. */ }
  if (!sourceValid) {
    p.careerSourceUrl = null
    p.biography = null
    p.careerStats = { batting: null, bowling: null }
  }
  return p
}
type Profile = ReturnType<typeof parseCareerProfile>
const personalLabels: Record<string, string> = { birthDate: 'Born', role: 'Role', battingStyle: 'Batting style', bowlingStyle: 'Bowling style' }

export function CareerProfileContent({ profile: p }: { profile: Profile }) {
  return <section aria-label="Player profile and career" className="min-w-0 rounded-xl border border-edge bg-card p-4 text-slate-700">
    <h2 className="text-sm font-black text-pine-900">Player profile</h2>
    <p className="mt-1 text-xs font-semibold">{p.name}</p>
    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(p.personalInfo).map(([key, value]) => <div key={key}><dt className="text-slate-500">{personalLabels[key] || key}</dt><dd>{value || 'Not supplied'}</dd></div>)}</dl>
    <p className="mt-2 text-[10px] text-slate-500">Personal details: ESPN.</p>
    <h3 className="mt-4 text-sm font-bold">Biography</h3>
    {p.biography ? <details className="mt-2 text-xs leading-relaxed"><summary className="cursor-pointer font-semibold">Read biography from Cricbuzz</summary><p className="mt-2 whitespace-pre-line">{p.biography}</p></details> : <p className="mt-1 text-xs">Biography unavailable from the verified sources for this player.</p>}
    <h3 className="mt-4 text-sm font-bold">Career statistics</h3>
    <p className="mt-1 text-xs text-slate-500">{p.careerCoverage}</p>
    <p className="mt-1 text-[10px] text-slate-500">Career figures are separate from this match. Provider totals may lag; statistical update date is not supplied. Format labels are preserved. Dashes mean unavailable, not zero.</p>
    <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">{[p.careerStats.batting, p.careerStats.bowling].map((t, i) => t ? <div key={i} className="min-w-0 overflow-x-auto rounded-lg border border-edge"><table className="w-full whitespace-nowrap text-left text-xs"><caption className="p-2 text-left font-bold">{t.title}</caption><thead><tr><th scope="col" className="p-2">Statistic</th>{t.formats.map((f, n) => <th scope="col" className="p-2" key={n}>{f.format}</th>)}</tr></thead><tbody>{[...new Set(t.formats.flatMap(f => Object.keys(f.statistics)))].map(label => <tr className="border-t border-edge" key={label}><th scope="row" className="p-2 font-medium">{label}</th>{t.formats.map((f, n) => <td key={n} className="p-2 tabular-nums">{f.statistics[label] ?? '—'}</td>)}</tr>)}</tbody></table></div> : null)}</div>
    {!p.careerStats.batting && !p.careerStats.bowling ? <p className="mt-2 text-xs">Career totals unavailable; match performance is shown separately below.</p> : null}
    {p.careerSourceUrl ? <a className="mt-3 inline-block text-xs font-semibold underline" href={p.careerSourceUrl} target="_blank" rel="noopener noreferrer">Source: Cricbuzz player profile ↗</a> : null}
  </section>
}

export function PlayerCareer({ provider, playerId }: { provider: string; playerId: string }) {
  const sample = isSampleMode()
  const supported = provider === 'espn' && /^[1-9]\d{0,11}$/.test(playerId)
  const q = useQuery({ queryKey: ['player-profile', provider, playerId], enabled: supported && !sample, staleTime: 3600000, retry: 1,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/cricket/espn/player/${playerId}`, { cache: 'no-store', signal })
      if (!r.ok) throw new Error(`Profile request failed (${r.status})`)
      return parseCareerProfile(await r.json(), playerId)
    } })
  if (sample || !supported) return <p className="text-xs text-slate-500">Player career profiles are not available for this provider or sample mode.</p>
  if (q.isPending) return <p className="text-xs text-slate-500" role="status">Fetching player profile…</p>
  if (!q.data) return <section aria-label="Profile unavailable" className="rounded-xl border border-edge bg-card p-4 text-xs"><p>Player profile temporarily unavailable. Match performance is independent; no career data has been substituted.</p><button className="mt-2 underline" type="button" onClick={() => q.refetch()}>Retry profile</button></section>
  return <CareerProfileContent profile={q.data} />
}
