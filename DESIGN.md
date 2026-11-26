# Cricline Design Direction

## Identity
**Cricline** (cricline.vercel.app) is a cricket scores product for a school
presentation. It reads like a heritage pavilion turned modern broadsheet: warm
paper, green ink, brass detail, an editorial serif for the voice, a grotesque
for the numbers. It is confident, calm and specific, never loud, never default.

One-line Design Read: reading this as an editorial cricket-scores app for
students, teachers and cricket fans in a pavilion-broadsheet language, dial
ENERGY 2 / RHYTHM 2 / MOTION 1.

## Personality
Warm, literate, precise. A club noticetable written with modern typographic
discipline. Scores are sacred: always tabular, always legible, never decorated.

## Palette (R-29: 2 core + 1 accent, neutrals excluded)
- **Pine** (core, ink): `#0C261B` 950, `#123324` 900, `#173F2D` 800, `#20503B` 700
- **Paper** (core, ground): `#F5F0E4`, warm card `#FFFDF6`, warm edge `#E3DCC9`
- **Brass** (accent): text-on-paper `#7A5410`, marks/rules `#A87B24`, text-on-pine `#E2B659`
- Neutrals: pine-tinted ink `#1E2A23`, slate remapped toward green-grey at use sites
- Functional state colors only (live dot, stale amber, error red) are exempt from
  the core-palette count; they encode meaning, never decoration (R-09)

## Typography (R-06)
- **Fraunces Variable** (display serif): wordmark, page titles, status lines.
  Chosen because cricket heritage lives in print; a soft old-style serif with
  the wonky `SOFT` axis carries "pavilion" far better than a geometric sans.
- **Archivo Variable** (grotesque): interface text, scores, tables. Chosen for
  its tabular figures and grotesque clarity at small sizes; it is not the AI
  default sans and it is not Inter.
- Reasons written per R-31: serif = identity/voice, grotesque = numeric legibility.

## Layout and Rhythm (R-05, RHYTHM 2)
Content-led composition, not template anatomy. The app opens on the match
lists themselves (no hero), because the product IS the list. Sections vary:
masthead bar, editorial heading row, filter shelf, card grid, warm footer.
Card grids are not bento mosaics; every card shares one deliberate anatomy
(series line, marks, score rows, verdict line, meta line) because scanning
scores demands a fixed grammar.

## Motion (R-19, MOTION 2 for the score moment only; MOTION 1 elsewhere)
Interactive feedback everywhere (hover lift, focus rings, favorite star pop,
score-flash on polled updates, one live-pulse dot, skeleton shimmer for
loading). The Match Center scoreboard carries the one expressive moment: the
score itself (e.g. `138/4`) is a tappable button. When a fresh ball lands
between polls, a burst chip (`FOUR` / `SIX` / `WICKET` / `+2`…) rises beside
the figure and the figure pings once; tapping the score opens a replay
overlay that re-enacts the recorded ball (bowler runs in, ball travels the
lane, outcome lands: dots, ones-to-threes, FOUR/SIX flight, wicket with
tumbling bails, extra tag). The scene is driven purely by the recorded
ball's event class, replays on demand via the Replay button, fetches the
newest recorded ball on demand (never polled at rest), and carries the
re-enactment honesty line. The commentary list is deliberately still: no
bails, no ball flight, no chips animating in the reading flow. No scroll
reveals, no parallax, no autoplay chaos. Everything collapses to a static
final frame under `prefers-reduced-motion`. Motion is feedback and
legibility, never page dressing; anything beyond that would slip into
spectacle, which the Pavilion brief forbids.

## Marks and imagery (R-22, R-23)
Only real marks from the data feed or their same-origin fallback chain
(proxy first — the one path verified in production, then feed URL, registry,
CDN) are shown. A mark that fails every stage is
replaced by a deterministic monogram in pine tones, labeled as a fallback
badge, never passed off as an official crest. No generated imagery anywhere.

## Reasons ledger (R-31)
- Dark live hero: cricket's night-match broadcast frame in one card; scores
  read instantly at distance (classroom projector), the one place the
  serif display face is allowed full size.
- Skeleton shimmer on load: the screen shows the shape of what is coming,
  never a stalled spinner pretending nothing happened.
- Score-flash on refresh: a polled score change must be noticed without
  being shouted; one brass bloom, then settle.
- Score-tap replay ("The moment"): the scoreboard is where eyes already
  are when a ball lands; the delight belongs there, not in the reading
  flow. Tapping the score opens the one expressive scene, driven only by
  what the feed records (event class, runs, wicket flag) or by the
  between-polls score delta when commentary has no page. It invents nothing.
- Generous restraint pass: giant-product polish comes from whitespace,
  hierarchy and calm surfaces — bigger figures, roomier rhythm — not from
  added chrome; Cricline keeps one accent (brass) and one identity color
  (pine) and spends neither on decoration.
- Paper ground: cricket is played in daylight; cream is the sport's native
  light, and it separates Cricline from the blue-black scoreboard clones.
- Pine ink: deep green is cricket whites' counterpart in club color; it sets
  an editorial, inked tone without going dark-mode for fashion (R-21).
- Brass accent: the pavilion's brass fittings; used sparingly at the moments
  that matter (focus ring, active tab rule, live dot), never as fill (R-13).
- Serif status lines: the verdict sentence is the product's "voice", so it is
  set in the serif italic, like a reported line in a broadsheet.
- Fixed card anatomy: comprehension beats variety for score scanning (C-3).
- Monogram fallback: honest absence beats invented crests (R-38, C-5).

## Accessibility floor (R-03, R-25, R-32)
WCAG AA everywhere (body text >= 4.5:1, large text >= 3:1), visible focus
rings (brass, 2-3px), full keyboard operability, 44px tap targets on touch,
no horizontal overflow, reduced-motion respected.
