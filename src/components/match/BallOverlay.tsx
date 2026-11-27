'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CommentaryView, MatchView } from '@/lib/api/normalize'
import { fetchLatestCommentaryItems } from '@/lib/latest-commentary'
import { classifyBallEvent } from '@/lib/event-glyph'

/** What the scoreboard noticed between two polls, if anything. */
export interface ScoreMoment {
  /** Monotonic stamp so identical consecutive deltas re-fire the burst. */
  id: number
  /** 1 = team 1’s score moved, 2 = team 2’s. */
  side: 1 | 2
  runsDelta: number
  wicketDelta: number
  /** Score text after the change, e.g. "138/4". */
  scoreText: string
  /** Short label shown on the burst chip, e.g. "FOUR", "SIX", "W", "+2". */
  label: string
}

/**
 * The premium "score moment" – opened by tapping the score in the sticky
 * score header. Re-enacts the recorded outcome of the newest ball:
 * bowler runs in, the ball travels the lane, the result lands.
 *
 * Honesty contract: the scene re-enacts the event class of the recorded
 * delivery (or, when commentary is unavailable, of the score change seen
 * between polls). It does not replay the real trajectory and invents no
 * shot telemetry.
 *
 * Accessibility: role=dialog aria-modal, Esc and backdrop close, focus
 * moves to the close button on open and restores on close, body scroll
 * locked while open. Reduced motion renders the final frame statically.
 */
export function BallOverlay({ match, fallback, onClose }: { match: MatchView; fallback: ScoreMoment | null; onClose: () => void }) {
  const [take, setTake] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previous = document.activeElement as HTMLElement | null
    document.getElementById('ball-overlay-close')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [onClose])

  // The recorded newest ball is fetched on demand – only while the overlay
  // is open – so the resting page never polls commentary for the scorehead.
  const query = useQuery({
    queryKey: ['latest-ball', match.key],
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }): Promise<CommentaryView | null> => {
      const NOTE_RE = /milestone|fifty|hundred|century/i
      const list = await fetchLatestCommentaryItems(match, signal)
      for (let i = list.length - 1; i >= 0; i--) {
        const raw = list[i]!.eventRaw || list[i]!.event
        if (!NOTE_RE.test(raw)) return list[i]!
      }
      return list[list.length - 1] ?? null
    },
  })

  const ball = query.data ?? null
  const loading = query.isPending

  const glyph = useMemo(() => {
    if (ball) {
      return classifyBallEvent({ event: ball.eventRaw || ball.event, runs: ball.runs, wicket: ball.wicket })
    }
    if (fallback) {
      return classifyBallEvent({ event: fallback.wicketDelta > 0 ? 'wicket' : '', runs: fallback.wicketDelta > 0 && fallback.runsDelta === 0 ? 0 : fallback.runsDelta, wicket: fallback.wicketDelta > 0 })
    }
    return classifyBallEvent({ event: '', runs: null, wicket: false })
  }, [ball, fallback])

  const isChase = glyph.kind === 'single' || glyph.kind === 'two' || glyph.kind === 'three'

  const badge =
    glyph.kind === 'wicket'
      ? 'bg-red-500 text-white ring-red-400/60'
      : glyph.kind === 'six'
        ? 'bg-violet-500 text-white ring-violet-400/60'
        : glyph.kind === 'four'
          ? 'bg-emerald-500 text-pine-950 ring-emerald-300/60'
          : isChase
            ? 'bg-brass-light text-pine-950 ring-brass/60'
            : 'bg-[#1d3a2a] text-[#cfe3d4] ring-white/10'

  const batsman = ball?.batsman ?? null
  const bowler = ball?.bowler ?? null
  const cumulative = ball?.cumulativeScore ?? fallback?.scoreText ?? null
  const aria = ball
    ? `${ball.overLabel ? `Ball ${ball.overLabel}. ` : ''}${batsman ?? 'Batter'} ${glyph.phrase}${bowler ? ` off ${bowler}` : ''}${cumulative ? `, score ${cumulative}` : ''}`
    : fallback
      ? `Latest score update: ${glyph.phrase}${cumulative ? `, now ${cumulative}` : ''}`
      : 'Latest ball'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      {/* Backdrop */}
      <button type="button" aria-label="Close replay" onClick={onClose} className="overlay-fade absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]" />

      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-label={`Replay: ${aria}`} className="panel-rise relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl border border-brass/25 bg-[#0d241a] text-[#f5f0e4] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-brass-light">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brass-light" />
            The moment
          </span>
          {ball?.overLabel ? <span className="tabular rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-[#cfe3d4]">{ball.overLabel}</span> : null}
          <button
            id="ball-overlay-close"
            type="button"
            onClick={onClose}
            aria-label="Close replay"
            className="ml-auto rounded-full border border-white/15 p-1.5 text-[#cfe3d4] transition-colors hover:border-brass-light/60 hover:text-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Scene – remounts on Replay so the motion re-runs */}
        <div className="relative" key={take}>
          <svg viewBox="0 0 340 128" className="block h-auto w-full" role="img" aria-label={aria}>
            <rect width="340" height="128" fill="#0e2a1f" />
            <defs>
              <radialGradient id="outfieldGlow2" cx="50%" cy="44%" r="78%">
                <stop offset="0%" stopColor="#1d4a31" />
                <stop offset="100%" stopColor="#0e2a1f" />
              </radialGradient>
              <linearGradient id="pitchGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8a6a35" />
                <stop offset="50%" stopColor="#a5834b" />
                <stop offset="100%" stopColor="#8a6a35" />
              </linearGradient>
            </defs>
            <rect width="340" height="128" fill="url(#outfieldGlow2)" opacity="0.6" />

            {/* Boundary rope */}
            <rect x="322" y="10" width="13" height="108" rx="3" fill="none" stroke="#e2b659" strokeWidth="2.2" strokeDasharray="6 5" opacity="0.85" />

            {/* Pitch */}
            <rect x="24" y="44" width="252" height="40" rx="3" fill="url(#pitchGrad2)" opacity="0.95" />
            <line x1="58" y1="44" x2="58" y2="84" stroke="#fffdf6" strokeWidth="1.6" opacity="0.9" />
            <line x1="242" y1="44" x2="242" y2="84" stroke="#fffdf6" strokeWidth="1.6" opacity="0.9" />

            {/* Bowler runs in */}
            <g className="bowler-run">
              <circle cx="17" cy="64" r="8" fill="#e8e4d4" stroke="#0c261b" strokeWidth="1.4" />
              <rect x="12.6" y="72" width="8.8" height="9.5" rx="2.2" fill="#e8e4d4" opacity="0.85" />
            </g>

            {/* Stumps + bails */}
            <g className={glyph.kind === 'wicket' ? 'stump-flash' : undefined} stroke="#8a5a1e" strokeWidth="2.6" strokeLinecap="round">
              <line x1="288" y1="52" x2="288" y2="76" />
              <line x1="294.5" y1="52" x2="294.5" y2="76" />
              <line x1="301" y1="52" x2="301" y2="76" />
            </g>
            {glyph.kind === 'wicket' ? (
              <>
                <rect className="bail-left" x="286.8" y="47" width="4.2" height="2.8" rx="1" fill="#c9b06a" />
                <rect className="bail-right" x="297.8" y="47" width="4.2" height="2.8" rx="1" fill="#c9b06a" />
              </>
            ) : (
              <>
                <rect x="286.8" y="47" width="4.2" height="2.8" rx="1" fill="#c9b06a" />
                <rect x="297.8" y="47" width="4.2" height="2.8" rx="1" fill="#c9b06a" />
              </>
            )}

            {/* Batsman */}
            <g>
              <circle cx="254" cy="56" r="6.6" fill="#f5f0e4" stroke="#0c261b" strokeWidth="1.4" />
              <rect x="250.3" y="62.5" width="7.6" height="12.5" rx="2.4" fill="#f5f0e4" opacity="0.92" />
              <g className={glyph.kind === 'dot' || glyph.kind === 'extra' ? undefined : 'bat-swing'}>
                <rect x="256.2" y="54" width="3.5" height="25" rx="1.6" fill="#c9b06a" transform="rotate(28 257 66)" />
              </g>
            </g>

            {/* Fielder convergence + runner steps for 1-3 */}
            {isChase ? (
              <circle className="fielder-close" style={{ '--close-x': '-32px', '--close-y': '-18px' } as CSSProperties} cx="320" cy="104" r="5.6" fill="#d8cfb6" opacity="0.95" />
            ) : null}
            {isChase ? (
              <g fill="#e2b659" opacity="0.9">
                <circle className="runner-step" cx="210" cy="97" r="2.2" />
                <circle className="runner-step" cx="146" cy="97" r="2.2" style={{ animationDelay: '0.35s' }} />
                {glyph.kind === 'three' ? <circle className="runner-step" cx="86" cy="97" r="2.2" style={{ animationDelay: '0.7s' }} /> : null}
              </g>
            ) : null}

            {/* Ball: bowler to bat */}
            <g className="ball-flight">
              <circle cx="42" cy="61" r="4.4" fill="#c2410c" stroke="#7c2d12" strokeWidth="1.1" />
              <path d="M40.3 59.2a3.3 3.3 0 0 1 3.4 0" stroke="#f5f0e4" strokeWidth="0.55" fill="none" opacity="0.9" />
            </g>
            {glyph.kind === 'four' ? (
              <circle className="deflect-boundary" cx="248" cy="54" r="4.1" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
            ) : null}
            {glyph.kind === 'six' ? (
              <circle className="deflect-six" cx="248" cy="54" r="4.5" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
            ) : null}
          </svg>

          {/* Outcome badge */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={`tabular result-pop flex h-16 w-16 items-center justify-center rounded-2xl font-display text-[28px] font-black ring-4 sm:h-[72px] sm:w-[72px] ${badge}`}>
              {loading ? <span className="h-5 w-5 animate-pulse rounded-full bg-white/40" /> : glyph.label}
            </div>
          </div>
        </div>

        {/* Record line + actions */}
        <div className="px-4 pb-4 pt-2.5">
          {loading ? (
            <p className="text-[12px] text-[#b7cbbd]">Fetching the recorded delivery…</p>
          ) : ball ? (
            <>
              <p className="font-display text-base font-semibold leading-snug text-[#f5f0e4]">
                <span>{batsman ?? 'Batter'}</span>
                <span className="text-[#8aa392]"> off </span>
                <span>{bowler ?? 'Bowler'}</span>
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-[#b7cbbd]">
                {cumulative ? <span className="tabular mr-1.5 font-bold text-brass-light">{cumulative}</span> : null}
                {typeof ball.runs === 'number' ? <span className="mr-1.5">{ball.runs} run{ball.runs === 1 ? '' : 's'}</span> : null}
                {ball.wicket ? <span className="font-bold text-red-300">wicket falls</span> : null}
              </p>
            </>
          ) : fallback ? (
            <p className="text-[12px] leading-5 text-[#b7cbbd]">
              Derived from the score between refreshes: <span className="tabular font-bold text-brass-light">{fallback.label}</span>
              {cumulative ? <span className="tabular ml-1.5">{cumulative}</span> : null}
            </p>
          ) : (
            <p className="text-[12px] leading-5 text-[#b7cbbd]">The newest delivery is not recorded here yet; no replay is possible.</p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[9px] italic leading-4 text-[#718f7d]">Re-enactment of the recorded outcome, not the real trajectory.</p>
            <button
              type="button"
              onClick={() => setTake((t) => t + 1)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brass/40 bg-brass/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-brass-light transition-colors hover:border-brass-light hover:text-[#f5d98a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
              Replay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
