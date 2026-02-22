'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Bell, ArrowUpRight, Mic, RefreshCw } from 'lucide-react'
import Link                 from 'next/link'
import Sidebar              from '@/components/layout/Sidebar'
import CashPositionHero     from '@/components/dashboard/CashPositionHero'
import CashflowChart        from '@/components/dashboard/CashflowChart'
import RecurringCosts       from '@/components/dashboard/RecurringCosts'
import RestockForecast      from '@/components/dashboard/RestockForecast'
import SurplusChart         from '@/components/dashboard/SurplusChart'
import UpcomingPayments     from '@/components/dashboard/UpcomingPayments'
import ApprovalQueue        from '@/components/dashboard/ApprovalQueue'
import AIChat               from '@/components/dashboard/AIChat'
import VoiceBriefing        from '@/components/dashboard/VoiceBriefing'
import VoiceAgent           from '@/components/dashboard/VoiceAgent'
import InvoiceToast         from '@/components/ui/InvoiceToast'
import { useDashboard }     from '@/lib/dashboard-context'

// Computes a human-readable "just now / Xs ago / Xm ago" label,
// re-evaluated every second so it stays fresh without a page reload.
function useSyncLabel(lastSynced: Date | null): string {
  const [label, setLabel] = useState('syncing…')

  useEffect(() => {
    const compute = () => {
      if (!lastSynced) { setLabel('syncing…'); return }
      const diff = Math.floor((Date.now() - lastSynced.getTime()) / 1000)
      if (diff < 8)        setLabel('just now')
      else if (diff < 60)  setLabel(`${diff}s ago`)
      else                 setLabel(`${Math.floor(diff / 60)}m ago`)
    }
    compute()
    const id = setInterval(compute, 1000)
    return () => clearInterval(id)
  }, [lastSynced])

  return label
}

// ── Editorial section header ─────────────────────────────────────────────────
function SectionHeader({
  tag,
  title,
  action,
  href,
}: {
  tag: string
  title: string
  action?: string
  href?: string
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-disabled mb-1">
          {tag}
        </p>
        <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-1.5">
          {href ? (
            <Link href={href} className="flex items-center gap-1.5 hover:text-accent transition-colors">
              {title}
              <ArrowUpRight size={16} className="text-text-muted opacity-50" />
            </Link>
          ) : (
            title
          )}
        </h2>
      </div>
      {action && href && (
        <Link href={href} className="text-2xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
          {action} <ArrowUpRight size={10} />
        </Link>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const {
    org,
    accounts,
    approvals,
    newInvoiceAlert,
    clearInvoiceAlert,
    fireToast,
    refresh,
    lastSynced,
  } = useDashboard()

  const [chatOpen, setChatOpen]             = useState(false)
  const [voiceAgentOpen, setVoiceAgentOpen] = useState(false)
  const [voiceAutoGreet, setVoiceAutoGreet] = useState(false)
  const syncLabel = useSyncLabel(lastSynced)
  const pendingCount = approvals.filter(a => a.status === 'pending').length

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-y-auto min-w-0 relative">

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-surface/50 backdrop-blur-xl border-b border-border/20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled mb-0.5">
              {org.name}
            </p>
            <h1 className="text-base font-bold text-text-primary tracking-tight">Overview</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Approval badge — count updates live as invoices arrive */}
            {pendingCount > 0 && (
              <motion.div
                key={pendingCount}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium text-text-secondary cursor-pointer transition-all"
              >
                <Bell size={11} className="text-text-muted" />
                {pendingCount} need approval
              </motion.div>
            )}

            {/* Ask Runwave (text chat) */}
            <button
              onClick={() => setChatOpen(true)}
              className="glass-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-text-primary text-xs font-semibold active:scale-[0.97] transition-all"
            >
              <MessageSquare size={11} className="text-text-muted" />
              Ask Runwave
            </button>

            {/* Voice briefing */}
            <VoiceBriefing onBriefingEnd={() => {
              setVoiceAutoGreet(true)
              setVoiceAgentOpen(true)
            }} />

            {/* Voice chat */}
            <button
              onClick={() => { setVoiceAutoGreet(false); setVoiceAgentOpen(true) }}
              className="glass-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-text-primary text-xs font-semibold active:scale-[0.97] transition-all"
            >
              <Mic size={11} className="text-text-muted" />
              Chat
            </button>
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="px-8 pt-7 pb-10 space-y-8 max-w-[1200px]">

          {/* Section 1: Cash position + recurring costs */}
          <div>
            <SectionHeader tag="FINANCIAL" title="Cash Position" />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <CashPositionHero />
              </div>
              <div className="col-span-1">
                <RecurringCosts />
              </div>
            </div>
          </div>

          {/* Section 2: Analytics grid — cashflow, restock, surplus */}
          <div>
            <SectionHeader tag="ANALYTICS" title="Financial Intelligence" />
            <div className="grid grid-cols-3 gap-4 grid-rows-[auto_auto]">
              {/* Row 1: Cashflow (wide) + Restock (narrow) — matched height */}
              <div className="col-span-2 [&>*]:h-full">
                <CashflowChart />
              </div>
              <div className="col-span-1 [&>*]:h-full">
                <RestockForecast />
              </div>
              {/* Row 2: Surplus (full width) */}
              <div className="col-span-3">
                <SurplusChart />
              </div>
            </div>
          </div>

          {/* Section 3: Payments + approvals */}
          <div>
            <SectionHeader tag="PAYMENTS" title="Upcoming & Approvals" action="All payments" href="/payments" />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <UpcomingPayments />
              </div>
              <div className="col-span-1 min-w-0 overflow-hidden">
                <ApprovalQueue />
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>

        {/* ── Live status widget ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="fixed bottom-5 left-[226px] z-30"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 backdrop-blur-md bg-surface/90">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-2xs text-text-secondary font-medium">
              {accounts.length} accounts live
            </span>
            <span className="text-2xs text-text-disabled">·</span>
            <motion.span
              key={syncLabel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xs text-text-disabled"
            >
              {syncLabel}
            </motion.span>
            <button
              onClick={refresh}
              className="text-text-disabled hover:text-accent transition-colors ml-1"
              title="Refresh"
            >
              <RefreshCw size={11} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── AI Chat sliding panel ── */}
      <AIChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* ── Voice agent ── */}
      <VoiceAgent
        open={voiceAgentOpen}
        onClose={() => setVoiceAgentOpen(false)}
        autoGreet={voiceAutoGreet}
      />

      {/* ── Live invoice toast — bottom right ── */}
      <InvoiceToast invoice={newInvoiceAlert} onDismiss={clearInvoiceAlert} />
    </div>
  )
}
