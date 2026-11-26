# CricScore — 5-minute classroom demo walkthrough

**Timing:** ~5 minutes. **Audience:** school presentation. **Projector:** 360 px→1080p scales fine.

## 0. Before class (2 minutes, on the presentation network)

1. `npm ci && npm run build && npm run start` on the presentation machine.
2. Open `/about` → **Source diagnostics** → press **Health** and **Sources status**.
   - Both JSON chips show `success` ⇒ API reachable — demo with real data.
   - Either fails ⇒ flip **Offline sample mode** ON (About or /demo), confirm the **amber banner**
     appears on every page, and say out loud: "Live data isn't reachable from this network, so
     the next five minutes show a recorded fictional dataset." **Never hide this switch.**
3. Narrow the browser to ~1000 px (or project as-is) — layout holds; tables scroll horizontally.

> Never present sample-mode data as real. Never remove or cover the amber banner. If asked
> whether CricScore is a real broadcast product: "It's an original educational app; data comes
> from a public community API; scores refresh by polling, not by magic."

## Script

### 1. Disclaimer first (15 s) — `/`
Point at the amber disclaimer bar: *School project · Educational only · Not affiliated.*
One sentence: "Everything you'll see carries this, and it never turns off."

### 2. Live Center (45 s) — `/`
- Point at **tabs** Live / Recent / Upcoming and the **LIVE** emerald badges; mention polling
  ("refreshes when our provider updates — every 15 seconds on Live; it is not a live socket").
- **Filter** by format (T20/ODI/Test chips) — filter applies instantly client-side.
- **Search** a team in the box; results come from matches loaded on screen.
- Point out a **provider badge** (ESPN / Cricbuzz / CREX) and the "via …" provenance line.
- If a match is live, click it. If nothing is live and sample mode is off, click any Recent
  match, or fall back to Sample Mode now.

### 3. Match Center (2 min) — `/match/...`
- **Score header persists** — scroll down; score + provider badge stay pinned.
- **Overview tab**: status, series, venue, player of the match (if provided). Point at
  "as of HH:MM, via ESPN" — we show *when* the data was captured, not a claim of instant sync.
- **Scorecard tab**: pick an innings; point at real zeros in the figures, sticky headings and
  horizontal scroll. Mention four-innings Tests work, and that a "totals-only" banner appears
  instead of a fake full card if the provider only has totals.
- **Commentary tab**: wicket/six/four chips; page indicator "Page 2 of 4"; **Jump to latest**
  button; cumulative score shown as text. Say: "Page count comes from the provider; if a match
  has zero commentary pages we show an empty state, never page 0."
- **Squads tab**: captain/starter chips; no bios — "the API doesn't publish them, so we don't
  invent them."
- **Table tab**: the series points table for this match's league (if any). NRR shows "—" when
  the provider omits it; CricScore never computes a fake NRR.
- Ask the audience to stare at the **stale badge** behavior: throttle/offline (DevTools →
  Network → Offline), watch it flip to "last updated HH:MM — may be stale" instead of blanking.

### 4. Series scoreboard (45 s) — `/series`
- Pick **today's** date with the date picker; "Matches for selected date" — say explicitly:
  "This is a single-day scoreboard, not a season archive. The API can't do archives, so we
  don't pretend to."
- Click a date with matches → list renders; empty day renders a clean empty state.

### 5. Standings (30 s) — `/standings`
- Enter the league id (sample-mode league is **9001**; for real demos use the league you
  already verified in diagnostics). Provider ranks, missing NRR as "—", ties handled.
- Bilateral league ⇒ empty table with the explanation shown. "Empty is an honest answer."

### 6. Search & favorites (30 s) — `/search`, `/favorites`
- Search "Harbour" (sample) or a real team; note ≥350 ms debounce; click through.
- Star a match (☆) and a team; open **/favorites**; reload the page — they persist
  (localStorage, provider-scoped: `espn:123` ≠ `cb:123`).

### 7. About, trust & close (30 s) — `/about`
- Scroll the **coverage matrix**: green/amber/grey tiers, one line each.
- Show **Source diagnostics** again (button-triggered, not polled).
- Final line: "CricScore shows only what the data supports. Where the API is silent, we say so
  instead of inventing it. Questions?"

## If something breaks mid-demo

| Symptom | Move |
| --- | --- |
| Lists empty, no live matches | Flip Sample Mode ON, keep narrating with the banner visible |
| Scorecard error banner | Say "the provider doesn't cover this match fully" — this is the coverage-gated path working, not a crash |
| 502 from diagnostics | Sample Mode ON; show diagnostics body verbatim — it says what failed |
| Wrong screen / wrong match | `Favorites` survives reloads; otherwise navigate via tabs — never type raw URLs live |

## After class

`git` checkout shows everything is in-repo; no external services besides the one public API.
Keep `docs/TEST-REPORT.md` handy — someone *will* ask "did you test this?"
