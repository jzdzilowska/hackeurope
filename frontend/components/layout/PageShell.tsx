'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Sidebar from './Sidebar'
import { useDashboard } from '@/lib/dashboard-context'

interface PageShellProps {
  /** Tiny all-caps tag above the heading */
  tag: string
  /** Bold page title */
  title: string
  /** Optional content to render on the right side of the top bar */
  topBarRight?: ReactNode
  children: ReactNode
}

export function SectionHeader({
  tag, title, action,
}: {
  tag: string
  title: string
  action?: string
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-disabled mb-1.5">
          {tag}
        </p>
        <h2 className="text-[17px] font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
      </div>
      {action && (
        <button className="text-[11px] text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
          {action} <ArrowUpRight size={11} />
        </button>
      )}
    </div>
  )
}

export default function PageShell({ tag, title, topBarRight, children }: PageShellProps) {
  const { accounts: mockAccounts } = useDashboard()
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 overflow-y-auto min-w-0 relative">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-background/85 backdrop-blur-md border-b border-border/25">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-disabled mb-0.5">
              {tag}
            </p>
            <h1 className="text-[15px] font-semibold text-text-primary tracking-tight">{title}</h1>
          </div>
          {topBarRight && (
            <div className="flex items-center gap-2">{topBarRight}</div>
          )}
        </div>

        {/* Page content */}
        <div className="px-8 pt-8 pb-12 space-y-8 max-w-[1200px]">
          {children}
        </div>

        {/* Live status widget */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="fixed bottom-5 left-[236px] z-30"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill border border-border/50 bg-surface shadow-card">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
            </span>
            <span className="text-[11px] text-text-secondary font-medium">
              {mockAccounts.length} accounts live
            </span>
            <span className="text-2xs text-text-disabled">·</span>
            <span className="text-[11px] text-text-disabled">synced 2m ago</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
