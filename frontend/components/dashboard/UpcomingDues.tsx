'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToggleRight, ToggleLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { mockRecurring } from '@/lib/mock-data'
import type { RecurringPayment } from '@/lib/types'

// ── Urgency helpers ──────────────────────────────────────────────────────────
type Urgency = 'overdue' | 'today' | 'soon' | 'upcoming'

function getUrgency(dateStr: string): Urgency {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr); due.setHours(0, 0, 0, 0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)   return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7)  return 'soon'
  return 'upcoming'
}

function getDueDiff(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

function formatDueLabel(dateStr: string): string {
  const diff = getDueDiff(dateStr)
  if (diff < 0)   return `Overdue · ${Math.abs(diff)}d`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff <= 7)  return `Due in ${diff}d`
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

const URGENCY_STRIPE: Record<Urgency, string> = {
  overdue:  '#B85858',
  today:    '#C49040',
  soon:     'rgba(255,255,255,0.55)',
  upcoming: 'rgba(255,255,255,0.18)',
}
const URGENCY_TEXT: Record<Urgency, string> = {
  overdue:  '#B85858',
  today:    '#C49040',
  soon:     'rgba(255,255,255,0.50)',
  upcoming: 'rgba(255,255,255,0.28)',
}

type Filter = 'all' | 'soon' | 'upcoming'

// ── Row ──────────────────────────────────────────────────────────────────────
function DueRow({ r, index }: { r: RecurringPayment; index: number }) {
  const urgency = getUrgency(r.nextExpectedDate)

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="flex items-center gap-3 py-2.5"
    >
      {/* Urgency stripe */}
      <div
        className="w-[3px] h-7 rounded-full flex-shrink-0"
        style={{ background: URGENCY_STRIPE[urgency] }}
      />

      {/* Logo tile — white bg so dark logos (GitHub, Notion…) are visible */}
      <div
        className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.80)' }}
      >
        {r.merchantLogoUrl ? (
          <img
            src={r.merchantLogoUrl}
            alt={r.merchantName}
            className="w-[18px] h-[18px] object-contain"
            onError={e => {
              e.currentTarget.style.display = 'none'
              const fb = e.currentTarget.nextElementSibling as HTMLElement | null
              if (fb) fb.style.display = 'flex'
            }}
          />
        ) : null}
        <span
          className="text-[10px] font-bold text-[#333]"
          style={{ display: r.merchantLogoUrl ? 'none' : 'flex' }}
        >
          {r.merchantName.charAt(0)}
        </span>
      </div>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate leading-tight">
          {r.merchantName}
        </p>
        <p className="text-2xs text-text-disabled leading-tight mt-0.5">
          {r.helmCategory} · {r.frequency}
        </p>
      </div>

      {/* Auto-pay indicator */}
      <div className="flex-shrink-0">
        {r.autoPayEnabled
          ? <ToggleRight size={14} className="text-text-secondary" />
          : <ToggleLeft  size={14} className="text-text-disabled" />}
      </div>

      {/* Amount + due label */}
      <div className="text-right flex-shrink-0 min-w-[80px]">
        <p className="text-xs font-semibold mono text-text-primary">
          {formatCurrency(r.averageAmount, r.currency, true)}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: URGENCY_TEXT[urgency] }}>
          {formatDueLabel(r.nextExpectedDate)}
        </p>
      </div>
    </motion.div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function UpcomingDues() {
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = [...mockRecurring].sort(
    (a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime()
  )

  const filtered = sorted.filter(r => {
    const urg = getUrgency(r.nextExpectedDate)
    if (filter === 'soon')     return urg === 'overdue' || urg === 'today' || urg === 'soon'
    if (filter === 'upcoming') return urg === 'upcoming'
    return true
  })

  const urgentCount = sorted.filter(r => {
    const u = getUrgency(r.nextExpectedDate)
    return u === 'overdue' || u === 'today'
  }).length

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'soon',     label: 'Due soon' },
    { key: 'upcoming', label: 'Upcoming' },
  ]

  return (
    <div
      className="rounded-card border border-border/60 overflow-hidden"
      style={{ background: '#111111' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-text-disabled mb-1">
              PAYMENTS
            </p>
            <h3 className="text-base font-bold text-text-primary tracking-tight">
              Upcoming Dues
            </h3>
          </div>

          {urgentCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[10px] font-semibold"
              style={{
                background: 'rgba(184,88,88,0.12)',
                color: '#B85858',
                border: '1px solid rgba(184,88,88,0.25)',
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-50" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger" />
              </span>
              {urgentCount} need attention
            </motion.div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="px-3 py-1.5 rounded-lg text-2xs font-medium transition-all duration-150"
              style={{
                background: filter === t.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filter === t.key ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-5" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* List */}
      <div className="px-5 pb-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((r, i) => (
            <div key={r.id}>
              <DueRow r={r} index={i} />
              {i < filtered.length - 1 && (
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
