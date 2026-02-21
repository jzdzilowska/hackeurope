import type { Metadata } from 'next'
import './globals.css'
import { DashboardProvider } from '@/lib/dashboard-context'

export const metadata: Metadata = {
  title: 'HELM — Financial control for companies moving fast',
  description: 'AI-powered financial operating layer for early-stage companies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text-primary antialiased">
        <DashboardProvider>
          {children}
        </DashboardProvider>
      </body>
    </html>
  )
}
