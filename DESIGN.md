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

## Motion (R-19, MOTION 1)
Hover transitions on interactive rows, opacity fade-in for marks as they load,
one live-pulse dot. No scroll reveals, no parallax. Everything stops under
`prefers-reduced-motion`. Motion is feedback, never page dressing.

## Marks and imagery (R-22, R-23)
Only real marks from the data feed or their same-origin fallback chain
(proxy, feed URL, registry, CDN) are shown. A mark that fails every stage is
replaced by a deterministic monogram in pine tones, labeled as a fallback
badge, never passed off as an official crest. No generated imagery anywhere.

## Reasons ledger (R-31)
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
