'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { shouldRetry, retryDelayMs } from '@/lib/polling'

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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
