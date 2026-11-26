import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header, Footer } from '@/components/Header'
import { TickerBar } from '@/components/TickerBar'
import { QueryProvider } from '@/components/QueryProvider'
import { SampleModeBanner } from '@/components/SampleModeBanner'

export const metadata: Metadata = {
  title: {
    default: 'Cricline: Cricket scores, clearly',
    template: '%s · Cricline',
  },
  description:
    'Live, recent and upcoming cricket matches with full scorecards, fixtures, tables and squads. A school presentation project.',
}

export const viewport: Viewport = {
  themeColor: '#0c261b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans antialiased">
        <a href="#main" className="skip-link">Skip to main content</a>
        <SampleModeBanner />
        <QueryProvider>
          <Header />
          <TickerBar />
          <main id="main" className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
            {children}
          </main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  )
}
