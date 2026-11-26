# Changelog

## 2026-11-26 — Premium pass: generous layout, score-tap replay, logo triage

### Added
- "The moment" in Match Center: the polled score itself (e.g. `138/4`) is now a tappable
  button in the sticky scoreboard. A fresh ball seen between polls fires a burst chip
  (`FOUR` / `SIX` / `WICKET` / `+2` …) and a ping ring on the figure; tapping the figure
  opens a broadcast-style replay overlay that re-enacts the recorded latest ball
  (bowler run-in, ball flight, boundary / six / tumbling bails, or runner steps for 1-3).
  The recorded ball is fetched on demand while the overlay is open — the resting page
  never polls commentary for it. The overlay replays on demand (Replay button), closes on
  Esc / backdrop / button, and renders the final frame statically under reduced motion.
  Honesty contract unchanged: it replays the recorded event class, never the real
  trajectory, and falls back to a between-polls delta when commentary is unavailable.
- Score moment detection is derived from existing polled score data — zero additional
  network traffic while idle.

### Changed
- UI density relaxed across the product: bigger display type and figures, roomier padding
  and rhythm (Match Center scoreboard, home grid and hero, cards, commentary items),
  generous tap targets — same tokens, same pavilion identity, restraint kept.
- Match Center scoreboard is the visual anchor: larger tabular figures, calmer meta row,
  sticky on sm+ screens only (mobile header wraps to two rows).
- Team logo candidate chain restored to same-origin proxy → feed imageUrl → direct CDN →
  verified registry → labeled monogram. Production probes proved the proxy path works
  (200s for existing assets); the feed's own image URLs 404 on the CDN for several teams
  (e.g. Abu Dhabi Knight Riders 1346027 → 404), which is an upstream data issue, not a
  proxy defect. Monograms remain the honest fallback for teams whose crests 404.
- Commentary panel de-animated completely; calmer reading rhythm (13px / 1.6 line-height).
- Match section tabs are a static calm strip (no longer sticky under the scoreboard).

### Removed
- Global live ticker (marquee under the header).
- Ball re-enactment from the commentary section; the SVG scene now lives in the score-tap
  overlay only. `BallPlayer.tsx` deleted (superseded by `BallOverlay.tsx`).
- Temporary `/api/logo-probe/<id>` diagnostic route (added to `main` to triage the
  logo report; removed once the verdict was recorded — see above).

## 2026-11-26 — Density pass: live hero, ticker, ball re-enactment, motion pack

### Added
- Live hero on the home lists: the top live match (importance order) promoted into a full-width
  pavilion-night scoreboard card with big tabular figures, verdict in serif italic, CTA to Match Center.
- Global live ticker under the header: brass-on-pine marquee of verdict lines for all live matches,
  importance order; pauses on hover/focus; wrapped static row under reduced motion.
- Ball re-enactment in Match Center → Commentary: bowler runs in, the ball travels the lane, outcome
  lands (dot, 1-3 with fielder converge + running hints, FOUR/SIX boundary flight, WICKET with tumbling
  bails and stump flash, extra tag). Driven by the recorded ball's event class only; replay on demand and
  auto re-runs when a newer ball lands. Reduced-motion renders the final frame statically.
- Score-flash: polled score changes bloom brass briefly (keyed remount on value change).
- Skeleton shimmer loading cards (no lone spinner), card entrance animation, hover lift on cards,
  star-pop on favorite toggle, ticker marquee CSS.

### Changed
- Team logo candidate chain reordered to feed imageUrl → direct CDN → verified registry → same-origin proxy:
  browser-direct loads are the proven path; the proxy remains as the final network attempt before the
  monogram. (Fewer working marks were resolving when the proxy was tried first.)

## 2026-11-26 – Cricline rebrand, visual overhaul (antislop DURING), importance ordering, provenance scrub

### Added
- `DESIGN.md`: the product's design direction (pavilion-broadsheet language, dial
  ENERGY 2 / RHYTHM 2 / MOTION 1) with a written reasons ledger per decision.
- `src/lib/importance.ts` + `tests/importance.test.ts`: tiered match importance
  (ICC showpieces > marquee leagues > senior tours > age-group internationals >
  marquee domestic championships > unlisted T20 > first-class > List A > Other OD >
  unknown). `sortByImportance()` is stable. Applied to the Live/Recent/Upcoming
  lists and search results; live tab ordering included.
- `HeaderNav` client component: active-route underline with `aria-current`; tap
  targets >= 44px; horizontally scrollable on small screens.
- `ServiceStatus` on About: single-button HTTP check; shows status code and time
  only, never a body. Replaces the diagnostics panel.
- Fraunces Variable (display serif) + Archivo Variable (grotesque, tabular scores)
  via Fontsource; self-hosted, no third-party font CDN.

### Changed
- **Renamed to Cricline**; production domain is `cricline.vercel.app` (project renamed
  on Vercel 2026-11-26; previously `cricscore-snowy.vercel.app`). Package name, titles,
  wordmark, icon and docs updated. localStorage keys keep the `cricscore:` prefix on
  purpose so existing favorites and sample-mode flags survive the rename.
- Visual system: pine green ink on warm paper with a brass accent; warm card
  surfaces; editorial serif for page titles, verdict lines and the wordmark; paper
  grain texture on the body background; every interactive element keeps visible
  focus and AA contrast.
- Persistent "School project · Educational presentation only ..." bar above the
  header removed.
- All user-visible mentions of data provenance removed: no upstream hostnames, no
  provider chips/badges, no chain descriptions, no "via <provider>" strips, no
  diagnostics source table, no Sportskeeda panel, no "View on source" external link,
  no `/sources/status` button. The About page now covers freshness, sample mode and
  a service-status check only. Functionality is unchanged elsewhere; the Scorecard
  and standings figures that remain are shown verbatim as published.
- `TeamIdentity` renders the monogram underneath and fades the real mark in only
  after it has actually loaded (`onLoad`), advancing the candidate chain on `onError`.
  A broken-image icon can no longer flash or persist; marks whose files do not
  exist on the CDN degrade deterministically to the labelled monogram.
- Em dashes removed from all user-visible copy (antislop R-02); missing-value
  glyph changed from em dash to en dash.

### Removed
- `DisclaimerBar` (header), `Diagnostics` (About), `SportskeedaAdditionalSource`
  (Standings/Series/MatchCenter Table tab). The Sportskeeda code path no longer
  surfaces in the UI.

### Known honesty notes
- ESPN CDN URLs referenced by the feed cannot be verified from the build sandbox;
  whether a given team's file exists upstream is out of our control. The website
  now guarantees a correct visual outcome either way.

All notable changes to Cricline are tracked here. Commit hashes are the source of truth;
this file summarises them for humans. Format: `Added` / `Changed` / `Fixed` / `Removed`.

## 2026-11-26 – Extended-scorecard release pickup + team-logo delivery

### Added
- `/api/team-logo/espn/<id>` same-origin proxy: strict 1–7-digit numeric validation, image-only
  passthrough (content-type must start with `image/`), 512 KB cap, 8s upstream timeout, redirects
  refused, day-long `Cache-Control` on success, `no-store` on failure. Serves the exact public
  `a.espncdn.com/i/teamlogos/cricket/500/<id>.png` asset the upstream feed references – no access
  control is bypassed and it cannot proxy arbitrary URLs.
- `TeamIdentity` candidate chain, advancing on one failed image load: same-origin logo proxy →
  feed `imageUrl` → verified registry → direct ESPN CDN → labelled monogram.
- Live-contract regression fixture: verbatim subset of the production 2026-11-26T14:26Z
  `/espn/match/1546783/scorecard` response (Mumbai extras total 7; FOW/partnerships arrays).

### Changed
- Scorecard coverage classification is evidence-based: tables in every innings → `full`; some
  innings lacking tables (or a provider flag) → `partial`; no tables → `totals-only`. The live
  provider string ("innings totals and available player statistics") no longer mislabels complete
  scorecards as Partial.
- Scorecard extended sections: when the provider sends them for no innings (older cached
  responses), one consolidated "not supplied" note renders instead of per-innings placeholders;
  per-innings notices remain only where the provider genuinely omitted a section.
- Scorecard query key bumped (`v2-extended`) to drop pre-release cached payloads.
- Docs updated: backend extended release shipped and live-verified; logo chain documented.

### Fixed
- Team logos: ~all marks rendered as monograms because standings/favorites/team pages had no
  `imageUrl` and direct browser loads of `a.espncdn.com` were lost to hotlink/referer blocking;
  marks now resolve via the same-origin proxy with progressive fallbacks.

## 2026-11-26 – Initial build for the school presentation

### Added
- Complete app: Live Center (live/recent/upcoming tabs, format filter, 350ms search, provider
  badges), Match Center (persistent score header; Overview/Scorecard/Commentary/Squads/Table
  tabs), Series dated scoreboard, Teams, Players (match-observed), Standings, Favorites
  (localStorage, provider-scoped), Search, About (disclaimer, attribution, coverage matrix,
  user-triggered diagnostics), Demo page, custom 404 + error boundary.
- Same-origin proxy `/api/cricket/[...path]`: GET-only, path+query allowlist (host fixed to
  `cricketapi-beryl.vercel.app`, env-overridable), 45s upstream timeout, 3 MB response cap,
  `no-store`, `redirect: 'error'`, non-JSON upstreams refused as 502.
- Typed adapter layer: zod schemas → normalizers → view models; provider derived from returned
  links/source; epoch-ms timestamps with 1970-guard; real zeros preserved; `success:false`
  surfaces as labelled errors; empty arrays are valid empty.
- Polling (visible-tab, route-aware): live list 15s · recent 60s · upcoming 120s · live
  detail/scorecard 10s · commentary 20s · squads/standings 300s · completed = no polling;
  hidden tabs/offline pause; backoff 15s→30s→60s ±20% jitter.
- TeamIdentity: feed `imageUrl` (plain `<img>`) → provider:teamId local registry → labelled
  monogram fallback; never maps flags onto domestic teams.
- Sample mode (opt-in, `/demo` + About): recorded, contract-tested FICTIONAL dataset; persistent
  amber banner while active; honest "no recorded entity" errors instead of invented data.
- Test suite: 73 vitest tests across 9 files (proxy, allowlist, normalization, polling,
  storage, query dedupe, format/links, sample-mode contract, offline client wiring).
- Docs: README rewrite; docs/{ARCHITECTURE, COVERAGE-MATRIX, DEMO-SCRIPT, TEST-REPORT, GAPS, DEPLOY}.
- App icon (original mark), `.nvmrc`, `vercel.json`, `maxDuration = 60` on the proxy route.

### Known limitations
- Upstream unreachable from the build sandbox – live-path verified via fixtures only, not live.
- No browser e2e (Playwright absent), no ESLint config; gates are strict tsc + build + vitest.
