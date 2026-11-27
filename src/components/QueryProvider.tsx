'use client'

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { shouldRetry, retryDelayMs } from '@/lib/polling'

/**
 * Single extra safety net for users who leave the tab backgrounded:
 * one refetch of ACTIVE queries when the page becomes visible again,
 * independent of any per-query config. Debounced to once per 10s; never
 * polls in the background.
 */
function VisibilityRefresh() {
  const qc = useQueryClient()
  useEffect(() => {
    let last = 0
    const kick = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - last < 10_000) return
      last = now
      void qc.invalidateQueries({ refetchType: 'active' })
    }
    document.addEventListener('visibilitychange', kick)
    window.addEventListener('focus', kick)
    return () => {
      document.removeEventListener('visibilitychange', kick)
      window.removeEventListener('focus', kick)
    }
  }, [qc])
  return null
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // No freshness window – we always want the latest provider state on focus/remount.
            staleTime: 0,
            gcTime: 5 * 60_000,
            retry: (failureCount, error) => shouldRetry(failureCount, error),
            retryDelay: (failureCount) => retryDelayMs(failureCount),
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchIntervalInBackground: false, // background tabs do not poll
            networkMode: 'online', // offline -> queries pause instead of erroring into UI
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <VisibilityRefresh />
      {children}
    </QueryClientProvider>
  )
}
