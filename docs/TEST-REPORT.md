# CricScore — honest test report (2026-11-26)

**Read this before trusting anything.** This report separates what was actually executed
from what is merely asserted.

## Summary

| Gate | Result | Notes |
| --- | --- | --- |
| `tsc --noEmit` (strict) | ✅ 0 errors | Includes tests; fixed 2 test-only type errors found by it |
| `next build` | ✅ success | 11 routes compiled & prerendered; dynamic match/series routes server-render on demand |
| `vitest run` | ✅ **113/113** across 12 files | All upstream calls mocked; no live network in tests. Extended-field + Sportskeeda contract fixtures are **synthetic**, not live captures |
| ESLint | ⚠️ not configured | No eslint config in repo; `next build` performs type checks only. Type safety comes from strict TS. Flagged in GAPS.md |
| Playwright/browser e2e | ⚠️ not run | Playwright not installed; no browsers in sandbox. UI verified via curl HTML assertions only — see below |
| **Live API from build sandbox** | ❌ unreachable | `curl https://cricketapi-beryl.vercel.app/health` → exit 35; site proxy → **HTTP 502** "could not be reached" |
| Visible-tab polling, backoff, stale retention | ✅ unit-tested | `tests/polling.test.ts` |
| Proxy allowlist / caps / timeouts / traversal | ✅ unit-tested | `tests/proxy-route.test.ts`, `tests/allowlist.test.ts` |
| Normalizers (zeros, 1970-guard, coverage) | ✅ unit-tested | `tests/normalize.test.ts` |
| TanStack Query dedupe/last-good | ✅ unit-tested | `tests/query-dedupe.test.ts` |
| Favorites storage (corrupt JSON, caps) | ✅ unit-tested | `tests/storage.test.ts` |
| Sample mode contract + offline wiring | ✅ unit-tested | `tests/sample-mode.test.ts`, `tests/client-sample-mode.test.ts` |
| Extended scorecard contract (extras/FOW/partnerships) | ✅ unit-tested | `tests/extended-api.test.ts` — **synthetic** fixtures; backend unreleased |
| Standings season-object / displayStats / group season | ✅ unit-tested | `tests/extended-api.test.ts` |
| Sportskeeda allowlist / slug registry / normalizer | ✅ unit-tested | `tests/sportskeeda.test.ts` — synthetic; route unreleased |
| Innings sections UI (zeros, unavailable vs explicit empty, re-fetch identity) | ✅ component-tested | `tests/views.test.tsx` (jsdom + Testing Library) |
| Standings UI (season label, verbatim displayStats, empty-table state) | ✅ component-tested | `tests/views.test.tsx` |
| Image failure fallback (single onError → initials badge) | ✅ component-tested | `tests/views.test.tsx` |
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
   ever observed from this sandbox (TLS/connect failure; through-proxy 502 — re-confirmed for
   `/espn/standings/20921` during this pass). Every claim about the live API contract here is
   taken from the project spec, except the capabilities that WERE observed via the fetch tool:
   the upstream **does not** send `extras`/`fallOfWickets`/`partnerships` yet, standings `season`
   IS an object upstream today, and the sportskeeda route IS absent. The extended-field code is
   exercised only by **synthetic** fixtures and must be re-verified live after the backend ships.
2. **Browser interaction (click-level).** jsdom component tests cover rendering and error-fallback
   behavior, but there is no real-browser automation (Playwright absent). Viewport behavior at
   360 px has not been click-tested — see preview for a manual pass.
3. **Field-level visual correctness** of TeamIdentity images (feed URLs) — no live feed was
   available to confirm `<img>` rendering success paths; onError → initials fallback is tested.
4. **Performance/load** — no profiling; first-load JS ≈ 140 kB is the build report's number.
5. **Accessibility audit** — manual coding to WCAG-minded patterns (semantic tables, labels,
   focus-visible); no axe/Lighthouse run in sandbox.
6. **Playwright** — absent. The spec asks for browser e2e where feasible; this sandbox cannot
   run it; jsdom component tests were added instead (`tests/views.test.tsx`).

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

---

# Round 3 addendum — 2026-11-26 (extended-scorecard release + team logos)

Supersedes the stale "backend unreleased" rows above; those were true at build time and are kept
for history.

**Live-verified against production (via the agent fetch tool, ~14:26Z):**
`/espn/match/1546783/scorecard?league=8661&date=20261126` now returns, in both innings,
`extras` (Mumbai **total 7**: 1 bye, 2 leg byes, 3 wides, 1 no-ball, 0 penalties),
`fallOfWickets` (10 rows per innings, provider order) and `partnerships` (10 rows per innings);
each innings also carries `teamId`. A verbatim subset of that very payload is pinned as a
regression fixture in `tests/extended-api.test.ts`.

**Not verified live:** in-browser pixel rendering of logos/scorecard (no Playwright; jsdom only);
whether every numeric ESPN id in the current feeds has a CDN logo file (misses fall back through
the candidate chain to the monogram by design); Sportskeeda route (still absent — panel ships
"not configured" by design).

Round-3 gates: `tsc --noEmit` **0 errors** · `next build` **13/13 routes** (incl. the new
`ƒ /api/team-logo/espn/[id]`) · vitest **126/126** across 13 files — all upstream calls mocked
in unit tests; extended-field claims are **live-verified** via the payload fetch above.

Logo root cause (why ~1–2% showed): standings/favorites/team pages rendered `TeamIdentity` with
no `imageUrl` and an empty client-side registry, so nearly everything fell through to the
monogram; and direct browser loads of `a.espncdn.com` were lost to hotlink/referer blocking
wherever they were attempted. Fix: `/api/team-logo/espn/<id>` same-origin proxy (strict numeric
id, image-only passthrough, 512 KB cap, day-long cache, `no-store` on failure) as the primary
candidate for numeric `espn:<id>` keys, with direct CDN and monogram as progressive fallbacks.
The scorecard query key was bumped (`v2-extended`) to invalidate pre-release cached payloads in
long-open tabs; server and client fetches were already `no-store`, and TanStack Query runs with
`staleTime: 0`.
