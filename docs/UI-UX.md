# Cricline UI/UX — field analysis & the road to "magnum opus"

Analysis date: 2026-11-27. Sources: user screenshots of Cricbuzz (BAN-A vs PAK-A, 2nd Semi-Final, ACC Rising Stars 2026) and ESPNcricinfo (same fixture, live match page), plus live fetches of www.cricbuzz.com (fetched; readable) and www.espncricinfo.com (404/blocked for this route — noted honestly; analysis of Cricinfo relies on the screenshot).

## What the giants do (observed)

### Cricbuzz (screenshot 1)
- Innings-first scoreboard line: **`BANA 218-8 (49.2)   CRR: 4.42`**, with the batted side named underneath ("Bangladesh A opt to bat"). The rate sits **on the scoreboard itself**, not in a corner.
- Live commentary page doubles as a scorecard: batting/bowling tables with columns `R B 4s 6s SR | R M W ECO`.
- "Key Stats" rail: current Partnership, Last Wicket (with over), Last 10 overs (runs + wickets), Toss.
- Tabs: Info · Live · Scorecard · Squads · Points Table · Overs · Graphs · Highlights · Full Commentary · News.
- Match strip across the top: every live fixture is one click away, pinned under the nav; series grouped by category (International / League / Domestic).
- Context header: series + venue + date/time on one line.

### ESPNcricinfo (screenshot 2)
- Horizontal, scrollable **fixture strip** of live cards at the top: each card shows phase chip (UPCOMING · STUMPS · RESULT), teams with flags, score right-aligned, verdict in accent colour, and "Schedule · Table" footer links.
- Match header pattern we adopted directionally: **flag + team name on the left, big right-aligned score** `(49.2/50 ov) 218/8`, venue in parentheses, status line ("Bangladesh A chose to bat"), "Current RR: 4.41 · Last 5 ov (RR): 33/1 (6.60)".
- Tabs: Live · Scorecard · Commentary · Live Stats · Overs · Playing XI · Table · Photos · Bet.
- "Scoring Breakdown" rail: runs split by **Power Play / Middle Overs / Final Overs**, Sixes, Fours, Runs in Boundaries.
- Batters table with THIS BOWLER and LAST 5 OV columns.

## What this shipped in this pass (2026-11-27)
- Cricinfo-pattern scoreboard rows in Match Center: crest + flag-left, name-center, **score right-aligned**; hero (featured live match) identical.
- CRR/RRR under the scoreboard (computed from the embedded chase context; omitted, never invented).
- Flags: feed-supplied `flagUrl` now renders when present (nothing inferred; API currently sends null for all — backend ask filed).
- "Runs by over" strip: up to the latest ~5 recorded pages (~20 overs), horizontally scrollable, current over emphasised — replacing the current-over-only strip.

## Gap list vs the giants (honest, prioritized)

P0 — data truths that must ship first (backend; see API-agent prompt)
1. `flagUrl` populated for national/national-A fixtures (BAN-A, PAK-A, ZIM-A, IRE-A, IND-A, SL-A…). Our UI already renders it.
2. Crest audit in CI (`imageUrl` non-null ⇒ HTTP 200, `image/*`). Dead ESPN ids stay `null` → monogram; that is the contract, not a bug.
3. Optional but high-value: `lastFiveOvers: { runs, wickets }` on the list item so the headline shows "Last 5 ov: 33/1 (6.60)" like Cricinfo, without scarping commentary client-side.

P1 — close to done, low risk
4. Overview tab "Key Stats" panel derived from recorded scorecard+commentary: current partnership (from balls), last wicket (FOW latest), runs last 5 overs. We own every byte of this data today; it is presentation only. (Phase: next pass.)
5. "Scoring Breakdown" rail on the overview: phase splits (Powerplay/Middle/Death) computed from innings score by over ranges — presentational, no new upstream fields required for 50-over/T20 phase conventions; must be clearly labelled "computed" and omitted for formats with no standard phases (first-class).
6. Match Center header: `current innings` scoring rate chips ("CRR 4.42" chip on the scoreboard row itself, Cricbuzz-style) in addition to the rates line.
7. Fixture strip on home (static horizontal scroll of live matches, NOT a marquee — the ticker stays rejected) linking into each Match Center.

P2 — visual/typographic system
8. Numerics: keep tabular everywhere; standardise the score font scale tokens (hero 5xl, row-score 4xl/3xl, list card xl).
9. Colour: keep pine/brass/paper system; add a single accent for "result verdict" text (currently emerald-200/90) shared with cards.
10. Density: one rhythm scale (4/8/12/16/24) across cards; remove one-off gap values where found.
11. Focus rings already brass; extend to fixture strip chips.
12. Empty/loading states: skeletons shaped like scoreboard rows instead of generic cards — calmer perceived polling.

P3 — what NOT to port (standing rejections)
- No auto-advancing ticker/marquee; no ball-of-the-over animation; no "live blog" auto-scroll; no comments/fantasy/ads chrome.
- No client-invented crests/flags, ever; no substitute URLs; no inference from team names.
- No provenance/debug text in user-facing copy.

## Definition of done for "magnum opus"
The live match page shows, without scrolling: series/venue breadcrumb, badge, both teams with crest+flag, right-aligned tabular score, status verdict, CRR/last-5, per-over runs strip, and the batting/bowling tables when loaded — matching Cricbuzz's/Cricinfo's information density while staying calmer, fully screen-reader labelled, and never fabricating data the API does not publish.
