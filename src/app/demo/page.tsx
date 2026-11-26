import type { Metadata } from 'next'
import { DemoShowcase } from '@/components/DemoShowcase'
import { SampleModeToggle } from '@/components/SampleModeToggle'

export const metadata: Metadata = {
  title: 'Recorded demo (offline sample)',
  description: 'A clearly-labelled offline sample dataset for demonstrations when no live match is scheduled. Fictional data; never a real match, never shown as live.',
}

export default function DemoPage() {
  return (
    <div className="flex flex-col gap-4">
      <SampleModeToggle />
      <DemoShowcase />
    </div>
  )
}
