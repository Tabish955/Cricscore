'use client'

import { useEffect, useState } from 'react'
import { loadFavorites, toggleFavoriteMatch, toggleFavoriteTeam, type FavoriteMatch, type FavoriteTeam } from '@/lib/storage'

/** Match-level favorite toggle. Provider-scoped key – espn:1 ≠ cb:1. */
export function FavoriteMatchButton({ match }: { match: Omit<FavoriteMatch, 'savedAt'> }) {
  const [isFav, setIsFav] = useState(false)
  useEffect(() => {
    setIsFav(loadFavorites().matches.some((m) => m.key === match.key))
  }, [match.key])
  return (
    <button
      type="button"
      aria-pressed={isFav}
      aria-label={isFav ? `Remove ${match.label} from favorites` : `Add ${match.label} to favorites`}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      onClick={() => {
        const store = toggleFavoriteMatch(match)
        setIsFav(store.matches.some((m) => m.key === match.key))
      }}
      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={isFav ? '#f2a007' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}

/** Team-level favorite toggle. */
export function FavoriteTeamButton({ team }: { team: Omit<FavoriteTeam, 'savedAt'> }) {
  const [isFav, setIsFav] = useState(false)
  useEffect(() => {
    setIsFav(loadFavorites().teams.some((t) => t.key === team.key))
  }, [team.key])
  return (
    <button
      type="button"
      aria-pressed={isFav}
      aria-label={isFav ? `Remove ${team.name} from favorite teams` : `Add ${team.name} to favorite teams`}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      onClick={() => {
        const store = toggleFavoriteTeam(team)
        setIsFav(store.teams.some((t) => t.key === team.key))
      }}
      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={isFav ? '#f2a007' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}
