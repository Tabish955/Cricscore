# CricScore — known gaps & limitations

Honesty-first list. Nothing here is secretly worked around; items are either upstream-limited,
out-of-scope by requirement, or explicitly deferred.

## Upstream-limited (nothing the app can do about these)

1. **The upstream API was unreachable from the build sandbox** (curl exit 35; proxy 502).
   Contract fidelity is fixture-based, not live-captured. First real-network run may expose
   payload quirks (see "Contract drift" below).
2. **Freshness ceiling.** Even perfect polling cannot beat the upstream caches (lists ~15–120 s).
   The API has no WebSocket/SSE; the UI never claims "instant" — it says "updates when our
   provider updates".
3. **No career data, rankings, bios, head-to-head, venue history, archives.** Not exposed by
   the API; player/team pages deliberately show match-observed data only.
4. **Standings empty for bilateral series** (by upstream design). The empty table with
   explanation is the correct, honest render.
5. **Commentary page count can change mid-match** (pages appended). The app re-reads
   `pageCount` per fetch and clamps requests; a race that shows a briefly-stale indicator is
   possible and self-corrects on the next 20 s poll.
6. **Scorecard coverage varies per match** (full ⇔ tables present; totals-only otherwise).
   Never upgraded by the UI.
7. **CREX coverage is thin** — limited card + labelled external link; no HTML-as-JSON parsing.
8. **Date-filtered Cricinfo lists are broken upstream**; recent/upcoming date browsing is
   absent instead of wrong.

## By-requirement omissions (do not "fix")

9. **No news anywhere** — no headlines surface exists.
10. **No betting/odds/fantasy/payments/ads/tracking** — none included, ever.
11. **No official club/board/franchise crests bundled** — feed-supplied images, ESPN-CDN logos
    served same-origin via `/api/team-logo/espn/<id>` (direct CDN as second chance), or a
    clearly-labelled monogram. The id *is* the team; artwork is never re-mapped between teams.
12. **No win prediction, wagon wheels, ball tracking** — protected/proprietary; absent.
13. **Spec example IDs never seeded** as fixtures (`1546783`/`8661`/`20261126` treated as
    historical references only).

## Engineering gaps (honest)

14. **No ESLint configuration.** Verification = strict `tsc` + `next build` + unit tests. Adding
    `eslint-config-next` + CI would be the first follow-up.
15. **Extended scorecard fields (extras / fall of wickets / partnerships) — shipped and verified
    live (2026-11-26, ~14:26Z).** `/espn/match/1546783/scorecard?league=8661&date=20261126`
    returns `extras.total` 7 for Mumbai plus populated fallOfWickets and partnerships arrays
    (both innings). The website renders them with a verbatim-payload regression test
    (`tests/extended-api.test.ts`); “not supplied” remains an explicit state and is shown only
    when sections are genuinely missing (e.g. older cached responses lack the fields entirely).
16. **Sportskeeda points table — not released.** `/sportskeeda/series/:slug/points-table` is
    absent from the upstream index and direct requests fail. The website ships the allowlist
    route, client, normalizer and UI behind an **empty** verified-mapping registry; until the
    route ships *and* a slug (e.g. for Syed Mushtaq Ali Trophy) is validated against the public
    Sportskeeda page, the UI shows “Additional source not configured” — never an invented table,
    never a merged ranking.
17. **Standings `season` is an object upstream today** (`{year, startDate, endDate}`) which the
    old website schema rejected outright — standings rendered as unavailable. The schema and
    normalizer now accept it; season shows as the year label plus validated ISO dates.
    `displayStats` (runs/overs strings like `137/20.0`) is preferred verbatim over numeric
    run-rate-scale fields when present.
15. **No browser e2e (Playwright).** Spec asks for it "where feasible"; the sandbox has no
    browsers. All UI verification is curl/HTML + unit tests; keyboard/focus/h-scroll/360 px
    behavior implemented but not click-tested.
16. **No Lighthouse/axe audit.** WCAG-minded implementation (skip link, landmarks, focus-visible
    rings, reduced-motion respect, labelled icon buttons, semantic tables) but unaudited.
17. **No load/stress testing.** Not relevant for a school demo, relevant if this ever grew.
18. **No CSP headers** beyond Next defaults + `poweredByHeader: false`; `img-src` is open for
    feed-supplied `https:` images because origins are upstream-provided. A nonce-based CSP is
    future work; the current posture (no injected HTML, text-only rendering) is deliberate.
19. **Contract drift risk.** Live payloads may differ from fixtures (e.g. strikeRate as string).
    Schemas coerce "numberish" scalars; strict structure with `.passthrough()` reduces breakage
    to per-field issues rather than total failure.
20. **Team-asset registry grows monotonically** in localStorage (no eviction). Capped entries
    (50 assets) mitigate; a TTL sweep would be nice-to-have.
21. **Sample-mode dataset is hand-authored** (league `9001`, 3 matches, ~14 commentary items).
    It is contract-validated but minimal; it is not a simulation and never implies real form/fitness/knowledge.
22. **`2026-11-26` demo date** — state examples ("20261126") refer to that date; rehearsing on a
    different date requires picking a date that actually has matches (series page shows empties
    cleanly, which is also fine for teaching "honest empty states").

## Feature ideas explicitly rejected for this build

- Full season calendars, per-player history charts (needs real archives — unavailable).
- Push notifications (no push channel; polling only).
- Any AI commentary/insight layer (would fabricate interpretation; violates the no-invention rule).
- Colour themes per team (navy/amber identity is the project's own; per-team skins imply
  endorsement we don't have).

Last reviewed: 2026-11-26.
