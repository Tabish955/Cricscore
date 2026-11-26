# Changelog

All notable changes to CricScore are tracked here. Commit hashes are the source of truth;
this file summarises them for humans. Format: `Added` / `Changed` / `Fixed` / `Removed`.

## 2026-11-26 — Extended-scorecard release pickup + team-logo delivery

### Added
- `/api/team-logo/espn/<id>` same-origin proxy: strict 1–7-digit numeric validation, image-only
  passthrough (content-type must start with `image/`), 512 KB cap, 8s upstream timeout, redirects
  refused, day-long `Cache-Control` on success, `no-store` on failure. Serves the exact public
  `a.espncdn.com/i/teamlogos/cricket/500/<id>.png` asset the upstream feed references — no access
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

## 2026-11-26 — Initial build for the school presentation

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
- Upstream unreachable from the build sandbox — live-path verified via fixtures only, not live.
- No browser e2e (Playwright absent), no ESLint config; gates are strict tsc + build + vitest.
