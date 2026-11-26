/**
 * Zod schemas for the production API's response envelopes.
 *
 * Strategy: validate the STRUCTURE strictly enough to reject HTML error pages and
 * garbage, but treat individual scalar fields (numbers-as-strings etc.) leniently –
 * real upstream payloads are dirtier than the docs contract. Coercion happens in
 * normalize.ts, never here: a schema that throws on `strikeRate: "31.25"` would take
 * down a working scorecard over one field.
 */
import { z } from 'zod'

const idLike = z.union([z.string(), z.number()]).transform(String)

export const TeamRefSchema = z
  .object({
    id: idLike.optional().nullable(),
    name: z.string().optional().nullable(),
    short: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
  })
  .passthrough()

export const InningsScoreSchema = z
  .object({
    inningsId: z.number().optional().nullable(),
    team: z.string().optional().nullable(),
    score: z.union([z.string(), z.number()]).optional().nullable(),
    overs: z.union([z.string(), z.number()]).optional().nullable(),
    declared: z.boolean().optional().nullable(),
  })
  .passthrough()

export const MatchListItemSchema = z
  .object({
    matchId: idLike,
    teams: z.string().optional().nullable(),
    team1: TeamRefSchema.optional().nullable(),
    team2: TeamRefSchema.optional().nullable(),
    scores: z.array(InningsScoreSchema).optional().nullable(),
    category: z.string().optional().nullable(),
    live: z.boolean().optional().nullable(),
    status: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    stateTitle: z.string().optional().nullable(),
    series: z.string().optional().nullable(),
    seriesId: idLike.optional().nullable(),
    format: z.string().optional().nullable(),
    venue: z
      .object({
        ground: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
      })
      .passthrough()
      .optional()
      .nullable(),
    startDate: z.union([z.number(), z.string()]).optional().nullable(),
    endDate: z.union([z.number(), z.string()]).optional().nullable(),
    source: z.string().optional().nullable(),
    detail: z.string().optional().nullable(),
    scorecard: z.string().optional().nullable(),
    commentary: z.string().optional().nullable(),
    squads: z.string().optional().nullable(),
    upstream: z.string().optional().nullable(),
    startTimeText: z.string().optional().nullable(),
  })
  .passthrough()

export const ListResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    found: z.boolean().optional(),
    count: z.number().optional(),
    matches: z.array(MatchListItemSchema).optional().nullable(),
  }),
  meta: z.unknown().optional(),
})

export const MatchDetailResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    match: z
      .object({
        matchId: idLike.optional().nullable(),
        status: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        live: z.boolean().optional().nullable(),
        state: z.string().optional().nullable(),
        stateTitle: z.string().optional().nullable(),
        series: z.unknown().optional().nullable(),
        seriesId: idLike.optional().nullable(),
        seriesName: z.string().optional().nullable(),
        format: z.string().optional().nullable(),
        team1: TeamRefSchema.optional().nullable(),
        team2: TeamRefSchema.optional().nullable(),
        scores: z.array(InningsScoreSchema).optional().nullable(),
        venue: z
          .object({
            ground: z.string().optional().nullable(),
            city: z.string().optional().nullable(),
            country: z.string().optional().nullable(),
          })
          .passthrough()
          .optional()
          .nullable(),
        playerOfTheMatch: z.array(z.string()).optional().nullable(),
        startDate: z.union([z.number(), z.string()]).optional().nullable(),
        detail: z.string().optional().nullable(),
        scorecard: z.string().optional().nullable(),
        commentary: z.string().optional().nullable(),
        squads: z.string().optional().nullable(),
      })
      .passthrough(),
  }),
  meta: z.unknown().optional(),
})

const numLike = z.union([z.number(), z.string()]).optional().nullable()

export const BatsmanSchema = z
  .object({
    id: idLike.optional().nullable(),
    name: z.string().optional().nullable(),
    teamId: idLike.optional().nullable(),
    position: numLike,
    runs: numLike,
    balls: numLike,
    fours: numLike,
    sixes: numLike,
    strikeRate: numLike,
    dismissal: z.string().optional().nullable(),
    isBatting: z.boolean().optional().nullable(),
  })
  .passthrough()

export const BowlerSchema = z
  .object({
    id: idLike.optional().nullable(),
    name: z.string().optional().nullable(),
    teamId: idLike.optional().nullable(),
    overs: z.union([z.string(), z.number()]).optional().nullable(),
    maidens: numLike,
    runs: numLike,
    wickets: numLike,
    economy: numLike,
    wides: numLike,
    noBalls: numLike,
  })
  .passthrough()

const ExtrasSchema = z
  .object({
    total: numLike,
    byes: numLike,
    legByes: numLike,
    noBalls: numLike,
    wides: numLike,
    penalties: numLike,
  })
  .passthrough()

/** Cricket overs stay strings – 4.4 overs is NOT 4.4 in decimal arithmetic. */
const oversLike = z.union([z.string(), z.number()]).optional().nullable()

const InningsEndpointSchema = z
  .object({
    overs: oversLike,
    runs: numLike,
    wickets: numLike,
  })
  .passthrough()

const FallOfWicketSchema = z
  .object({
    wicketNumber: numLike,
    overs: oversLike,
    /** TEAM total at the dismissal – not the batter's score. */
    runs: numLike,
    type: z.string().optional().nullable(),
    batsman: z
      .object({
        id: idLike.optional().nullable(),
        name: z.string().optional().nullable(),
      })
      .passthrough()
      .optional()
      .nullable(),
    batsmanRuns: numLike,
    ballsFaced: numLike,
  })
  .passthrough()

const PartnershipSchema = z
  .object({
    wicketNumber: numLike,
    /** Provider fowType string – no undocumented enum is assumed. */
    type: z.string().optional().nullable(),
    runs: numLike,
    overs: oversLike,
    runRate: numLike,
    start: InningsEndpointSchema.optional().nullable(),
    end: InningsEndpointSchema.optional().nullable(),
    batsmen: z
      .array(
        z
          .object({
            id: idLike.optional().nullable(),
            name: z.string().optional().nullable(),
            runs: numLike,
            balls: numLike,
          })
          .passthrough(),
      )
      .optional()
      .nullable(),
  })
  .passthrough()

export const InningsScorecardSchema = z
  .object({
    inningsId: z.number().optional().nullable(),
    teamId: idLike.optional().nullable(),
    team: z.string().optional().nullable(),
    score: z.union([z.string(), z.number()]).optional().nullable(),
    overs: oversLike,
    declared: z.boolean().optional().nullable(),
    batsmen: z.array(BatsmanSchema).optional().nullable(),
    bowlers: z.array(BowlerSchema).optional().nullable(),
    // Absent (old backend) or null (no data) = unavailable; [] = explicitly empty.
    extras: ExtrasSchema.optional().nullable(),
    fallOfWickets: z.array(FallOfWicketSchema).optional().nullable(),
    partnerships: z.array(PartnershipSchema).optional().nullable(),
  })
  .passthrough()

export const ScorecardResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    matchId: idLike.optional().nullable(),
    innings: z.array(InningsScorecardSchema).optional().nullable(),
    coverage: z.string().optional().nullable(),
    warnings: z.array(z.string()).optional().nullable(),
  }),
  meta: z.unknown().optional(),
})

export const SquadsResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    matchId: idLike.optional().nullable(),
    teams: z
      .array(
        z.object({
          teamId: idLike.optional().nullable(),
          teamName: z.string().optional().nullable(),
          players: z
            .array(
              z
                .object({
                  id: idLike.optional().nullable(),
                  name: z.string().optional().nullable(),
                  role: z.string().optional().nullable(),
                  isCaptain: z.boolean().optional().nullable(),
                  isStarter: z.boolean().optional().nullable(),
                  battingStyle: z.string().optional().nullable(),
                  bowlingStyle: z.string().optional().nullable(),
                })
                .passthrough(),
            )
            .optional()
            .nullable(),
        }),
      )
      .optional()
      .nullable(),
  }),
  meta: z.unknown().optional(),
})

export const CommentaryItemSchema = z
  .object({
    id: idLike.optional().nullable(),
    inningsId: numLike,
    over: z.union([z.number(), z.string()]).optional().nullable(),
    ball: z.union([z.number(), z.string()]).optional().nullable(),
    event: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    runs: numLike,
    batsman: z.string().optional().nullable(),
    bowler: z.string().optional().nullable(),
    score: z.union([z.string(), z.number()]).optional().nullable(),
    wicket: z.union([z.boolean(), z.string(), z.number()]).optional().nullable(),
  })
  .passthrough()

export const CommentaryResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    matchId: idLike.optional().nullable(),
    page: z.number().optional().nullable(),
    pageSize: z.number().optional().nullable(),
    pageCount: z.number().optional().nullable(),
    total: z.number().optional().nullable(),
    commentary: z.array(CommentaryItemSchema).optional().nullable(),
  }),
  meta: z.unknown().optional(),
})

export const SeriesMatchesResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    count: z.number().optional(),
    matches: z.array(MatchListItemSchema).optional().nullable(),
  }),
  meta: z.unknown().optional(),
})

const SeasonObjectSchema = z
  .object({
    year: numLike,
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  })
  .passthrough()

export const StandingsResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    leagueId: idLike.optional().nullable(),
    name: z.string().optional().nullable(),
    season: z.union([z.string(), z.number(), SeasonObjectSchema]).optional().nullable(),
    groups: z
      .array(
        z.object({
          id: idLike.optional().nullable(),
          name: z.string().optional().nullable(),
          season: numLike,
          entries: z
            .array(
              z.object({
                team: TeamRefSchema.optional().nullable(),
                stats: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])).optional().nullable(),
                // Provider-verbatim display strings (e.g. "137/20.0"); may carry signed NRR.
                displayStats: z.record(z.unknown()).optional().nullable(),
              }),
            )
            .optional()
            .nullable(),
        }),
      )
      .optional()
      .nullable(),
  }),
  meta: z.unknown().optional(),
})

/** Experimental Sportskeeda adapter – independent source, never merged with ESPN. */
export const SportskeedaStandingsResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    provider: z.string().optional().nullable(),
    seriesSlug: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    season: z.unknown().optional().nullable(),
    // Unknown on purpose: anything other than literal `true` must degrade to "not verified".
    seasonVerified: z.unknown().optional().nullable(),
    warnings: z.array(z.string()).optional().nullable(),
    groups: z
      .array(
        z.object({
          name: z.string().optional().nullable(),
          entries: z
            .array(
              z.object({
                team: TeamRefSchema.optional().nullable(),
                stats: z
                  .object({
                    rank: numLike,
                    matchesPlayed: numLike,
                    matchesWon: numLike,
                    matchesLost: numLike,
                    noresult: numLike,
                    matchPoints: numLike,
                    netrr: numLike,
                    matchesTied: numLike,
                    matchesDraw: numLike,
                  })
                  .passthrough()
                  .optional()
                  .nullable(),
              }),
            )
            .optional()
            .nullable(),
        }),
      )
      .optional()
      .nullable(),
  }),
  meta: z.unknown().optional(),
})

export const SearchResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    matches: z
      .array(
        z
          .object({
            matchId: idLike,
            teams: z.string().optional().nullable(),
            status: z.string().optional().nullable(),
            live: z.boolean().optional().nullable(),
            detail: z.string().optional().nullable(),
            series: z.string().optional().nullable(),
          })
          .passthrough(),
      )
      .optional()
      .nullable(),
  }),
  meta: z.unknown().optional(),
})

export const HealthResponseSchema = z.object({
  success: z.boolean().optional(),
  status: z.string().optional(),
}).passthrough()

export const SourcesStatusResponseSchema = z
  .object({
    success: z.boolean().optional(),
    sources: z
      .array(
        z
          .object({
            name: z.string().optional().nullable(),
            available: z.boolean().optional().nullable(),
          })
          .passthrough(),
      )
      .optional()
      .nullable(),
  })
  .passthrough()

export type MatchListItemRaw = z.infer<typeof MatchListItemSchema>
