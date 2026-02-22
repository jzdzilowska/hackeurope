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
    <div className="cash-card-grain rounded-card h-full">
      {/* Content sits above the grain pseudo-element (z-index: 2) */}
      <div className="relative z-[2] p-7 flex flex-col h-full">
        {/* Top row: label + sync */}
        <div className="flex items-start justify-between mb-7">
          <div className="flex items-center gap-2">
            <p className="text-2xs font-medium uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Total cash position
            </p>
            {/* Live dot */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }} />
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-2xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 14 }}
            >
              <RefreshCw size={10} />
            </motion.div>
            <span>Synced {formatTimeAgo(lastSynced)}</span>
          </div>
        </div>

        {/* Hero number */}
        <div className="flex items-end justify-between flex-1">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[3.6rem] leading-none font-bold tracking-tighter mono"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              {formatCurrency(mockKPIs.totalCashPosition, 'EUR')}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28 }}
              className="flex items-center gap-1.5 mt-3 text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.55)' }}
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
              className="mb-1 p-2 rounded-lg transition-all cursor-pointer"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.35)',
              }}
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
          className="flex items-center gap-3 mt-6 pt-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Building2 size={12} style={{ color: 'rgba(255,255,255,0.22)' }} className="flex-shrink-0" />
          {institutions.map(([name, inst], i) => (
            <div key={name} className="flex items-center gap-1.5">
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>}
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: inst.color }} />
              <span className="text-2xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{name}</span>
              <span className="text-2xs font-semibold mono" style={{ color: 'rgba(255,255,255,0.62)' }}>
                {formatCurrency(inst.total, 'EUR', true)}
              </span>
            </div>
          ))}
          {institutionMap.size > 3 && (
            <Link href="/accounts" className="text-2xs ml-auto transition-colors" style={{ color: 'rgba(255,255,255,0.22)' }}>
              +{institutionMap.size - 3} more →
            </Link>
          )}
          {institutionMap.size <= 3 && (
            <Link href="/accounts" className="text-2xs ml-auto transition-colors" style={{ color: 'rgba(255,255,255,0.22)' }}>
              {mockAccounts.length} accounts →
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  )
}
