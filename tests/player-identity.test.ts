import { describe, expect, it } from 'vitest'
import { matchesPlayer, playerProfileUrl } from '@/lib/player-identity'

describe('provider-local player identity', () => {
  it('matches IDs even if the name query differs', () => {
    expect(matchesPlayer({ id: '123', name: 'Published name' }, '123', 'Old name')).toBe(true)
  })
  it('rejects a conflicting ID even for an identical name', () => {
    expect(matchesPlayer({ id: '456', name: 'Same Name' }, '123', 'Same Name')).toBe(false)
  })
  it('falls back to exact normalized names only when a row has no ID', () => {
    expect(matchesPlayer({ id: null, name: ' Same Name ' }, '123', 'same name')).toBe(true)
    expect(matchesPlayer({ id: null, name: '' }, '123', '')).toBe(false)
    expect(matchesPlayer({ id: null, name: 'Other Name' }, '123', 'Same Name')).toBe(false)
  })
  it('never puts a different provider ID into a Cricinfo URL', () => {
    expect(playerProfileUrl('espn', '253802')).toBe('https://www.cricinfo.com/ci/content/player/253802.html')
    for (const p of ['cb', 'crex', 'unknown']) expect(playerProfileUrl(p, '253802')).toBeNull()
    for (const id of ['../123', 'abc', '0', '123?x=1', '']) expect(playerProfileUrl('espn', id)).toBeNull()
  })
})
