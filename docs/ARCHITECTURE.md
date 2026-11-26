# CricScore — architecture notes

## Principles

1. **The browser never touches the upstream.** Everything flows through one same-origin proxy.
2. **Trust nothing until it parses.** zod schemas validate structure; normalizers coerce,
   drop or null — never fabricate. `success !== true` throws a labelled error; empty arrays
   are valid empty results; `0` is real data.
3. **Provider identity is preserved end-to-end** (`espn:`, `cb:`, `crex:`), in caches, routes,
   favorites and the team-asset registry. Never route ESPN IDs into `/cb/*`.
4. **Visible honesty:** stale badge, coverage level, provider badge, provenance (`upstream`,
   `fetchedAt`) surfaced in the UI instead of hidden.

## Request path

```
fetch('/api/cricket/<rest>?<query>')
  └─ src/app/api/cricket/[...path]/route.ts   (GET only; 405 otherwise)
       ├─ validates path+query against the allowlist (src/lib/api/allowlist.ts)
       │    · fixed upstream host from CRICKET_API_BASE (default cricketapi-beryl.vercel.app)
       │    · exact path patterns: /health, /sources/status, /cb/{live,recent,upcoming,search},
       │      /espn/match/:id(+/scorecard|/squads|/commentary|/squads)?league[&date],
       │      /espn/series/:league/matches?date=YYYYMMDD, /espn/standings/:league
       │    · numeric guards on league/date/matchId; unknown keys rejected; &date required for
       │      dated ESPN detail routes; traversal (`..`, `%2e`), `;`, redirects → 403
       ├─ upstream fetch with 45s AbortController timeout → 504 on expiry
       ├─ redirect: 'error' (no silent redirect chasing), response size cap 3 MB → 502
       ├─ content-type sanity: non-JSON/upstream HTML → 502, never forwarded as JSON
       └─ Cache-Control: no-store; request method echoed nowhere; body passthrough untouched
```

Known-failing upstream routes (`/cb/match/:id*`, `/cb/player/*`, `/cb/series/*`,
`/cricinfo/match/*`, date-filtered Cricinfo lists) are **not allowlisted at all**.

## Browser data layer

```
src/lib/api/client.ts    fetch* functions → same-origin proxy only (toProxyUrl for API-supplied links,
                         re-validated against the allowlist), Fetched<T> = { data, fetchedAtMs }
src/lib/api/normalize.ts raw → view models (MatchView, ScorecardView, CommentaryPageView, …)
                         · provider derived from returned link/source, never bare IDs
                         · parseEpochMs: number|epoch string → ms, else null (no 1970)
                         · comments keep cumulative score as TEXT; overs as given; OversLike
                         · coverageLevel: full ⇔ tables present; empty-but-complete innings stay 'partial'
src/lib/api/schema.ts    zod contracts (lenient scalars, strict structure, .passthrough())
```

TanStack Query (`src/components/QueryProvider.tsx`) keys every query by provider-scoped id.
Default retry: 404 fails after ≤1 attempt; 429/5xx/network retry ≤3 with
`retryDelayMs` (15s → 30s → 60s, ±20% jitter — unit-tested). `keepPreviousData`-style
last-good retention is achieved by rendering `data ?? lastData` and flagging staleness.

## Polling (visible-tab, route-aware)

| Surface | Interval |
| --- | --- |
| Live list (`/`, Live tab) | 15s |
| Recent / Upcoming lists | 60s / 120s |
| Live match detail & scorecard | 10s |
| Live commentary (+ pageCount) | 20s |
| Squads / standings | 300s (5 min, on entry) |
| Completed matches | no polling — manual `Refresh now` |
| Hidden tab / offline | paused; refreshes on visibility return |

Intervals respect the upstream cache TTLs plus headroom (it has its own caches; we never claim
instant sync). Implemented via `useQuery({ refetchInterval })` + `useOnlineStatus()`
(`src/lib/hooks.ts`) and the constants in `src/lib/polling.ts`.

## Sample mode (presentation fallback)

`src/lib/sample/mode.ts` holds the opt-in flag (`localStorage cricscore:sample-mode:v1`);
`src/lib/sample/data.ts` holds a recorded FICTIONAL dataset (invented teams/players, league
`9001`, match IDs `900000000x`). `client.ts` checks `isSampleMode()` at the top of every fetch
and routes through the same normalizers — so Sample Mode can never drift from the real contract
(it is tested against it: `tests/sample-mode.test.ts`, plus `tests/client-sample-mode.test.ts`
simulating a fully-offline network). Unsupported entities (e.g. scorecard for a match with no
recording) throw a labelled "Sample mode has no recorded scorecard" error instead of inventing.
The banner (`SampleModeBanner`) appears on every page while the flag is set; demo toggles live
on `/demo` and `/about`. Sample mode is **never** enabled by default.

## TeamIdentity

`src/components/TeamIdentity.tsx` resolves, in order: feed `team.imageUrl` (plain `<img>`, a.espncdn.com
not proxied/allowlisted; `referrerPolicy="no-referrer"`) → provider+teamId local registry
(`src/lib/teamAssets.ts`, populated only from verified feed metadata) → monogram badge labelled
"fallback badge — not an official crest". Flag images are never mapped onto domestic/franchise
teams. Status never conveyed by colour alone (badges carry text + icon).

## Storage keys

| Key | Contents |
| --- | --- |
| `cricscore:favorites:v1` | `{ matches[], teams[] }`, provider-scoped keys, cap 50/100 |
| `cricscore:team-assets:v1` | `{ "provider:teamId": imageUrl }` HTTPS-only entries |
| `cricscore:sample-mode:v1` | `'1'` when sample mode is explicitly on |

All reads go through guarded helpers (`src/lib/storage.ts`); corrupt JSON degrades to empty.
Never returns a shared mutable EMPTY object (that bug was caught by tests and fixed with a factory).

## Why no news, no websockets, no server DB

- **No news** — explicit product requirement; there is no headlines surface anywhere.
- **No WebSocket/SSE** — upstream is polling-only; we poll with backoff instead of pretending push.
- **No DB** — everything is client-cache + localStorage; a school project needs no accounts or infra.

## Verification status

See [TEST-REPORT.md](./TEST-REPORT.md). Headline: typecheck clean, production build green,
73/73 vitest tests pass (mocked upstream), live upstream unreachable from the build sandbox
(HTTP 000 / proxy 502) — live-path correctness is contract-tested via recorded fixtures, not
against the real API.
