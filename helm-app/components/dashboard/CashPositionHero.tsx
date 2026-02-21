'use client'

import { motion } from 'framer-motion'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency, formatTimeAgo } from '@/lib/utils'
import { mockKPIs, mockAccounts } from '@/lib/mock-data'

export default function CashPositionHero() {
  const lastSynced = mockAccounts.reduce((latest, acc) =>
    new Date(acc.lastSynced) > new Date(latest) ? acc.lastSynced : latest,
    mockAccounts[0].lastSynced
  )

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface border border-border/50 p-7"
         style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)' }}>

      {/* Aurora glow — positioned at top of card */}
      <div className="pointer-events-none absolute inset-0"
           style={{
             background: 'radial-gradient(ellipse 90% 70% at 50% -20%, rgba(201,230,81,0.22) 0%, rgba(201,230,81,0.08) 40%, transparent 70%)',
           }}
      />

      {/* Subtle grid texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
           style={{
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
             backgroundSize: '40px 40px',
           }}
      />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="label mb-1.5">Total cash position</p>
            <div className="flex items-baseline gap-3">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-5xl font-bold tracking-tight text-text-primary mono"
              >
                {formatCurrency(mockKPIs.totalCashPosition, 'EUR')}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-center gap-1 text-success text-sm font-medium"
              >
                <TrendingUp size={14} />
                <span>+7.2% vs last month</span>
              </motion.div>
            </div>
          </div>

          {/* Sync indicator */}
          <div className="flex items-center gap-2 text-2xs text-text-muted">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 12 }}
            >
              <RefreshCw size={11} />
            </motion.div>
            <span>Synced {formatTimeAgo(lastSynced)}</span>
          </div>
        </div>

        {/* Account breakdown pills */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 flex-wrap"
        >
          {mockAccounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-surface-raised border border-border/60 hover:border-border-focus transition-colors cursor-default"
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: acc.institutionColor }} />
              <span className="text-xs text-text-secondary">{acc.institution}</span>
              <span className="text-xs font-medium mono text-text-primary">
                {formatCurrency(acc.currentBalance, acc.currency, true)}
              </span>
            </motion.div>
          ))}

          {/* Live dot */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="text-2xs text-text-muted">Live</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
