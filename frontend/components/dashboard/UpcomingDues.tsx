'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockUpcomingDues } from '@/lib/mock-data'
import type { UpcomingDue } from '@/lib/types'

// ── Urgency helpers ──────────────────────────────────────────────────────────
type Urgency = 'overdue' | 'today' | 'soon' | 'upcoming'

function getUrgency(dueDate: string): Urgency {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)   return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7)  return 'soon'
  return 'upcoming'
}

function getDiffDays(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

function formatDueLabel(dueDate: string): string {
  const diff = getDiffDays(dueDate)
  if (diff < 0)   return `Overdue · ${Math.abs(diff)}d`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff <= 7)  return `Due in ${diff}d`
  // further out — short date
  return new Date(dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

const URGENCY_COLOR: Record<Urgency, string> = {
  overdue:  '#B85858',
  today:    '#C49040',
  soon:     'rgba(255,255,255,0.65)',
  upcoming: 'rgba(255,255,255,0.22)',
}

const URGENCY_LABEL_COLOR: Record<Urgency, string> = {
  overdue:  '#B85858',
  today:    '#C49040',
  soon:     'rgba(255,255,255,0.55)',
  upcoming: 'rgba(255,255,255,0.28)',
}

type Tab = 'all' | 'payable' | 'receivable'

// ── Row ──────────────────────────────────────────────────────────────────────
function DueRow({ due, index }: { due: UpcomingDue; index: number }) {
  const urgency = getUrgency(due.dueDate)
  const isPayable = due.direction === 'payable'

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className="flex items-center gap-3 py-2.5 group/row cursor-default"
    >
      {/* Urgency stripe */}
      <div
        className="w-[3px] h-7 rounded-full flex-shrink-0"
        style={{ background: URGENCY_COLOR[urgency] }}
      />

      {/* Logo tile */}
      <div
        className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        {due.logoUrl ? (
          <img
            src={due.logoUrl}
            alt={due.company}
            className="w-[18px] h-[18px] object-contain"
            onError={e => {
              e.currentTarget.style.display = 'none'
              const fb = e.currentTarget.nextElementSibling as HTMLElement | null
              if (fb) fb.style.display = 'flex'
            }}
          />
        ) : null}
        <span
          className="text-[10px] font-bold text-text-secondary"
          style={{ display: due.logoUrl ? 'none' : 'flex' }}
        >
          {due.company.charAt(0)}
        </span>
      </div>

      {/* Company + ref */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate leading-tight">
          {due.company}
        </p>
        <p className="text-2xs text-text-disabled leading-tight mt-0.5">
          {due.invoiceRef}
        </p>
      </div>

      {/* Direction badge */}
      <span
        className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
        style={{ color: isPayable ? 'rgba(184,88,88,0.8)' : 'rgba(61,191,122,0.8)' }}
      >
        {isPayable ? 'OUT' : 'IN'}
      </span>

      {/* Amount */}
      <div className="text-right flex-shrink-0 min-w-[72px]">
        <p
          className="text-xs font-semibold mono"
          style={{ color: isPayable ? '#B85858' : '#3DBF7A' }}
        >
          {isPayable ? '−' : '+'}{due.currency} {due.amount.toLocaleString('en-US')}
        </p>
        <p
          className="text-[10px] mt-0.5"
          style={{ color: URGENCY_LABEL_COLOR[urgency] }}
        >
          {formatDueLabel(due.dueDate)}
        </p>
      </div>
    </motion.div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function UpcomingDues() {
  const [tab, setTab] = useState<Tab>('all')

  const sorted = [...mockUpcomingDues].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )

  const filtered = tab === 'all' ? sorted : sorted.filter(d => d.direction === tab)

  const overdueCount = sorted.filter(d => getUrgency(d.dueDate) === 'overdue').length
  const todayCount   = sorted.filter(d => getUrgency(d.dueDate) === 'today').length

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all',        label: 'All',         count: sorted.length },
    { key: 'payable',    label: 'Payables',    count: sorted.filter(d => d.direction === 'payable').length },
    { key: 'receivable', label: 'Receivables', count: sorted.filter(d => d.direction === 'receivable').length },
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

          {/* Alert badge */}
          {(overdueCount > 0 || todayCount > 0) && (
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
              {overdueCount + todayCount} need attention
            </motion.div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-medium transition-all duration-150"
              style={{
                background: tab === t.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: tab === t.key ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
              }}
            >
              {t.label}
              <span
                className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none"
                style={{
                  background: tab === t.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                  color: tab === t.key ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-5" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* List */}
      <div className="px-5 pb-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((due, i) => (
            <div key={due.id}>
              <DueRow due={due} index={i} />
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
