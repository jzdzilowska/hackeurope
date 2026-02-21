'use client'

import { motion } from 'framer-motion'
import { TrendingUp, RefreshCw, ArrowUpRight } from 'lucide-react'
import { formatCurrency, formatTimeAgo } from '@/lib/utils'
import { mockKPIs, mockAccounts } from '@/lib/mock-data'

export default function CashPositionHero() {
  const lastSynced = mockAccounts.reduce((latest, acc) =>
    new Date(acc.lastSynced) > new Date(latest) ? acc.lastSynced : latest,
    mockAccounts[0].lastSynced
  )

  return (
    <div
      className="relative overflow-hidden rounded-card border border-border/60"
      style={{ minHeight: '200px', background: '#0A0C14' }}
    >
      {/* Deep atmospheric bloom — top-right, like reference Image 1 */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '-60px', right: '-60px',
          width: '380px', height: '320px',
          background: 'radial-gradient(ellipse at center, rgba(42,105,72,0.55) 0%, rgba(28,75,52,0.25) 40%, transparent 72%)',
          filter: 'blur(52px)',
        }}
      />
      {/* Secondary cool bloom — lower-left */}
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: '-40px', left: '0px',
          width: '240px', height: '200px',
          background: 'radial-gradient(ellipse at center, rgba(22,55,80,0.30) 0%, transparent 70%)',
          filter: 'blur(36px)',
        }}
      />

      {/* Frosted inner texture layer — mimics blurred image under text (ref Image 2) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            linear-gradient(125deg,
              rgba(38,95,65,0.12) 0%,
              rgba(18,28,48,0.04) 35%,
              rgba(8,10,18,0.0) 60%,
              rgba(22,40,60,0.08) 100%
            )
          `,
        }}
      />

      {/* Very subtle dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-7">
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
            <span>Synced {formatTimeAgo(lastSynced)}</span>
          </div>
        </div>

        {/* Hero number */}
        <div className="flex items-end justify-between">
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

          {/* ArrowUpRight — editorial ↗ CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mb-1 p-2 rounded-lg border border-border/50 text-text-muted hover:text-text-primary hover:border-border-focus transition-all cursor-pointer"
          >
            <ArrowUpRight size={16} />
          </motion.div>
        </div>

        {/* Account breakdown strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="flex items-center gap-2 flex-wrap mt-6 pt-5 border-t border-border/30"
        >
          {mockAccounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.45 + i * 0.07 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/50 bg-white/[0.025] hover:bg-white/[0.04] hover:border-border-focus transition-all cursor-default"
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: acc.institutionColor }} />
              <span className="text-2xs text-text-muted">{acc.institution}</span>
              <span className="text-2xs font-semibold mono text-text-secondary">
                {formatCurrency(acc.currentBalance, acc.currency, true)}
              </span>
            </motion.div>
          ))}

          <span className="text-2xs text-text-disabled ml-auto">
            {mockAccounts.length} institutions
          </span>
        </motion.div>
      </div>
    </div>
  )
}
