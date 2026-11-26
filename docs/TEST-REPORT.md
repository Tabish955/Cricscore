# CricScore — honest test report (2026-11-26)

**Read this before trusting anything.** This report separates what was actually executed
from what is merely asserted.

## Summary

| Gate | Result | Notes |
| --- | --- | --- |
| `tsc --noEmit` (strict) | ✅ 0 errors | Includes tests; fixed 2 test-only type errors found by it |
| `next build` | ✅ success | 11 routes compiled & prerendered; dynamic match/series routes server-render on demand |
| `vitest run` | ✅ **73/73** across 9 files | All upstream calls mocked; no live network in tests |
| ESLint | ⚠️ not configured | No eslint config in repo; `next build` performs type checks only. Type safety comes from strict TS. Flagged in GAPS.md |
| Playwright/browser e2e | ⚠️ not run | Playwright not installed; no browsers in sandbox. UI verified via curl HTML assertions only — see below |
| **Live API from build sandbox** | ❌ unreachable | `curl https://cricketapi-beryl.vercel.app/health` → exit 35; site proxy → **HTTP 502** "could not be reached" |
| Visible-tab polling, backoff, stale retention | ✅ unit-tested | `tests/polling.test.ts` |
| Proxy allowlist / caps / timeouts / traversal | ✅ unit-tested | `tests/proxy-route.test.ts`, `tests/allowlist.test.ts` |
| Normalizers (zeros, 1970-guard, coverage) | ✅ unit-tested | `tests/normalize.test.ts` |
| TanStack Query dedupe/last-good | ✅ unit-tested | `tests/query-dedupe.test.ts` |
| Favorites storage (corrupt JSON, caps) | ✅ unit-tested | `tests/storage.test.ts` |
| Sample mode contract + offline wiring | ✅ unit-tested | `tests/sample-mode.test.ts`, `tests/client-sample-mode.test.ts` |
| Match href league/date preservation | ✅ unit-tested | `tests/format.test.ts` |

## What was verified against reality

- **The running site.** `next start` on `0.0.0.0:3000`; every route returns 200 (404 for unknown):
  `/`, `/about`, `/search`, `/teams`, `/series`, `/standings`, `/favorites`, `/demo`,
  `/match/espn/1546783?league=8661&date=20261126&tab=scorecard` (deep-reload works),
  `/match/cb/999`, `/teams/espn/3609?name=Mumbai&short=MUM`, `/series/8661?date=20261126`,
  `/players/espn/demo-p1`, `/icon.svg` (after restart).
- **HTML-level content assertions** via curl+grep: persistent disclaimer on `/` and `/about`,
  Live Center shell renders, demo page carries the FICTIONAL banner, about renders
  attribution & diagnostics section, match page renders Overview/Scorecard/Commentary/Squads
  tab labels and a `Refresh now` control. RSC payloads also contain the header/nav markup.
- **Failure honesty:** with the API unreachable, the proxy returns a clean 502 and the UI
  renders its empty/error states — it never fabricates matches. Sample mode (opt-in) then makes
  the whole app usable offline; that path is unit-tested end-to-end (network fully stubbed to throw).

## What is NOT verified

1. **Live upstream behavior.** No successful response from `cricketapi-beryl.vercel.app` was
   ever observed from this sandbox (TLS/connect failure; through-proxy 502). Every claim about
   the live API contract here is taken from the project spec, and every normalizer path is
   tested against fixtures authored to match that contract — **not** against a live capture.
   The first time the site runs on a network where the API is reachable, some payload quirk
   may surface (see GAPS.md → "Contract drift").
2. **Real-browser interaction.** No browser automation was run. Keyboard tab order, focus rings,
   `prefers-reduced-motion`, h-scroll behavior on 360 px screens, and sticky scorecard headings
   are implemented to spec but only curl-verified for markup presence, not click-tested.
3. **Field-level visual correctness** of TeamIdentity images (feed URLs) — no live feed was
   available to confirm `<img>` rendering success paths.
4. **Performance/load** — no profiling; first-load JS ≈ 140 kB is the build report's number.
5. **Accessibility audit** — manual coding to WCAG-minded patterns (semantic tables, labels,
   focus-visible); no axe/Lighthouse run in sandbox.
6. **Playwright** — absent. The spec asks for browser e2e where feasible; this sandbox cannot
   run it, and the two-day build delta was spent on the real product instead of installing browsers.

## How to re-verify before class (15 minutes, on a network with API access)

1. `npm ci && npm run build && npm run start`
2. Open `/about` → **Source diagnostics** → press both buttons; expect `success` and provider
   list. If it fails, flip **Sample mode** before demoing.
3. `/` → Live tab should show real matches with provider badges and a "via …" provenance line.
4. Open one live match → Scorecard/Commentary tabs — confirm innings render and 0s show as 0.
5. Hard-reload the match URL — league/date survive (already unit-tested, re-confirm live).
6. `/series`, pick today's date, `/standings?league=<id>` if known (empty is a valid outcome).
7. `Ctrl+K`/search "Harbour" only makes sense in Sample Mode; search a real team instead.

## Known-by-design behaviors (not bugs)

- Completed matches never poll (10m+ stale for finished games is expected; use Refresh).
- `/series/[leagueId]` shows **one date only** — labelled "Matches for selected date", never "Archive".
- Bilateral standings are frequently empty → empty table with explanation, by design.
- Sample-mode data is fictional league "9001"; it is contract-validated but is **not a real match**.
