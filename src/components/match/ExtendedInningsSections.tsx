'use client'

/**
 * Extended innings sections included in production scorecards:
 * extras, fall of wickets and partnerships. Everything here renders what the
 * provider sent, or an explicit "not supplied" state – never a reconstructed value.
 * Overs stay cricket notation strings; nothing is decimal-parsed.
 */
import type { ExtrasView, FallOfWicketView, PartnershipView, InningsView } from '@/lib/api/normalize'
import { formatInt, formatRate } from '@/lib/format'

const SUBTITLE = 'text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400'

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!)
}

function NotSupplied({ what }: { what: string }) {
  return (
    <p className="border-t border-edge/70 px-3 py-1.5 text-[10px] italic leading-4 text-slate-400">
      {what}: not included in this match's data.
    </p>
  )
}

/* ---------------------------------------------------------------- extras */

export function ExtrasRow({ extras }: { extras: ExtrasView | null }) {
  if (!extras) return <NotSupplied what="Extras" />
  const part = (label: string, value: number | null) => (
    <span key={label} className="inline-flex items-baseline gap-1 rounded bg-slate-50 px-1.5 py-0.5 ring-1 ring-edge/70">
      <span className="text-[9px] font-bold uppercase text-slate-400">{label}</span>
      <span className="tabular text-[11px] font-semibold text-pine-900">{value ?? '–'}</span>
    </span>
  )
  return (
    <div className="border-t border-edge/70 px-3 py-2" aria-label="Extras">
      <span className={SUBTITLE}>Extras</span>{' '}
      <span className="tabular text-xs font-black text-pine-900" title="Total as published; not recomputed from the breakdown">
        {extras.total ?? '–'}
      </span>
      <span className="mx-1.5 text-slate-300">·</span>
      <span className="inline-flex flex-wrap gap-1 align-middle">
        {part('b', extras.byes)}
        {part('lb', extras.legByes)}
        {part('w', extras.wides)}
        {part('nb', extras.noBalls)}
        {part('pen', extras.penalties)}
      </span>
    </div>
  )
}

/* ------------------------------------------------------- fall of wickets */

export function FallOfWickets({ rows }: { rows: FallOfWicketView[] | null }) {
  if (rows === null) return <NotSupplied what="Fall of wickets" />
  if (rows.length === 0) {
    return <p className="border-t border-edge/70 px-3 py-1.5 text-[10px] italic text-slate-400">No wickets have fallen; the fall-of-wickets list came through empty.</p>
  }
  return (
    <div className="border-t border-edge/70 px-3 py-2">
      <p className={SUBTITLE}>Fall of wickets <span className="font-medium normal-case tracking-normal text-slate-300">· team score at dismissal</span></p>
      <ol className="mt-1 flex flex-wrap gap-1.5">
        {rows.map((f, i) => {
          const key = f.wicketNumber ?? `fow-${i}`
          const wk = f.wicketNumber ?? i + 1
          const dismissal = [f.type, f.batsmanName].filter(Boolean).join(' · ')
          return (
            <li
              key={key}
              title={dismissal ? `${dismissal}` : undefined}
              className="inline-flex items-baseline gap-1.5 rounded-full border border-edge bg-white py-1 pl-2 pr-2.5 text-[10px] leading-4 shadow-sm"
            >
              <span className="font-black text-pine-900">{wk}-{f.runs ?? '–'}</span>
              {f.overs ? <span className="tabular text-slate-500">({f.overs} ov)</span> : null}
              {f.batsmanName ? <span className="max-w-[120px] truncate font-semibold text-slate-700">{f.batsmanName} {f.batsmanRuns !== null ? <span className="tabular font-normal text-slate-500">{f.batsmanRuns}{f.ballsFaced !== null ? ` (${f.ballsFaced})` : ''}</span> : null}</span> : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ------------------------------------------------------------ partnerships */

export function Partnerships({ rows }: { rows: PartnershipView[] | null }) {
  if (rows === null) return <NotSupplied what="Partnerships" />
  if (rows.length === 0) {
    return <p className="border-t border-edge/70 px-3 py-1.5 text-[10px] italic text-slate-400">No partnerships recorded; the list came through empty.</p>
  }
  return (
    <div className="border-t border-edge/70 px-3 py-2">
      <p className={SUBTITLE}>Partnerships</p>
      <ul className="mt-1 flex flex-col gap-1.5">
        {rows.map((pt, i) => {
          const wk = pt.wicketNumber ?? i + 1
          const contributions = pt.batsmen.map((b) => b.runs)
          const maxContribution = contributions.reduce<number>((m, v) => (v !== null && v > m ? v : m), 0)
          return (
            <li key={pt.wicketNumber ?? `pt-${i}`} className="rounded-lg border border-edge/70 bg-slate-50/50 px-2 py-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] leading-4">
                <span className="font-black text-pine-900">{ordinal(Math.max(1, Math.trunc(Number(wk)) || 1))} wkt</span>
                <span className="tabular font-bold text-pine-900">{pt.runs ?? '–'}<span className="font-normal text-slate-500"> runs</span></span>
                {pt.overs ? <span className="tabular text-slate-500">in {pt.overs} ov</span> : null}
                {pt.runRate !== null ? <span className="tabular text-slate-500">RR {formatRate(pt.runRate, 2)}</span> : null}
                {pt.type ? <span className="rounded bg-white px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 ring-1 ring-edge/70" title="Partnership type as published">{pt.type}</span> : null}
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {pt.batsmen.map((b, j) => (
                  <div key={`${b.id ?? b.name}-${j}`} className="flex items-center gap-2 text-[10px] leading-4">
                    <span className="w-32 truncate font-semibold text-slate-700" title={b.name}>{b.name}</span>
                    <span className="tabular w-14 text-right text-slate-600">{b.runs ?? '–'}{b.balls !== null ? <span className="text-slate-400"> ({b.balls})</span> : null}</span>
                    {/* Contribution bar = batter's runs vs the biggest contribution in this partnership.
                        Deliberately NOT scaled to the partnership total (extras belong to no batter). */}
                    <span aria-hidden="true" className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                      <span
                        className="block h-full rounded-full bg-pine-800/70"
                        style={{ width: `${maxContribution > 0 && b.runs !== null ? Math.round((b.runs / maxContribution) * 100) : 0}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-[9px] leading-3 text-slate-400">Batter contributions exclude extras and need not sum to the partnership total. Bars show each batter&apos;s share of the largest contribution in that partnership, not the whole total.</p>
    </div>
  )
}

export type InningsSectionsProps = Pick<InningsView, 'extras' | 'fallOfWickets' | 'partnerships'>

export function ExtendedInningsSections({ innings }: { innings: InningsSectionsProps }) {
  return (
    <>
      <ExtrasRow extras={innings.extras} />
      <FallOfWickets rows={innings.fallOfWickets} />
      <Partnerships rows={innings.partnerships} />
    </>
  )
}
