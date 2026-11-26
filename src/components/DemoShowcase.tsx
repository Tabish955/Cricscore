'use client'

import { ScorecardView } from '@/components/match/ScorecardView'
import { SquadsPanel } from '@/components/match/SquadsPanel'
import { StandingsTable } from '@/components/StandingsTable'
import type { ScorecardView as Scorecard, SquadsView, StandingsView } from '@/lib/api/normalize'

/**
 * ⚠️ FICTIONAL SAMPLE DATA — not a real match, not real players, not captured
 * from the API. This page exists so a demo works with the network unavailable
 * or no live match scheduled. It is never linked as "Live" and is always bannered.
 * To use REAL recorded data before class: capture genuine responses with curl
 * (see docs/DEMO-WALKTHROUGH.md → "Refresh captures") and paste them here.
 */

const FICTIONAL_SCORECARD: Scorecard = {
  matchId: 'demo-001',
  coverage: 'full (sample)',
  warnings: [],
  coverageLevel: 'full',
  provenance: { upstream: null, fetchedAt: null, cached: null, source: null },
  innings: [
    {
      inningsId: 1,
      team: 'Harbour City CC',
      score: '132/6',
      overs: '16.2',
      declared: false,
      batsmen: [
        { position: 1, id: 'demo-p1', name: 'A. Rafiq', runs: 44, balls: 31, fours: 5, sixes: 1, strikeRate: 141.93, dismissal: 'c D. Menon b S. Whitmore', isBatting: false },
        { position: 2, id: 'demo-p2', name: 'T. Okafor', runs: 58, balls: 39, fours: 6, sixes: 2, strikeRate: 148.71, dismissal: 'lbw b R. Saldanha', isBatting: false },
        { position: 3, id: 'demo-p3', name: 'M. Ferreira', runs: 12, balls: 11, fours: 1, sixes: 0, strikeRate: 109.09, dismissal: 'c L. Brandt b S. Whitmore', isBatting: false },
        { position: 4, id: 'demo-p4', name: 'J. Castillo', runs: 8, balls: 9, fours: 0, sixes: 0, strikeRate: 88.88, dismissal: 'run out (D. Menon)', isBatting: false },
        { position: 5, id: 'demo-p5', name: 'D. Whitcombe', runs: 3, balls: 4, fours: 0, sixes: 0, strikeRate: 75.0, dismissal: 'not out — sample', isBatting: true },
        { position: 6, id: 'demo-p6', name: 'S. Iwu', runs: 2, balls: 3, fours: 0, sixes: 0, strikeRate: 66.66, dismissal: 'not out — sample', isBatting: true },
        { position: 7, id: 'demo-p7', name: 'R. Saldanha (wk)', runs: 0, balls: 1, fours: 0, sixes: 0, strikeRate: 0.0, dismissal: '—', isBatting: false },
      ],
      bowlers: [
        { id: 'demo-b1', name: 'S. Whitmore', overs: '4', maidens: 0, runs: 34, wickets: 2, economy: 8.5, wides: 1, noBalls: 0 },
        { id: 'demo-b2', name: 'R. Saldanha', overs: '3.2', maidens: 0, runs: 29, wickets: 1, economy: 8.7, wides: 2, noBalls: 0 },
        { id: 'demo-b3', name: 'D. Menon', overs: '4', maidens: 0, runs: 27, wickets: 0, economy: 6.75, wides: 0, noBalls: 1 },
        { id: 'demo-b4', name: 'L. Brandt', overs: '3', maidens: 1, runs: 22, wickets: 1, economy: 7.33, wides: 0, noBalls: 0 },
        { id: 'demo-b5', name: 'P. Nakamura', overs: '2', maidens: 0, runs: 20, wickets: 2, economy: 10.0, wides: 1, noBalls: 0 },
      ],
    },
    {
      inningsId: 2,
      team: 'Valley Riders',
      score: '129/9',
      overs: '20',
      declared: false,
      batsmen: [
        { position: 1, id: 'demo-q1', name: 'L. Brandt', runs: 51, balls: 44, fours: 6, sixes: 1, strikeRate: 115.9, dismissal: 'c M. Ferreira b R. Saldanha', isBatting: false },
        { position: 2, id: 'demo-q2', name: 'D. Menon', runs: 22, balls: 18, fours: 2, sixes: 1, strikeRate: 122.22, dismissal: 'b S. Iwu', isBatting: false },
        { position: 3, id: 'demo-q3', name: 'P. Nakamura', runs: 19, balls: 17, fours: 1, sixes: 1, strikeRate: 111.76, dismissal: 'c A. Rafiq b M. Ferreira', isBatting: false },
        { position: 4, id: 'demo-q4', name: 'S. Whitmore', runs: 14, balls: 15, fours: 1, sixes: 0, strikeRate: 93.33, dismissal: 'lbw b R. Saldanha', isBatting: false },
        { position: 5, id: 'demo-q5', name: 'G. Almeida', runs: 9, balls: 12, fours: 1, sixes: 0, strikeRate: 75.0, dismissal: 'st T. Okafor b M. Ferreira', isBatting: false },
        { position: 6, id: 'demo-q6', name: 'C. Nkomo', runs: 6, balls: 9, fours: 0, sixes: 0, strikeRate: 66.66, dismissal: 'run out (A. Rafiq)', isBatting: false },
      ],
      bowlers: [
        { id: 'demo-c1', name: 'M. Ferreira', overs: '4', maidens: 0, runs: 28, wickets: 2, economy: 7.0, wides: 0, noBalls: 0 },
        { id: 'demo-c2', name: 'R. Saldanha', overs: '4', maidens: 0, runs: 31, wickets: 2, economy: 7.75, wides: 1, noBalls: 0 },
        { id: 'demo-c3', name: 'A. Rafiq', overs: '4', maidens: 0, runs: 26, wickets: 1, economy: 6.5, wides: 2, noBalls: 0 },
        { id: 'demo-c4', name: 'S. Iwu', overs: '4', maidens: 0, runs: 24, wickets: 3, economy: 6.0, wides: 0, noBalls: 0 },
        { id: 'demo-c5', name: 'D. Whitcombe', overs: '4', maidens: 0, runs: 20, wickets: 1, economy: 5.0, wides: 1, noBalls: 0 },
      ],
    },
  ],
}

const FICTIONAL_SQUADS: SquadsView = {
  matchId: 'demo-001',
  provenance: { upstream: null, fetchedAt: null, cached: null, source: null },
  teams: [
    {
      teamId: 'demo-har',
      teamName: 'Harbour City CC',
      players: [
        { id: 'demo-p1', name: 'A. Rafiq', role: 'Batter', isCaptain: true, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm off-break' },
        { id: 'demo-p2', name: 'T. Okafor', role: 'Wicket Keeper', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: null },
        { id: 'demo-p3', name: 'M. Ferreira', role: 'All Rounder', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium' },
        { id: 'demo-p4', name: 'J. Castillo', role: 'Batter', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: null },
        { id: 'demo-p5', name: 'D. Whitcombe', role: 'Batter', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: null },
        { id: 'demo-p6', name: 'S. Iwu', role: 'Bowler', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast' },
        { id: 'demo-p7', name: 'R. Saldanha (wk)', role: 'Wicket Keeper', isCaptain: false, isStarter: false, battingStyle: 'Right-hand bat', bowlingStyle: null },
      ],
    },
    {
      teamId: 'demo-val',
      teamName: 'Valley Riders',
      players: [
        { id: 'demo-q1', name: 'L. Brandt', role: 'Batter', isCaptain: true, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast' },
        { id: 'demo-q2', name: 'D. Menon', role: 'All Rounder', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm leg-break' },
        { id: 'demo-q3', name: 'P. Nakamura', role: 'Batter', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: null },
        { id: 'demo-q4', name: 'S. Whitmore', role: 'Bowler', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium' },
        { id: 'demo-q5', name: 'G. Almeida', role: 'Wicket Keeper', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: null },
        { id: 'demo-q6', name: 'C. Nkomo', role: 'Bowler', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm off-break' },
      ],
    },
  ],
}

const FICTIONAL_STANDINGS: StandingsView = {
  leagueId: 'demo-league',
  season: '2026 (fictional)',
  provenance: { upstream: null, fetchedAt: null, cached: null, source: null },
  groups: [
    {
      name: 'Harbour Premier — Group A (sample)',
      entries: [
        { team: { id: 'demo-har', name: 'Harbour City CC', short: 'HAR', imageUrl: null }, known: { rank: 1, matchesPlayed: 6, matchesWon: 5, matchesLost: 1, matchesTied: 0, noresult: 0, matchPoints: 10, netrr: '+1.24' }, extra: {} },
        { team: { id: 'demo-val', name: 'Valley Riders', short: 'VAL', imageUrl: null }, known: { rank: 2, matchesPlayed: 6, matchesWon: 4, matchesLost: 2, matchesTied: 0, noresult: 0, matchPoints: 8, netrr: '+0.61' }, extra: {} },
        { team: { id: 'demo-ply', name: 'Pier Point CCO', short: 'PIER', imageUrl: null }, known: { rank: 3, matchesPlayed: 6, matchesWon: 2, matchesLost: 4, matchesTied: 0, noresult: 0, matchPoints: 4, netrr: '-0.83' }, extra: {} },
        { team: { id: 'demo-dun', name: 'Dune Wanderers', short: 'DUNE', imageUrl: null }, known: { rank: 4, matchesPlayed: 6, matchesWon: 0, matchesLost: 6, matchesTied: 0, noresult: 0, matchPoints: 0, netrr: '-2.02' }, extra: {} },
      ],
    },
  ],
}

export function DemoShowcase() {
  return (
    <div className="flex flex-col gap-4">
      <p role="alert" className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.2em] text-red-800">
        Recorded demo — fictional sample data · not live · not a real match
      </p>
      <div className="rounded-xl border border-edge bg-navy-900 p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-brand/90">Harbour Premier T20 · Fictional · 14 Nov 2026</p>
        <h1 className="mt-1 text-lg font-black tracking-tight sm:text-2xl">Harbour City CC 132/6 <span className="text-navy-100/60">(16.2 ov)</span> beat Valley Riders 129/9 <span className="text-navy-100/60">(20 ov)</span></h1>
        <p className="mt-1 text-[11px] text-emerald-200/90">Harbour City CC won by 4 wickets (sample prose, clearly labelled)</p>
        <p className="mt-1 text-[9px] text-navy-100/60">Everything on this page exists so the demo works offline or without a live fixture. Refresh with genuine captures before presenting — see docs/DEMO-WALKTHROUGH.md.</p>
      </div>

      <section aria-labelledby="demo-scorecard">
        <h2 id="demo-scorecard" className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-navy-900">Scorecard (sample)</h2>
        <ScorecardView view={FICTIONAL_SCORECARD} stale={false} refreshedAt={null} onRefresh={() => {}} isFetching={false} />
      </section>

      <section aria-labelledby="demo-squads">
        <h2 id="demo-squads" className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-navy-900">Squads (sample)</h2>
        <SquadsPanel view={FICTIONAL_SQUADS} />
      </section>

      <section aria-labelledby="demo-table">
        <h2 id="demo-table" className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-navy-900">Standings (sample)</h2>
        <div className="rounded-xl border border-edge bg-card p-3"><StandingsTable view={FICTIONAL_STANDINGS} /></div>
      </section>

      <p className="text-[9px] leading-4 text-slate-400">
        FICTIONAL SAMPLE: Harbour City CC, Valley Riders, Pier Point CCO, Dune Wanderers and every player above are invented for interface
        demonstration. The build environment for this project could not reach the live API (sandbox egress restriction), so this page never
        pretends to be a recording of a real match. To present with genuine data: run the app where the API is reachable, or capture real
        responses ahead of time (docs/DEMO-WALKTHROUGH.md) and paste them in place of the constants above.
      </p>
    </div>
  )
}
