'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useAnimationFrame } from 'framer-motion'
import { TrendingUp, RefreshCw, ArrowUpRight, Building2 } from 'lucide-react'
import { formatCurrency, formatTimeAgo } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'

export default function CashPositionHero() {
  const { accounts: mockAccounts, kpis: mockKPIs } = useDashboard()
  const lastSynced = mockAccounts.reduce((latest, acc) =>
    new Date(acc.lastSynced) > new Date(latest) ? acc.lastSynced : latest,
    mockAccounts[0]?.lastSynced ?? new Date().toISOString()
  )

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

  // ── Mouse tracking ──────────────────────────────────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0.5)   // 0–1 relative to card
  const mouseY = useMotionValue(0.5)
  const springX = useSpring(mouseX, { stiffness: 55, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 55, damping: 20 })

  // Per-orb MotionValues — driven every frame
  const orb1x = useMotionValue(0)
  const orb1y = useMotionValue(0)
  const orb2x = useMotionValue(0)
  const orb2y = useMotionValue(0)

  // Combine slow drift + mouse parallax in a single rAF loop
  useAnimationFrame((t) => {
    const s = t / 1000
    // Drift (px) — different periods so they never sync up
    const d1x = Math.sin(s * Math.PI * 2 / 18) * 28
    const d1y = Math.cos(s * Math.PI * 2 / 14) * 18
    const d2x = Math.sin(s * Math.PI * 2 / 22 + Math.PI) * 22
    const d2y = Math.cos(s * Math.PI * 2 / 17 + Math.PI) * 16
    // Mouse offset (px) — orbs move in opposite directions for depth
    const mx = (springX.get() - 0.5) * 52
    const my = (springY.get() - 0.5) * 52
    orb1x.set(d1x + mx)
    orb1y.set(d1y + my)
    orb2x.set(d2x - mx * 0.75)
    orb2y.set(d2y - my * 0.75)
  })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }
  const handleMouseLeave = () => { mouseX.set(0.5); mouseY.set(0.5) }

  return (
    <div
      ref={cardRef}
      className="cash-card-grain rounded-card h-full"
      style={{ border: '1px solid var(--cc-btn-bd)' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Orb 1 — top-right */}
      <motion.div className="cash-card-orb-1-visual" style={{ x: orb1x, y: orb1y }} />
      {/* Orb 2 — bottom-left */}
      <motion.div className="cash-card-orb-2-visual" style={{ x: orb2x, y: orb2y }} />

      <div className="relative z-[2] p-7 flex flex-col h-full">

        {/* Top row: label + sync */}
        <div className="flex items-start justify-between mb-7">
          <div className="flex items-center gap-2">
            <p className="text-2xs font-medium uppercase tracking-[0.16em]"
               style={{ color: 'var(--cc-c3)' }}>
              Total cash position
            </p>
            {/* Live dot */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                    style={{ backgroundColor: 'var(--cc-dot)' }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ backgroundColor: 'var(--cc-dot)' }} />
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-2xs"
               style={{ color: 'var(--cc-c4)' }}>
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
              className="text-[3.6rem] leading-none font-bold tracking-tighter mono"
              style={{ color: 'var(--cc-c1)' }}
            >
              {formatCurrency(mockKPIs.totalCashPosition, 'EUR')}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28 }}
              className="flex items-center gap-1.5 mt-3 text-sm font-medium"
              style={{ color: 'var(--cc-c4)' }}
            >
              <TrendingUp size={13} />
              <span>+7.2% vs last month</span>
            </motion.div>
          </div>

          {/* Link to accounts page */}
          <Link href="/accounts">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="mb-1 p-2 rounded-lg transition-all cursor-pointer"
              style={{
                border: '1px solid var(--cc-btn-bd)',
                color: 'var(--cc-c4)',
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
          style={{ borderTop: '1px solid var(--cc-bd)' }}
        >
          <Building2 size={12} style={{ color: 'var(--cc-c5)' }} className="flex-shrink-0" />
          {institutions.map(([name, inst], i) => (
            <div key={name} className="flex items-center gap-1.5">
              {i > 0 && <span style={{ color: 'var(--cc-c6)' }}>·</span>}
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: inst.color }} />
              <span className="text-2xs" style={{ color: 'var(--cc-c4)' }}>{name}</span>
              <span className="text-2xs font-semibold mono" style={{ color: 'var(--cc-c2)' }}>
                {formatCurrency(inst.total, 'EUR', true)}
              </span>
            </div>
          ))}
          {institutionMap.size > 3 && (
            <Link href="/accounts" className="text-2xs ml-auto transition-colors"
                  style={{ color: 'var(--cc-c5)' }}>
              +{institutionMap.size - 3} more →
            </Link>
          )}
          {institutionMap.size <= 3 && (
            <Link href="/accounts" className="text-2xs ml-auto transition-colors"
                  style={{ color: 'var(--cc-c5)' }}>
              {mockAccounts.length} accounts →
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  )
}
