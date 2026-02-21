'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
}

export default function KPICards() {
  const { kpis } = useDashboard()
  const { runway, monthlyBurn, dueSoon, dueSoonCount } = kpis

  const runwayStatus = runway > 12 ? 'Healthy' : runway > 6 ? 'Watch' : 'Critical'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3"
    >
      {/* ── Cash Runway (CR) ── */}
      <motion.div
        variants={cardVariants}
        className="card p-5 group hover:border-border-focus transition-all duration-200 flex flex-col justify-between"
        style={{ minHeight: '170px' }}
      >
        <div className="flex items-start justify-between">
          {/* Letter abbreviation box — Dwarf-style */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border/70 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="text-[11px] font-bold mono tracking-tight text-text-muted">CR</span>
          </div>
          <ArrowUpRight
            size={14}
            className="text-border group-hover:text-text-muted transition-colors mt-0.5"
          />
        </div>

        <div className="mt-4">
          <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-muted mb-2">
            Cash Runway
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold mono leading-none text-text-primary">
              {runway.toFixed(1)}
            </span>
            <span className="text-sm text-text-muted">mo</span>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-border/40">
          {/* Progress bar */}
          <div className="h-0.5 rounded-full bg-surface-raised overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((runway / 24) * 100, 100)}%` }}
              transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-text-secondary"
            />
          </div>
          <p className="text-2xs font-medium text-text-secondary">
            {runwayStatus}
            <span className="text-text-disabled font-normal ml-1">
              · at {formatCurrency(monthlyBurn, 'USD', true)}/mo
            </span>
          </p>
        </div>
      </motion.div>

      {/* ── Due Soon (DS) ── */}
      <motion.div
        variants={cardVariants}
        className="card p-5 group hover:border-border-focus transition-all duration-200 flex flex-col justify-between"
        style={{ minHeight: '170px' }}
      >
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border/70 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="text-[11px] font-bold mono tracking-tight text-text-muted">DS</span>
          </div>
          <span className="text-2xs font-medium px-2 py-0.5 rounded-pill border bg-accent/8 text-accent border-accent/20 mt-0.5">
            {dueSoonCount} pending
          </span>
        </div>

        <div className="mt-4">
          <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-muted mb-2">
            Due in 14 days
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold mono leading-none text-text-primary">
              {formatCurrency(dueSoon, 'USD', true)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-border/40 space-y-1">
          {[
            { name: 'AWS',              amount: 2100, days: 3  },
            { name: 'Google Workspace', amount: 120,  days: 8  },
            { name: 'WeWork',           amount: 800,  days: 14 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-2xs text-text-muted truncate">{item.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-2xs text-text-disabled">in {item.days}d</span>
                <span className="text-2xs mono text-text-secondary">
                  {formatCurrency(item.amount, 'USD', true)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
