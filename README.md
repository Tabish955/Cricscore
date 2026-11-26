# Cricline — cricket scores, clearly

> **School project · Educational presentation only · Commercial use prohibited.**
> Cricket data and team marks belong to their respective owners.

Cricline is a complete, working cricket-scores website built for a **school presentation**.
It delivers the core experience fans expect — live centre, match centre with ball-by-ball
commentary, scorecards, squads, series scoreboards, standings, search and favorites — while
being honest about where the data comes from, how fresh it is, and what it can never do
(no news, no betting, no payments, no ads, no tracking, no invented records or logos).

**Original brand.** No third-party trademarks, crests or artwork are bundled. Team images appear
when the feed supplies them, or are served from our own same-origin `/api/team-logo/espn/<id>`
proxy over ESPN's public team-logo CDN for numeric ESPN ids (a missing logo falls back to the
labelled monogram — never a wrong crest). Nothing is scraped, bypassed, or impersonated.

## Quick start

```bash
npm install
npm run dev        # http://0.0.0.0:3000 (binds all interfaces for classroom/projector use)
```

Production:

```bash
npm run build
npm run start      # http://0.0.0.0:3000
```

Quality gates (all must be green before class):

```bash
npm run typecheck  # tsc --noEmit — strict, zero errors
npm run test       # vitest run
npm run build      # next build — lints types, compiles, prerenders
```

## Configuration

No secrets or API keys are required. One optional environment variable:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CRICKET_API_BASE` | `https://cricketapi-beryl.vercel.app` | Upstream base URL for the same-origin proxy. Override only if you host a compatible backend. |

Copy `.env.example` to `.env.local` to set it. **Do not commit real overrides.**

## How it works (two-minute version)

```
Browser ──► /api/cricket/* (same-origin proxy, allowlist, GET only, no-store)
           ──► https://cricketapi-beryl.vercel.app (no key, no /api prefix)
                ├── /health, /sources/status   (diagnostics)
                ├── /cb/live|recent|upcoming|search   (lists; Cricbuzz → ESPN/CREX chain)
                ├── /espn/match/:id?league&date(+/scorecard|/commentary|/squads)
                ├── /espn/series/:league/matches?date=YYYYMMDD
                ├── /espn/standings/:leagueId
                └── /sportskeeda/series/:slug/points-table   (experimental — NOT released upstream yet; allowlisted, unconfigured)
```

- The browser **never** calls the upstream host. Every request goes through the Next.js proxy,
  which enforces a path+query allowlist (host is fixed), GET only, a 45s upstream timeout,
  a 3 MB response cap, `no-store`, and `redirect: 'error'`.
- Responses are validated (zod), normalized into view models (`src/lib/api/normalize.ts`), and
  cached client-side with TanStack Query. `0` is kept as real data; missing is `null`; junk
  timestamps become `null` (never "Invalid Date" / 1970).
- Live updates use **polling**, not push: visible-tab, route-aware intervals (live list 15s,
  live detail/scorecard 10s, commentary 20s, recent 60s, upcoming 120s, squads/standings 5 min,
  completed = no polling). Hidden tabs and offline mode pause polling; failures back off
  (15s → 30s → 60s, ±20% jitter) and keep the last good data with a stale badge.
- **Provider-scoped keys everywhere** (`espn:1546783` ≠ `cb:1546783`): caches, favorites,
  navigable routes and the local team-asset registry all carry the provider.
- ESPN IDs are never routed into `/cb/match/:id` — those routes return nothing useful, and the
  allowlist refuses them.

## Sample mode (offline presentation fallback)

If the classroom network blocks the API, flip **Sample Mode** on **About → Offline sample mode**
(or `/demo`). It runs the *entire app* from a recorded, clearly-labelled **fictional** dataset
(invented teams/players/scores, league `9001`). It is never on by default, shows a persistent
amber banner on every page while active, and is contract-tested against the real normalizers
(`tests/sample-mode.test.ts`). It never fabricates a green "live" badge.

## Pages

`/` Live Center (tabs live/recent/upcoming, search, format filters, provider badges) ·
`/match/[provider]/[id]` Match Center (persistent score header, Overview/Scorecard/Commentary/Squads/Table tabs) ·
`/series` + `/series/[leagueId]` dated scoreboard (single-day, explicitly **not** an archive) ·
`/teams` + `/teams/[provider]/[id]` (feed-derived only) · `/players/[provider]/[id]` (match-observed stats only) ·
`/standings` (published ranks, verbatim NRR; no invented values) · `/search` (≥350ms debounce, match-derived index) ·
`/favorites` (localStorage, provider-scoped) · `/about` (freshness, coverage matrix, service status) ·
`/demo` (sample-mode toggle + recorded showcase) · custom `404` and error boundary.

## Honest scope

- **No news anywhere.** No articles, headlines or CMS feeds — by requirement.
- **No claims of parity** with Cricbuzz/ESPNcricinfo/CREX, and no claim of instant sync — this is polling.
- Player/team pages show only what the feed exposed in matches. No career records, bios,
  rankings, head-to-head, venue stats or win predictors — the API has no such endpoints.
- CREX matches render as a limited-coverage card with a labelled external link; CREX HTML is
  never parsed as JSON.
- Spec example IDs (match `1546783`, league `8661`, date `20261126`) are historical references,
  never seeded as fixtures.
- **Backend release shipped (verified live 2026-11-26, ~14:26Z):** innings-level `extras`,
  `fallOfWickets` and `partnerships` are present in production scorecards; see `docs/GAPS.md`.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — proxy, allowlist, normalization, polling, caching
- [`docs/COVERAGE-MATRIX.md`](docs/COVERAGE-MATRIX.md) — verified / conditional / unsupported features
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — the 5-minute classroom walkthrough
- [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md) — exactly what was tested, and what was not
- [`docs/GAPS.md`](docs/GAPS.md) — known gaps and limitations
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — Vercel setup, previews, change tracking
- [`CHANGELOG.md`](CHANGELOG.md) — human-readable summary of every change

## Deploy on Vercel (recommended — tracks every change automatically)

Pushed branches get **preview deployments** on Vercel; merges to `main` promote to production.
Full guide: [`docs/DEPLOY.md`](docs/DEPLOY.md). Short version:

1. Production lives at **https://cricline.vercel.app** (renamed from `cricline.vercel.app` on 2026-11-26).
2. vercel.com → **Import** `Tabish955/Cricscore` → framework auto-detects Next.js → Deploy.
   No secrets required; optional env `CRICKET_API_BASE` only if self-hosting a compatible backend.
3. Open a PR into `main` — Vercel posts a preview URL on the PR for every commit; that is the
   change tracker. Merging promotes to production.

Self-host alternative: any Node ≥ 20.12 host running `next start` (non-Vercel hosts ignore the
`maxDuration` export). Bind `-H 0.0.0.0` for LAN/projector access. There are no secrets to
provision; the upstream needs no key. Do not deploy this publicly with commercial intent — it is
a school project and commercial use is prohibited.
