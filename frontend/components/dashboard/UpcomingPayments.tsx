'use client'

import { motion } from 'framer-motion'
import { ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react'
import { cn, formatCurrency, formatRelativeDate } from '@/lib/utils'
import { mockRecurring } from '@/lib/mock-data'
import type { RecurringPayment } from '@/lib/types'

const usageStyles = {
  active:  { dot: 'bg-success',  label: 'Active' },
  low:     { dot: 'bg-warning',  label: 'Low usage' },
  unused:  { dot: 'bg-danger',   label: 'Unused' },
}

function RecurringRow({ r, index }: { r: RecurringPayment; index: number }) {
  const usage = r.usageFlag ? usageStyles[r.usageFlag] : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-raised transition-colors cursor-pointer group"
    >
      {/* Logo */}
      <div className="w-7 h-7 rounded-md bg-surface-high border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0">
        {r.merchantLogoUrl ? (
          <img src={r.merchantLogoUrl} alt={r.merchantName} className="w-4 h-4 object-contain" />
        ) : (
          <span className="text-2xs font-bold text-text-muted">{r.merchantName.charAt(0)}</span>
        )}
      </div>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-text-primary truncate">{r.merchantName}</p>
          {usage && (
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', usage.dot)} title={usage.label} />
          )}
        </div>
        <p className="text-2xs text-text-muted">{r.helmCategory} · {r.frequency}</p>
      </div>

      {/* Next date */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-2xs text-text-muted">{formatRelativeDate(r.nextExpectedDate)}</p>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 w-20 text-right">
        <p className="text-xs font-medium mono text-text-primary">
          {formatCurrency(r.averageAmount, r.currency, true)}
        </p>
        <p className="text-2xs text-text-muted">/mo</p>
      </div>

      {/* Auto-pay badge */}
      <div className="flex-shrink-0">
        {r.autoPayEnabled ? (
          <ToggleRight size={16} className="text-accent" />
        ) : (
          <ToggleLeft size={16} className="text-text-disabled" />
        )}
      </div>

      <ChevronRight size={12} className="text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </motion.div>
  )
}

export default function UpcomingPayments() {
  const sorted = [...mockRecurring].sort(
    (a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime()
  )

  const totalMonthly = mockRecurring.reduce((s, r) => s + r.averageAmount, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="card p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label mb-0.5">Recurring payments</p>
          <p className="text-xs text-text-muted">
            {mockRecurring.length} active · {formatCurrency(totalMonthly, 'USD', true)}/mo
          </p>
        </div>
        <div className="flex items-center gap-3 text-2xs text-text-muted">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" />Active</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning" />Low</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-danger" />Unused</span>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {sorted.map((r, i) => (
          <RecurringRow key={r.id} r={r} index={i} />
        ))}
      </div>
    </motion.div>
  )
}
