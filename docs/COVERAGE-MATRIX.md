# CricScore — feature & data coverage matrix

Honest tiers:

- **Verified** — implemented, and tested against the API contract (mocked upstream fixtures;
  the live upstream was unreachable from the build sandbox, see TEST-REPORT.md).
- **Conditional** — implemented and contract-tested, but depends on what the upstream returns
  for a given match/series. Never upgraded silently.
- **Unsupported** — not implemented because the API cannot provide it (or the feature is
  prohibited for this project). Absent by design, not hidden.

## Match discovery & lists

| Feature | Tier | Notes |
| --- | --- | --- |
| Live / recent / upcoming lists | Verified | `/cb/live|recent|upcoming` via proxy; 15/60/120s polling, visible-tab only |
| Empty feed = valid empty state | Verified | Empty match arrays render an empty state, never an error |
| Search (match-derived local index) | Verified | ≥350ms debounce; searches teams/series currently loaded |
| Server search enrichment (`/cb/search`) | Conditional | Reduced response shape; used as optional boost only |
| Date-filtered Cricbuzz lists | Unsupported | Upstream date filter broken for Cricinfo family — not allowlisted |

## Match center

| Feature | Tier | Notes |
| --- | --- | --- |
| Persistent score header + TeamIdentity | Verified | Monogram fallback labelled; provider+teamId scoped registry |
| Overview tab (status, series, venue, POTM) | Conditional | POTM/series only when detail payload carries them |
| Scorecard — full (bat+bowl, both innings, 4-innings Tests) | Conditional | Per match; real zeros preserved; h-scroll, sticky heads |
| Scorecard — totals-only fallback | Conditional | Rendered as totals + "detailed scorecard unavailable" — never faked tables |
| Commentary — server pagination, 1-based pages | Conditional | `page=1` start, `pageCount` respected, zero-pageCount ⇒ empty state (never page 0); 20s poll while live |
| Commentary event chips (wicket/six/four) | Verified | Derived from event text + wicket flag |
| Squads (roles, captain, starter, styles) | Conditional | No bios, caps, portraits or career stats |
| Extras / fall of wickets / partnerships | Verified live 2026-11-26 | Production endpoint sends them (match 1546783: MUM extras 7; populated FOW/partnerships). Render only when present; zeros are real; breakdown never re-summed; provider order kept; “not supplied” ≠ zero; verbatim-payload regression test |
| Table tab (series standings for this match's league) | Conditional | Hidden/gated when league unknown or table empty |
| Jump-to-latest commentary | Verified | Fetches `pageCount` page; dedupes by play ID |

## Series, teams, players, standings

| Feature | Tier | Notes |
| --- | --- | --- |
| Series scoreboard for one YYYYMMDD | Conditional | `/espn/series/:league/matches?date=` — single day; **not** an archive |
| Standings (points table) | Conditional | `/espn/standings/:leagueId`; empty table is valid (bilaterals by design); season object → year label + validated dates, never `[object Object]`; `displayStats` verbatim (e.g. `137/20.0`) preferred over numeric rate-scale fallbacks; group id/season preserved; missing fields shown as "—" |
| Additional source — Sportskeeda points table (experimental) | Unsupported today | Route not released upstream (2026-11-26); registry ships **empty** — no verified league→slug mapping, so the UI renders "not configured"; if configured later: always-visible "Season not verified" banner, never merged with ESPN rows, degrades independently |
| Series deep-dives | Conditional | ESPN league IDs only; CB/CREX series IDs not routable |
| Team pages (match-observed fixtures) | Verified | From loaded feeds; no squad history, no honours |
| Player pages (match-observed stats only) | Verified | Only stats visible in this app's data; no career records |
| ICC rankings | Unsupported | No endpoint — intentionally absent |
| Career records / bios / portraits | Unsupported | No endpoint |

## Trust, freshness, failure

| Feature | Tier | Notes |
| --- | --- | --- |
| Provider disclosure on every card/detail | Verified | ESPN/Cricbuzz/CREX badges + fallback-crest labelling |
| Polling with backoff + last-good retention | Verified | Unit-tested ladder (15→30→60s ±20% jitter); stale badge on failure |
| Hidden-tab / offline polling pause | Verified | `useOnlineStatus`; resumes with a fresh fetch |
| Stale ⇒ last good data kept on screen | Verified | Query cache retains previous data; badge downgrades, never clears |
| Diagnostics (health / sources status) | Conditional | User-triggered buttons on About; not polled |
| CREX cards | Conditional | Limited coverage card + labelled external link only; HTML never parsed as JSON |
| Sample mode (offline deck) | Verified | Opt-in, fictional dataset, contract-tested, amber banner always on while active |
| Recorded demo (`/demo`) | Verified | Fictional showcase components; bannered; never presented as live |

## Explicitly out of scope (prohibited or absent)

| Feature | Tier | Why |
| --- | --- | --- |
| News / articles / headlines | Unsupported | Prohibited for this project |
| Betting, fantasy, odds, payments, ads, tracking | Unsupported | Prohibited |
| Win predictors / wagon wheels / ball tracking | Unsupported | Not in the API; protected models not reproduced |
| Head-to-head / venue stats / all-time archives | Unsupported | No endpoints; date-filtered Cricinfo broken upstream |
| Official crests of clubs/boards/broadcasters | Unsupported | Never bundled; feed images shown verbatim when supplied, ESPN CDN logos served same-origin (`/api/team-logo/espn/<id>`) for numeric ESPN ids otherwise, labelled monograms as final fallback |
| Push/live WebSocket stream | Unsupported | Upstream is polling; we say "updates when our provider updates", never "instant" |

Last reviewed: 2026-11-26. The same matrix appears (abbreviated) on `/about` in the running app.
