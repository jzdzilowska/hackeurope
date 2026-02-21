'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency, formatTimeAgo } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'

// ── Period-end projection (mock) ────────────────────────────────────────────
// Receivables = what your customers owe you this month
// Payables    = invoices you owe suppliers (≈ monthly burn)
const PERIOD = {
  receivables: 23000,
  payables:    15230,
}

// Grain texture — coarser baseFrequency than the body grain so it reads as a
// distinct, close-up texture on the card surface
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23g)'/%3E%3C/svg%3E")`

// ── Sub-component: horizontal bar row ───────────────────────────────────────
function PeriodBar({
  label,
  value,
  max,
  color,
  prefix,
  delay = 0,
}: {
  label:   string
  value:   number
  max:     number
  color:   string
  prefix?: string
  delay?:  number
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-text-muted">{label}</span>
        <span className="text-2xs mono text-text-secondary">
          {prefix}{formatCurrency(value, 'USD', true)}
        </span>
      </div>
      <div className="h-[3px] rounded-full bg-surface-raised overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.75, delay, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CashPositionHero() {
  const { accounts, kpis } = useDashboard()
  const router = useRouter()

  const lastSynced = accounts.length > 0
    ? accounts.reduce((latest, acc) =>
        new Date(acc.lastSynced) > new Date(latest) ? acc.lastSynced : latest,
        accounts[0].lastSynced
      )
    : new Date().toISOString()

  const projected = kpis.totalCashPosition + PERIOD.receivables - PERIOD.payables
  // Scale: give a little headroom above the largest bar
  const max = Math.max(kpis.totalCashPosition, projected, PERIOD.receivables) * 1.12

  return (
    <div
      onClick={() => router.push('/accounts')}
      className="relative overflow-hidden rounded-card border border-border/60 cursor-pointer group"
      style={{ minHeight: '200px', background: '#111111' }}
    >
      {/* ── Grain blob — LEFT ───────────────────────────────────────────── */}
      {/* Oversized, anchored left — always clipped by overflow-hidden so its
          far edge is never visible. Radial mask gives soft organic falloff.
          No scale: that caused the inner-border artifact. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          left: '-20%', top: '-40%',
          width: '60%', height: '180%',
          backgroundImage: GRAIN,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 150px',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 35% 50%, black 10%, transparent 75%)',
          maskImage:        'radial-gradient(ellipse 75% 65% at 35% 50%, black 10%, transparent 75%)',
        }}
        animate={{
          opacity: [0.20, 0.34, 0.20],
          x:       ['0%', '14%', '0%'],
          y:       ['0%', '9%',  '0%'],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Grain blob — RIGHT ──────────────────────────────────────────── */}
      {/* Same principle, anchored right, opposite phase + different tile size */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          right: '-20%', top: '-40%',
          width: '58%', height: '180%',
          backgroundImage: GRAIN,
          backgroundRepeat: 'repeat',
          backgroundSize: '120px 120px',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 65% 50%, black 10%, transparent 75%)',
          maskImage:        'radial-gradient(ellipse 75% 65% at 65% 50%, black 10%, transparent 75%)',
        }}
        animate={{
          opacity: [0.14, 0.26, 0.14],
          x:       ['0%', '-12%', '0%'],
          y:       ['0%', '-10%', '0%'],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />

      {/* ── Hover veil ─────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 rounded-card opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'rgba(255,255,255,0.016)' }}
      />

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 p-7 flex gap-8 items-stretch">

        {/* Left: hero cash number */}
        <div className="flex-1 flex flex-col">

          {/* Label row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2">
              <p className="text-2xs font-medium uppercase tracking-[0.14em] text-text-muted">
                Total cash position
              </p>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
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

          {/* Big number */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-[3.6rem] leading-none font-bold tracking-tighter text-text-primary mono"
          >
            {formatCurrency(kpis.totalCashPosition, 'USD')}
          </motion.h1>

          {/* Trend */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="flex items-center gap-1.5 mt-3 text-success text-sm font-medium"
          >
            <TrendingUp size={13} />
            <span>+7.2% vs last month</span>
          </motion.div>

          {/* Subtle prompt */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xs text-text-disabled mt-auto pt-5"
          >
            {accounts.length} accounts · click to view all
          </motion.p>
        </div>

        {/* Divider */}
        <div className="w-px bg-border/30 self-stretch" />

        {/* Right: Period outlook */}
        <div className="w-52 flex flex-col">
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted mb-5">
            Period outlook
          </p>

          <div className="flex flex-col gap-3 flex-1 justify-center">
            <PeriodBar
              label="Current balance"
              value={kpis.totalCashPosition}
              max={max}
              color="rgba(255,255,255,0.28)"
              delay={0.30}
            />
            <PeriodBar
              label="+ Customer receivables"
              value={PERIOD.receivables}
              max={max}
              color="#3DBF7A"
              prefix="+"
              delay={0.44}
            />
            <PeriodBar
              label="− Supplier invoices"
              value={PERIOD.payables}
              max={max}
              color="#B85858"
              prefix="−"
              delay={0.58}
            />
          </div>

          {/* Projected result */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-4 pt-3.5 border-t border-border/30 flex items-center justify-between"
          >
            <span className="text-2xs text-text-muted">Est. end-of-period</span>
            <span className="text-sm font-bold mono text-text-primary">
              {formatCurrency(projected, 'USD', true)}
            </span>
          </motion.div>
        </div>

      </div>
    </div>
  )
}
