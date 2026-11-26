'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { CommentaryView } from '@/lib/api/normalize'
import { classifyBallEvent } from '@/lib/event-glyph'

/**
 * Ball-event re-enactment – a bowler runs in, the ball travels down the
 * lane, and the recorded outcome lands: 0, 1-6, wicket, or an extra.
 *
 * Honesty contract: this re-enacts the *event class* of the recorded
 * delivery. It does not replay the real trajectory, and it invents no
 * data the feed did not publish.
 *
 * Motion: CSS keyframes only (see globals.css); everything stops under
 * prefers-reduced-motion, leaving the final result frame.
 */
export function BallPlayer({ item }: { item: CommentaryView | null }) {
  const [replay, setReplay] = useState(0)
  const newestId = item?.key ?? null

  // Re-run the animation whenever a new ball lands in the commentary feed.
  useEffect(() => {
    if (newestId) setReplay((n) => n + 1)
  }, [newestId])

  const glyph = useMemo(
    () => (item ? classifyBallEvent({ event: item.eventRaw || item.event, runs: item.runs, wicket: item.wicket }) : null),
    [item],
  )

  if (!item || !glyph) return null

  const runs = glyph.runs
  const isChase = glyph.kind === 'single' || glyph.kind === 'two' || glyph.kind === 'three'

  const badge =
    glyph.kind === 'wicket'
      ? 'bg-red-500 text-white ring-red-300'
      : glyph.kind === 'six'
        ? 'bg-violet-500 text-white ring-violet-300'
        : glyph.kind === 'four'
          ? 'bg-emerald-500 text-pine-950 ring-emerald-300'
          : isChase
            ? 'bg-brass-light text-pine-950 ring-brass'
            : 'bg-[#1f3d2c] text-[#cfe3d4] ring-white/15'

  const aria = `${item.overLabel ? `Ball ${item.overLabel}. ` : ''}${item.batsman ?? 'Batter'} ${glyph.phrase}${item.bowler ? ` off ${item.bowler}` : ''}${item.cumulativeScore ? `, score ${item.cumulativeScore}` : ''}`

  return (
    <section
      aria-label={`Re-enactment of the latest ball: ${aria}`}
      className="overflow-hidden rounded-xl border border-pine-700/40 bg-pine-950 shadow-card"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-brass-light">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brass-light" />
          Ball re-enactment
        </span>
        {item.overLabel ? <span className="tabular rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-[#cfe3d4]">{item.overLabel}</span> : null}
        {item.bowler ? <span className="min-w-0 truncate text-[9px] text-[#8aa392]">{item.bowler} to {item.batsman ?? '–'}</span> : null}
        <button
          type="button"
          onClick={() => setReplay((n) => n + 1)}
          className="ml-auto flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#cfe3d4] transition-colors hover:border-brass-light/60 hover:text-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3.2-6.9L3 8" /><path d="M3 3v5h5" /></svg>
          Replay
        </button>
      </div>

      {/* Lane */}
      <div key={`${newestId}-${replay}`} className="relative">
        <svg viewBox="0 0 340 118" className="block h-auto w-full" role="img" aria-label={aria}>
          {/* Outfield backdrop */}
          <rect width="340" height="118" fill="#0e2a1f" />
          <rect x="0" y="0" width="340" height="118" fill="url(#outfieldGlow)" opacity="0.55" />
          <defs>
            <radialGradient id="outfieldGlow" cx="50%" cy="42%" r="75%">
              <stop offset="0%" stopColor="#1d4a31" />
              <stop offset="100%" stopColor="#0e2a1f" />
            </radialGradient>
            <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a6a35" />
              <stop offset="50%" stopColor="#a5834b" />
              <stop offset="100%" stopColor="#8a6a35" />
            </linearGradient>
          </defs>

          {/* Boundary rope */}
          <rect x="322" y="8" width="14" height="102" rx="3" fill="none" stroke="#e2b659" strokeWidth="2.4" strokeDasharray="6 5" opacity="0.85" />

          {/* Pitch */}
          <rect x="26" y="40" width="250" height="38" rx="3" fill="url(#pitchGrad)" opacity="0.95" />
          <line x1="60" y1="40" x2="60" y2="78" stroke="#fffdf6" strokeWidth="1.6" opacity="0.85" />
          <line x1="242" y1="40" x2="242" y2="78" stroke="#fffdf6" strokeWidth="1.6" opacity="0.85" />

          {/* Bowler (runs in from the left) */}
          <g className="bowler-run">
            <circle cx="18" cy="59" r="7.5" fill="#e8e4d4" stroke="#0c261b" strokeWidth="1.4" />
            <rect x="14" y="66" width="8" height="9" rx="2" fill="#e8e4d4" opacity="0.85" />
          </g>

          {/* Stumps */}
          <g className={glyph.kind === 'wicket' ? 'stump-flash' : undefined} stroke="#8a5a1e" strokeWidth="2.4" strokeLinecap="round">
            <line x1="288" y1="48" x2="288" y2="70" />
            <line x1="294" y1="48" x2="294" y2="70" />
            <line x1="300" y1="48" x2="300" y2="70" />
          </g>
          {glyph.kind === 'wicket' ? (
            <>
              <rect className="bail-left" x="286.5" y="43.5" width="4" height="2.6" rx="1" fill="#c9b06a" />
              <rect className="bail-right" x="297.5" y="43.5" width="4" height="2.6" rx="1" fill="#c9b06a" />
            </>
          ) : (
            <>
              <rect x="286.5" y="43.5" width="4" height="2.6" rx="1" fill="#c9b06a" />
              <rect x="297.5" y="43.5" width="4" height="2.6" rx="1" fill="#c9b06a" />
            </>
          )}

          {/* Batsman */}
          <g>
            <circle cx="252" cy="52" r="6.4" fill="#f5f0e4" stroke="#0c261b" strokeWidth="1.4" />
            <rect x="248.4" y="58" width="7.4" height="12" rx="2.4" fill="#f5f0e4" opacity="0.9" />
            {/* bat lifts through the shot */}
            <g className={glyph.kind === 'dot' || glyph.kind === 'extra' ? undefined : 'bat-swing'}>
              <rect x="254" y="50" width="3.4" height="24" rx="1.6" fill="#c9b06a" transform="rotate(28 255 62)" />
            </g>
          </g>

          {/* Fielder converging for 1-3 */}
          {isChase ? (
            <circle className="fielder-close" style={{ '--close-x': '-30px', '--close-y': '-16px' } as CSSProperties} cx="318" cy="96" r="5.4" fill="#d8cfb6" opacity="0.95" />
          ) : null}

          {/* Runner steps between the creases */}
          {isChase ? (
            <g fill="#e2b659" opacity="0.9">
              <circle className="runner-step" cx="206" cy="88" r="2.2" />
              <circle className="runner-step" cx="142" cy="88" r="2.2" style={{ animationDelay: '0.35s' }} />
              {glyph.kind === 'three' ? <circle className="runner-step" cx="80" cy="88" r="2.2" style={{ animationDelay: '0.7s' }} /> : null}
            </g>
          ) : null}

          {/* The ball: bowler to bat */}
          <g className="ball-flight">
            <circle cx="42" cy="57" r="4.2" fill="#c2410c" stroke="#7c2d12" strokeWidth="1.1" />
            <path d="M40.4 55.2a3.2 3.2 0 0 1 3.2 0" stroke="#f5f0e4" strokeWidth="0.55" fill="none" opacity="0.9" />
          </g>
          {/* Deflections after contact */}
          {glyph.kind === 'four' ? (
            <circle className="deflect-boundary" cx="246" cy="50" r="4" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
          ) : null}
          {glyph.kind === 'six' ? (
            <circle className="deflect-six" cx="246" cy="50" r="4.4" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
          ) : null}
        </svg>

        {/* Result badge */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={`tabular result-pop flex h-14 w-14 items-center justify-center rounded-2xl font-display text-[26px] font-black ring-4 sm:h-16 sm:w-16 ${badge}`}>
            {glyph.label}
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 px-3 py-1.5 text-[10px] text-[#9db4a4]">
        {item.cumulativeScore ? <span className="tabular font-bold text-[#f5f0e4]">{item.cumulativeScore}</span> : null}
        {runs !== null ? <span>{runs} run{runs === 1 ? '' : 's'}</span> : null}
        <span className="min-w-0 flex-1" />
        <span className="italic text-[#7f9a88]">Re-enactment of the recorded outcome, not the real trajectory</span>
      </div>
    </section>
  )
}
