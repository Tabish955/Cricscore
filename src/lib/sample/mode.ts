/**
 * SAMPLE MODE – explicit, opt-in, offline dataset for classrooms without
 * network access to the API. Every byte here is FICTIONAL: invented teams,
 * players and scores, clearly labelled. Sample mode never turns on silently:
 * the user flips a switch on /demo or /about which writes
 * `cricscore:sample-mode:v1=1` to localStorage and reloads.
 */

/** True only in a browser that explicitly opted in. */
export function isSampleMode(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    return window.localStorage.getItem('cricscore:sample-mode:v1') === '1'
  } catch {
    return false
  }
}

export function enableSampleMode(): void {
  try {
    window.localStorage.setItem('cricscore:sample-mode:v1', '1')
  } catch {
    /* storage blocked – the toggle simply won't persist */
  }
}

export function disableSampleMode(): void {
  try {
    window.localStorage.removeItem('cricscore:sample-mode:v1')
  } catch {
    /* ignore */
  }
}
