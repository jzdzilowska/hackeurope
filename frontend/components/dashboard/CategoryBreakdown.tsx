'use client'

import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'

export default function CategoryBreakdown() {
  const { categories: mockCategories } = useDashboard()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="card p-5 flex flex-col"
    >
      <div className="mb-5">
        <p className="label mb-0.5">Spend by category</p>
        <p className="text-xs text-text-muted">This month</p>
      </div>

      <div className="space-y-3 flex-1">
        {mockCategories.map((cat, i) => (
          <div key={cat.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-text-secondary">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xs text-text-muted">{cat.pct.toFixed(0)}%</span>
                <span className="text-xs mono text-text-primary">
                  {formatCurrency(cat.amount, 'EUR', true)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-surface-raised overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cat.pct}%` }}
                transition={{ duration: 0.7, delay: 0.4 + i * 0.07, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-text-muted">Total this month</span>
        <span className="text-sm font-semibold mono text-text-primary">
          {formatCurrency(mockCategories.reduce((s, c) => s + c.amount, 0), 'EUR', true)}
        </span>
      </div>
    </motion.div>
  )
}
