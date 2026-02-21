'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Bell, ArrowUpRight } from 'lucide-react'
import Sidebar              from '@/components/layout/Sidebar'
import CashPositionHero     from '@/components/dashboard/CashPositionHero'
import KPICards             from '@/components/dashboard/KPICards'
import BurnRateChart        from '@/components/dashboard/BurnRateChart'
import CategoryBreakdown    from '@/components/dashboard/CategoryBreakdown'
import InsightCards         from '@/components/dashboard/InsightCards'
import UpcomingPayments     from '@/components/dashboard/UpcomingPayments'
import ApprovalQueue        from '@/components/dashboard/ApprovalQueue'
import AIChat               from '@/components/dashboard/AIChat'
import { useDashboard } from '@/lib/dashboard-context'

// ── Editorial section header component ──────────────────────────────────
function SectionHeader({
  tag,
  title,
  action,
}: {
  tag: string
  title: string
  action?: string
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-disabled mb-1">
          {tag}
        </p>
        <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-1.5">
          {title}
          <ArrowUpRight size={16} className="text-text-muted opacity-50" />
        </h2>
      </div>
      {action && (
        <button className="text-2xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
          {action} <ArrowUpRight size={10} />
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { org, approvals, accounts } = useDashboard()
  const [chatOpen, setChatOpen] = useState(false)
  const pendingCount = approvals.filter(a => a.status === 'pending').length

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-y-auto min-w-0 relative">

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/30">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled mb-0.5">
              {org.name}
            </p>
            <h1 className="text-base font-bold text-text-primary tracking-tight">Overview</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Approval badge */}
            {pendingCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-accent/8 border border-accent/18 text-xs font-medium text-accent cursor-pointer hover:bg-accent/12 transition-colors"
              >
                <Bell size={11} />
                {pendingCount} need approval
              </motion.div>
            )}

            {/* Ask HELM */}
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-black text-xs font-semibold hover:brightness-105 active:scale-[0.98] transition-all"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <MessageSquare size={11} />
              Ask HELM
            </button>
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="px-8 pt-7 pb-10 space-y-8 max-w-[1200px]">

          {/* Section 1: Cash position hero */}
          <div>
            <SectionHeader tag="FINANCIAL" title="Cash Position" />
            <CashPositionHero />
          </div>

          {/* Section 2: KPI metrics */}
          <div>
            <SectionHeader tag="METRICS" title="Key Indicators" action="View all" />
            <KPICards />
          </div>

          {/* Section 3: Burn + categories */}
          <div>
            <SectionHeader tag="ANALYSIS" title="Spend Breakdown" action="Export" />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <BurnRateChart />
              </div>
              <div className="col-span-1">
                <CategoryBreakdown />
              </div>
            </div>
          </div>

          {/* Section 4: AI insights */}
          <div>
            <SectionHeader tag="AI" title="Insights" action="Refresh" />
            <InsightCards />
          </div>

          {/* Section 5: Payments + approvals */}
          <div>
            <SectionHeader tag="PAYMENTS" title="Upcoming & Approvals" action="All payments" />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <UpcomingPayments />
              </div>
              <div className="col-span-1">
                <ApprovalQueue />
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>

        {/* ── Live status widget — bottom left (Dwarf-inspired) ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="fixed bottom-5 left-[226px] z-30"
        >
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 backdrop-blur-md bg-surface/90"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-2xs text-text-secondary font-medium">
              {accounts.length} accounts live
            </span>
            <span className="text-2xs text-text-disabled">·</span>
            <span className="text-2xs text-text-disabled">synced 2m ago</span>
          </div>
        </motion.div>
      </div>

      {/* ── AI Chat sliding panel ── */}
      <AIChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
