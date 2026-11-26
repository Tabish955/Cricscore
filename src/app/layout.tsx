import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header, Footer, DisclaimerBar } from '@/components/Header'
import { QueryProvider } from '@/components/QueryProvider'
import { SampleModeBanner } from '@/components/SampleModeBanner'

export const metadata: Metadata = {
  title: {
    default: 'CricScore — Cricket scores, clearly',
    template: '%s · CricScore',
  },
  description:
    'Educational cricket scores demo for a school presentation. Live, recent and upcoming matches via a community cricket API. Not affiliated with Cricbuzz, ESPNcricinfo or CREX.',
}

export const viewport: Viewport = {
  themeColor: '#10233a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans antialiased">
        <a href="#main" className="skip-link">Skip to main content</a>
        <DisclaimerBar />
        <SampleModeBanner />
        <QueryProvider>
          <Header />
          <main id="main" className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
            {children}
          </main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  )
}
