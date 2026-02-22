'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, RefreshCw, ArrowUpRight, Building2 } from 'lucide-react'
import { formatCurrency, formatTimeAgo } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'

export default function CashPositionHero() {
  const { accounts: mockAccounts, kpis: mockKPIs } = useDashboard()
  const lastSynced = mockAccounts.reduce((latest, acc) =>
    new Date(acc.lastSynced) > new Date(latest) ? acc.lastSynced : latest,
    mockAccounts[0]?.lastSynced ?? new Date().toISOString()
  )

  // Deduplicate institutions and sum balances
  const institutionMap = new Map<string, { color: string; total: number; count: number }>()
  for (const acc of mockAccounts) {
    const existing = institutionMap.get(acc.institution)
    if (existing) {
      existing.total += acc.currentBalance
      existing.count += 1
    } else {
      institutionMap.set(acc.institution, { color: acc.institutionColor, total: acc.currentBalance, count: 1 })
    }
  }
  const institutions = [...institutionMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)

  return (
    <div
      className="relative overflow-hidden rounded-card border border-border/60 bg-surface h-full"
    >
      {/* Subtle overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--overlay-subtle)' }}
      />

      {/* Content */}
      <div className="relative z-10 p-7 flex flex-col h-full">
        {/* Top row: label + sync */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            <p className="text-2xs font-medium uppercase tracking-[0.14em] text-text-muted">
              Total cash position
            </p>
            {/* Live dot */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-2xs text-text-muted">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 14 }}
            >
              <RefreshCw size={10} />
            </motion.div>
            <span suppressHydrationWarning>Synced {formatTimeAgo(lastSynced)}</span>
          </div>
        </div>

        {/* Hero number */}
        <div className="flex items-end justify-between flex-1">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[3.6rem] leading-none font-bold tracking-tighter text-text-primary mono"
            >
              {formatCurrency(mockKPIs.totalCashPosition, 'EUR')}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28 }}
              className="flex items-center gap-1.5 mt-3 text-success text-sm font-medium"
            >
              <TrendingUp size={13} />
              <span>+7.2% vs last month</span>
            </motion.div>
          </div>

          {/* ArrowUpRight — routes to accounts page */}
          <Link href="/accounts">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="mb-1 p-2 rounded-lg border border-border/50 text-text-muted hover:text-text-primary hover:border-border-focus transition-all cursor-pointer"
            >
              <ArrowUpRight size={16} />
            </motion.div>
          </Link>
        </div>

        {/* Compact account summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="flex items-center gap-3 mt-6 pt-5 border-t border-border/30"
        >
          <Building2 size={12} className="text-text-disabled flex-shrink-0" />
          {institutions.map(([name, inst], i) => (
            <div key={name} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-disabled">·</span>}
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: inst.color }} />
              <span className="text-2xs text-text-muted">{name}</span>
              <span className="text-2xs font-semibold mono text-text-secondary">
                {formatCurrency(inst.total, 'EUR', true)}
              </span>
            </div>
          ))}
          {institutionMap.size > 3 && (
            <Link href="/accounts" className="text-2xs text-text-disabled hover:text-text-muted transition-colors ml-auto">
              +{institutionMap.size - 3} more →
            </Link>
          )}
          {institutionMap.size <= 3 && (
            <Link href="/accounts" className="text-2xs text-text-disabled hover:text-text-muted transition-colors ml-auto">
              {mockAccounts.length} accounts →
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  )
}
