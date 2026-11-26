/**
 * Match importance ranking for list ordering.
 *
 * The feed supplies no priority signal, so importance is estimated from what
 * the feed does supply: series name and format. Higher tiers always sort
 * first; within a tier the feed's original order is preserved (stable sort).
 *
 * Tiers (documented, deliberate):
 *   90  ICC showpiece events and continental championships (World Cup,
 *       Champions Trophy, Asia Cup, tri-series among full members)
 *   75  Marquee franchise leagues (IPL, ILT20, SA20, BBL, PSL, CPL, The Hundred, MLC)
 *   60  Senior international tours ("Tour of ..." and similar series names)
 *   40  Age-group international cricket (Under-19, Rising Stars, A-side tours)
 *   30  Domestic first-class championships of note (Quaid-e-Azam Trophy)
 *   25  Unrecognised Twenty20 leagues (more watched than domestic FC by default)
 *   18  First-class domestic
 *   12  List A domestic
 *    8  Other formats (e.g. "Other OD")
 *    5  Unknown / unparseable
 *
 * This is an editorial judgement, not a claim about official status. It never
 * hides matches; it only orders them.
 */

export interface ImportanceInput {
  seriesName: string
  format: string
}

const ICC_SHOWPIECE =
  /(world cup|champions trophy|world\s*t20|icc\b|asia cup|tri[\s-]?series|world test championship|champions league)/i
const MARQUEE_LEAGUE =
  /(indian premier league|\bipl\b|international league t20|ilt20|big bash|\bbbl\b|pakistan super league|\bpsl\b|caribbean premier league|\bcpl\b|sa\s?20\b|the hundred|major league cricket|\bmlc\b|bangladesh premier league|\bbpl\b)/i
const SENIOR_TOUR = /tour of/i
const AGE_GROUP = /(under[\s-]?19|\bu19\b|rising stars|\ba[\s-]?side\b|emerging)/i
const DOMESTIC_CHAMP = /(quaid[\s-]?e[\s-]?azam|ranji trophy|sheffield shield|vijay hazare|syed mushtaq)/i
const T20 = /(twenty20|\bt20\b|\bt20i\b|\bt20\s?league\b)/i
const FIRST_CLASS = /first[\s-]?class|4-day|3-day|ci shield/i
const LIST_A = /list a/i
const OTHER_OD = /other od/i

export function matchImportance(input: ImportanceInput): number {
  const series = (input.seriesName || '').trim()
  const format = (input.format || '').trim()
  const hay = `${series} ${format}`

  if (ICC_SHOWPIECE.test(hay)) return 90
  if (MARQUEE_LEAGUE.test(hay)) return 75
  if (SENIOR_TOUR.test(hay)) return AGE_GROUP.test(hay) ? 40 : 60
  if (AGE_GROUP.test(hay)) return 40
  if (DOMESTIC_CHAMP.test(hay)) return 30
  if (FIRST_CLASS.test(format) || FIRST_CLASS.test(series)) return 18
  if (T20.test(hay)) return 25
  if (LIST_A.test(hay)) return 12
  if (OTHER_OD.test(hay)) return 8
  return 5
}

/** Stable sort: importance descending, ties keep the feed's original order. */
export function sortByImportance<T extends ImportanceInput>(matches: readonly T[]): T[] {
  return matches
    .map((match, index) => ({ match, index, score: matchImportance(match) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map(({ match }) => match)
}
