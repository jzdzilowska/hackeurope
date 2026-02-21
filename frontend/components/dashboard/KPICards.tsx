'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Wallet, Receipt, FileText } from 'lucide-react'
import { cn, formatCurrency, runwayColor } from '@/lib/utils'
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
  const { runway, monthlyBurn, burnTrend, dueSoon, dueSoonCount } = kpis

  const runwayStatus = runway > 12 ? 'Healthy' : runway > 6 ? 'Watch' : 'Critical'
  const runwayStatusColor =
    runway > 12 ? 'text-success' : runway > 6 ? 'text-warning' : 'text-danger'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-3"
    >
      {/* ── Cash Reserves ── */}
      <motion.div
        variants={cardVariants}
        className="card p-5 group hover:border-border-focus transition-all duration-200 flex flex-col justify-between"
        style={{ minHeight: '170px' }}
      >
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border/70 flex-shrink-0"
            style={{ background: 'var(--overlay-subtle)' }}
          >
            <Wallet size={16} className="text-text-muted" />
          </div>
          <ArrowUpRight
            size={14}
            className="text-border group-hover:text-text-muted transition-colors mt-0.5"
          />
        </div>

        <div className="mt-4">
          <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-muted mb-2">
            Cash Reserves
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-4xl font-bold mono leading-none', runwayColor(runway))}>
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
              className={cn(
                'h-full rounded-full',
                runway > 12 ? 'bg-success' : runway > 6 ? 'bg-warning' : 'bg-danger'
              )}
            />
          </div>
          <p className={cn('text-2xs font-medium', runwayStatusColor)}>
            {runwayStatus}
            <span className="text-text-disabled font-normal ml-1">
              · at {formatCurrency(monthlyBurn, 'EUR', true)}/mo
            </span>
          </p>
        </div>
      </motion.div>

      {/* ── Monthly Costs ── */}
      <motion.div
        variants={cardVariants}
        className="card p-5 group hover:border-border-focus transition-all duration-200 flex flex-col justify-between"
        style={{ minHeight: '170px' }}
      >
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border/70 flex-shrink-0"
            style={{ background: 'var(--overlay-subtle)' }}
          >
            <Receipt size={16} className="text-text-muted" />
          </div>
          <ArrowUpRight
            size={14}
            className="text-border group-hover:text-text-muted transition-colors mt-0.5"
          />
        </div>

        <div className="mt-4">
          <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-muted mb-2">
            Monthly Costs
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold mono leading-none text-text-primary">
              {formatCurrency(monthlyBurn, 'EUR', true)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-border/40">
          {/* Sparkline bars */}
          <div className="flex items-end gap-0.5 h-5 mb-2">
            {[12400, 13100, 14200, 13800, 14100, 15230].map((v, i) => {
              const max = 16000
              const pct = (v / max) * 100
              const isLast = i === 5
              return (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.35, delay: 0.55 + i * 0.06, ease: 'easeOut' }}
                  className={cn('flex-1 rounded-sm origin-bottom', isLast ? 'bg-warning' : 'bg-surface-high')}
                  style={{ height: `${pct}%` }}
                />
              )
            })}
          </div>
          <p className={cn(
            'text-2xs font-medium',
            burnTrend > 15 ? 'text-danger' : burnTrend > 5 ? 'text-warning' : 'text-success'
          )}>
            ↑ {burnTrend.toFixed(1)}% MoM
            <span className="text-text-disabled font-normal ml-1">· 6-month trend</span>
          </p>
        </div>
      </motion.div>

      {/* ── Payables Due ── */}
      <motion.div
        variants={cardVariants}
        className="card p-5 group hover:border-border-focus transition-all duration-200 flex flex-col justify-between"
        style={{ minHeight: '170px' }}
      >
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border/70 flex-shrink-0"
            style={{ background: 'var(--overlay-subtle)' }}
          >
            <FileText size={16} className="text-text-muted" />
          </div>
          <span className="text-2xs font-medium px-2 py-0.5 rounded-pill border bg-accent/8 text-accent border-accent/20 mt-0.5">
            {dueSoonCount} pending
          </span>
        </div>

        <div className="mt-4">
          <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-muted mb-2">
            Payables Due
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold mono leading-none text-text-primary">
              {formatCurrency(dueSoon, 'EUR', true)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-border/40 space-y-1">
          {[
            { name: 'Häfele Hardware',   amount: 2100, days: 3  },
            { name: 'IKEA Industry',    amount: 120,  days: 8  },
            { name: 'Blum Hinges',      amount: 800,  days: 14 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-2xs text-text-muted truncate">{item.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-2xs text-text-disabled">in {item.days}d</span>
                <span className="text-2xs mono text-text-secondary">
                  {formatCurrency(item.amount, 'EUR', true)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
