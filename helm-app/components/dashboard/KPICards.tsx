'use client'

import { motion } from 'framer-motion'
import { Clock, Flame, Calendar } from 'lucide-react'
import { cn, formatCurrency, runwayColor } from '@/lib/utils'
import { mockKPIs } from '@/lib/mock-data'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function KPICards() {
  const { runway, monthlyBurn, burnTrend, dueSoon, dueSoonCount } = mockKPIs

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-3"
    >
      {/* ── Runway ── */}
      <motion.div variants={cardVariants} className="card p-5 group hover:border-border-focus transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-surface-raised border border-border/60">
            <Clock size={14} className="text-text-muted" />
          </div>
          <span className={cn(
            'text-2xs font-medium px-2 py-0.5 rounded-pill border',
            runway > 12 ? 'bg-success/10 text-success border-success/20'
            : runway > 6  ? 'bg-warning/10 text-warning border-warning/20'
                          : 'bg-danger/10 text-danger border-danger/20'
          )}>
            {runway > 12 ? 'Healthy' : runway > 6 ? 'Watch' : 'Critical'}
          </span>
        </div>

        <div>
          <p className="label mb-1.5">Runway</p>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-3xl font-bold mono', runwayColor(runway))}>
              {runway.toFixed(1)}
            </span>
            <span className="text-sm text-text-muted">months</span>
          </div>

          {/* Mini progress bar */}
          <div className="mt-3 h-1 rounded-full bg-surface-raised overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((runway / 24) * 100, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                runway > 12 ? 'bg-success' : runway > 6 ? 'bg-warning' : 'bg-danger'
              )}
            />
          </div>
          <p className="text-2xs text-text-muted mt-2">
            at {formatCurrency(monthlyBurn, 'EUR', true)}/mo burn
          </p>
        </div>
      </motion.div>

      {/* ── Burn Rate ── */}
      <motion.div variants={cardVariants} className="card p-5 group hover:border-border-focus transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-surface-raised border border-border/60">
            <Flame size={14} className="text-text-muted" />
          </div>
          <span className={cn(
            'text-2xs font-medium px-2 py-0.5 rounded-pill border',
            burnTrend > 15 ? 'bg-danger/10 text-danger border-danger/20'
            : burnTrend > 5  ? 'bg-warning/10 text-warning border-warning/20'
                             : 'bg-success/10 text-success border-success/20'
          )}>
            ↑ {burnTrend.toFixed(1)}% MoM
          </span>
        </div>

        <div>
          <p className="label mb-1.5">Monthly Burn</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold mono text-text-primary">
              {formatCurrency(monthlyBurn, 'EUR', true)}
            </span>
          </div>

          {/* Sparkline-style mini bar chart */}
          <div className="mt-3 flex items-end gap-0.5 h-6">
            {[12400, 13100, 14200, 13800, 14100, 15230].map((v, i) => {
              const max = 16000
              const pct = (v / max) * 100
              const isLast = i === 5
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.06, ease: 'easeOut' }}
                  className={cn(
                    'flex-1 rounded-sm',
                    isLast ? 'bg-warning' : 'bg-surface-high'
                  )}
                />
              )
            })}
          </div>
          <p className="text-2xs text-text-muted mt-2">6-month trend</p>
        </div>
      </motion.div>

      {/* ── Due Soon ── */}
      <motion.div variants={cardVariants} className="card p-5 group hover:border-border-focus transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-surface-raised border border-border/60">
            <Calendar size={14} className="text-text-muted" />
          </div>
          <span className="text-2xs font-medium px-2 py-0.5 rounded-pill border bg-accent/10 text-accent border-accent/20">
            {dueSoonCount} pending
          </span>
        </div>

        <div>
          <p className="label mb-1.5">Due in 14 days</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold mono text-text-primary">
              {formatCurrency(dueSoon, 'EUR', true)}
            </span>
          </div>

          {/* Individual due items */}
          <div className="mt-3 space-y-1">
            {[
              { name: 'AWS',             amount: 2100, days: 3 },
              { name: 'Google Workspace', amount: 120,  days: 8 },
              { name: 'WeWork',           amount: 800,  days: 14 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-2xs text-text-muted truncate">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-text-disabled">in {item.days}d</span>
                  <span className="text-2xs mono text-text-secondary">
                    {formatCurrency(item.amount, 'EUR', true)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
