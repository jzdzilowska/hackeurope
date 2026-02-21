'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Bell } from 'lucide-react'
import Sidebar              from '@/components/layout/Sidebar'
import CashPositionHero     from '@/components/dashboard/CashPositionHero'
import KPICards             from '@/components/dashboard/KPICards'
import BurnRateChart        from '@/components/dashboard/BurnRateChart'
import CategoryBreakdown    from '@/components/dashboard/CategoryBreakdown'
import InsightCards         from '@/components/dashboard/InsightCards'
import UpcomingPayments     from '@/components/dashboard/UpcomingPayments'
import ApprovalQueue        from '@/components/dashboard/ApprovalQueue'
import AIChat               from '@/components/dashboard/AIChat'
import { mockOrg, mockApprovals } from '@/lib/mock-data'

export default function DashboardPage() {
  const [chatOpen, setChatOpen] = useState(false)
  const pendingCount = mockApprovals.filter(a => a.status === 'pending').length

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-y-auto min-w-0">

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-4 bg-background/80 backdrop-blur-sm border-b border-border/40">
          <div>
            <h1 className="text-base font-semibold text-text-primary">Dashboard</h1>
            <p className="text-xs text-text-muted">
              Good morning, {mockOrg.name.split(' ')[0]}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Approval badge */}
            {pendingCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-accent/10 border border-accent/20 text-xs font-medium text-accent cursor-pointer hover:bg-accent/15 transition-colors"
              >
                <Bell size={12} />
                {pendingCount} payment{pendingCount !== 1 ? 's' : ''} need approval
              </motion.div>
            )}

            {/* AI Chat button */}
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-aurora-card text-black text-xs font-semibold hover:brightness-105 active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #D9F060 0%, #F5EFA0 50%, #E8DDD0 100%)' }}
            >
              <MessageSquare size={12} />
              Ask HELM
            </button>
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="px-7 py-6 space-y-5 max-w-[1200px]">

          {/* Hero: total cash position */}
          <CashPositionHero />

          {/* Row 2: 3 KPI cards */}
          <KPICards />

          {/* Row 3: Burn chart (2/3) + Category breakdown (1/3) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <BurnRateChart />
            </div>
            <div className="col-span-1">
              <CategoryBreakdown />
            </div>
          </div>

          {/* Row 4: Insight cards — horizontal scroll */}
          <InsightCards />

          {/* Row 5: Upcoming payments (2/3) + Approval queue (1/3) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <UpcomingPayments />
            </div>
            <div className="col-span-1">
              <ApprovalQueue />
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-8" />
        </div>
      </div>

      {/* ── AI Chat sliding panel ── */}
      <AIChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
