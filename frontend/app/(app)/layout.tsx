'use client'

import { DashboardProvider } from '@/lib/dashboard-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardProvider>{children}</DashboardProvider>
}
