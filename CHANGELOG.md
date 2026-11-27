# Changelog

## 2026-11-27 — Fix: match-centre assets, same-origin asset proxy, squad flags

### Fixed
- **Match detail no longer erases list-supplied assets**: teams merge per-field
  (`id/name/short/imageUrl/flagUrl`) instead of detail-replaces-list wholesale.
- **Badge images no longer depend on CDN hotlink luck**: new same-origin proxy
  `GET /api/team-logo/feed?u=<feed-supplied-url>` fetches the exact asset the feed
  references — any allowlisted public image host (a.espncdn.com, img1/2.hscicdn.com,
  flagcdn.com, i.cricbuzz.com), HTTPS-only, image/*-only, 512 KB cap, no redirects —
  and serves it from our origin. The previous espn-id-template proxy was replaced;
  the recovered hscicdn crests now proxy too.
- Squads tabs show the squads payload's own team `flagUrl`; “XI” copy now marks
  published XIs as line-ups as published, and `role: "Unknown"` renders as
  “Role not supplied”.
## 2026-11-27 — Team identity hardening: teamId join + decorative badges

### Changed
- **Score↔team matching now joins on `scores[].teamId`** (provider-qualified, carried
  through normalization and scorecard innings) — never on array position, never on
  abbreviation alone. Legacy id-less rows fall back to full-name comparison;
  id-bearing rows never name-match the other side. Shared `scoreForTeam` /
  `sideForScore` in `src/lib/score.ts` replace the three drift-prone local copies
  (MatchCard, HeroMatch, MatchCenter) including the score-moment change tracker.
- **Badge imagery is decorative** per spec: `alt=""`, monogram and shield are
  `aria-hidden` (the adjacent visible name is the accessible label). `object-fit:
  contain` everywhere; reserved dimensions unchanged.
- **Innings headings and squad tabs now render the shared TeamBadge** (dead
  `TeamBadge` import in ScorecardView wired up); scorecard innings join to match
  sides by `innings[].teamId`.
- New `tests/score-matching.test.tsx`: reordered innings, MI vs MI Women and
  Pakistan vs Pakistan A disambiguation, id-bearing rows refuse name aliasing,
  abbreviation-only rows refuse to match, WI asset chain termination, a failed-image
  advances one candidate and a new `imageUrl` resets the chain.
## 2026-11-27 — Team badge cascade (phase 1: live match surfaces)

### Added
- **`resolveLocalVisual`** (`src/lib/team-visuals.ts`): pure normalization, trailing
  variant-token stripping (women/U19/A/XI/Shaheens) and a two-tier lookup:
  sanctioned local asset (West Indies → `/flags/west-indies.png`) → franchise shield.
- **Trademark-safe two-tone shields** (`ShieldMark`) for IPL, PSL, BBL, CPL, SA20,
  ILT20, BPL, WPL and The Hundred, keyed by normalized slug with alias dictionary;
  colours are ours, not official marks.
- **`<TeamBadge />`** (`src/components/TeamBadge.tsx`): full cascade — feed crest →
  same-origin proxy (feed crest only) → verified registry → WI local asset → feed
  flag → franchise shield → deterministic hashed monogram (WCAG-picked text).
  Lives alongside `TeamIdentity` while the phased migration rolls on.
- Wired everywhere: Match Center, featured hero, live cards, scorecard, standings,
  team detail, teams + favorites pages. `TeamIdentity` removed.
- Phased rollout note in `docs/UI-UX.md` gap list unchanged; Tier 3 (backend
  enrichment) intentionally skipped: this app has no DB of its own.
## 2026-11-27 — Flags as the left-slot badge

### Changed
- **Feed-verified flags now carry the left badge slot** when no verified crest exists
  (`TeamIdentity` gains `flagUrl`): crest (feed) → same-origin proxy (feed crest only) →
  verified registry → **feed flag** → monogram. The flag renders as a rounded badge,
  flags crop to cover.
- Removed the separate flag element that rendered AFTER the team name (duplicate and
  visually misaligned); every surface (Match Center, hero, live cards) inherits the new
  single-badge behavior. `FlagMark` deleted; SSR tests updated accordingly.

### Notes
- The flag is still strictly feed-supplied; absence stays a monogram.
## 2026-11-27 — Runs bar resets at the innings break

### Fixed
- **New innings, old overs.** `buildOverStrip` grouped deliveries across the innings
  break — after the break started, innings 1's ball chips lingered in the strip. The
  strip now scopes to the newest recorded `inningsId`, and the meta line shows
  `Innings N · K overs recorded`. No other change to the by-over behaviour.
## 2026-11-27 — Flag placement, stale-on-return, ball-strip freshness

### Fixed
- **Flags sat after the team name and clipped.** Flag now renders **before** the name
  (Cricbuzz/Cricinfo placement), `shrink-0`, consistent 15×22 badge in Match Center,
  featured hero and live cards. This was our markup, not the API.
- **Backgrounded tab returned to a stale scoreboard.** Added a global
  `VisibilityRefresh` net in QueryProvider: one refetch of *active* queries when the
  page becomes visible (debounced 10 s; background tabs still never poll). The two
  queries that opted out of focus refetch (runs strip, ball-tap overlay) now follow
  the global focus behaviour instead of pinning stale data.
- **Ball-by-ball strip lagged behind live play.** Same root cause (focus opt-out +
  single page fetch, fixed previously); now also covered by the visibility net.
## 2026-11-27 — Runs bar everywhere (by over), Cricinfo-pattern scoreboard

### Changed
- **Runs bar shows as many recorded overs as possible.** The strip now reads the
  latest ~5 commentary pages (~20 overs, `fetchLatestCommentaryItems(..., 5)`) and renders
  every recorded over horizontally scrollable, oldest → newest, current over emphasised.
  Previously: current over + previous only. Ball-tap replay overlay fetches only 2 pages
  (needs just the last ball).
- **Match Center scoreboard flipped to Cricinfo rows**: crest + flag + name on the left,
  right-aligned tabular score (tap-to-replay unchanged); featured live-match hero matches
  the same pattern.
- New `docs/UI-UX.md`: analysis of Cricbuzz & ESPNcricinfo (screenshots + live fetch),
  gap list with priorities, definition of done, and standing rejections.
## 2026-11-26 — Logos/crests honesty chain, CRR/RRR, ball-by-ball fix

### Fixed
- **Ball-by-ball strip rendered nothing (regression).** The feed publishes `over`
  as a cricket-notation *float* (`41.1` = over 41, ball 1) plus a separate `ball`
  counter. `normalizeCommentary` joined them into `"41.1.1"`, which the strip's
  over-label parser rejected, so every delivery was skipped and the runs bar was
  invisible. Overs now collapse to `floor(over).ball` once (`"41.1"`).
- **Crest requests for known-missing teams.** A null feed `imageUrl` is
  authoritative — the app no longer constructs the CDN URL or hammers the
  same-origin proxy for verified-missing crests. Chain is now: feed-verified URL →
  same-origin proxy of that same asset (only when a feed URL exists) → verified
  registry → monogram. No candidates, no requests, no retries when the feed is null.

### Added
- **CRR / RRR line** (Google-style) on the live scoreboard surfaces (Match Center,
  HeroMatch, live MatchCard). Computed from the score string's embedded context
  (`"141/6 (19.2/20 ov, target 168)"`): CRR always when overs are known; RRR only
  for a chase with an embedded target and innings allowance; omitted once the chase
  is over. Never estimated.
- **FlagMark**: feed-supplied `flagUrl` is now passed through the schema/normalize
  layer and rendered beside team names when present. No feed flag, no flag —
  nothing is inferred or substituted. (The current API returns `flagUrl: null`
  everywhere; flags will appear only if the API starts providing them.)

### Notes
- Backend asset fix (PR #6) remains the source of crest truth: missing crests are
  `imageUrl: null` by design, so those teams intentionally render initials monograms.
## 2026-11-26 — Runs bar: the latest balls of the over, Google-style

### Added
- `OverStrip` in Match Center (live, deep-dive matches only): chips for the recorded
  balls of the current over (dots, runs, 4, 6, W, wides/extras) plus the previous over,
  dimmed — the Google/ESPNcricinfo panel pattern. Derived from the recorded latest
  commentary page (same on-demand fetch as the replay overlay); renders nothing when no
  deliveries are recorded. No fabrication; no new polling surface beyond Match Center.
- Shared `fetchLatestCommentaryItems` (`src/lib/latest-commentary.ts`) for the replay
  overlay and the runs strip; `buildOverStrip` unit-tested (extras share the ball index;
  milestone notes are never chips).

## 2026-11-26 — Score display split for embedded chase context

### Changed
- `src/lib/score.ts` (new, tested): `parseScoreText` is now lenient about the upstream's
  embedded context (`"265/1 (35.1/50 ov, target 318)"` → 265/1) — the previous strict
  pattern silently disabled the score-moment detection for chases. `splitScoreForDisplay`
  splits the headline figure from its embedded context.
- Match Center scoreboard, MatchCard and the hero render the figure big and the embedded
  context (`(35.1/50 ov, target 318)`) as a subordinate run instead of one unreadable
  string. Frontend only; data handling unchanged.

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
