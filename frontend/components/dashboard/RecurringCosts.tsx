'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Repeat2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

interface FixedCostsData {
  fixedCosts: {
    totalMonthly: number
    topExpenses: Array<{ vendor: string; avgMonthly: number }>
  }
}

export default function RecurringCosts() {
  const [data, setData] = useState<FixedCostsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/insights?user_id=${USER_ID}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fixedCosts = data?.fixedCosts
  const total = fixedCosts?.totalMonthly ?? 0
  const expenses = fixedCosts?.topExpenses ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="card p-5 flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label mb-0.5">Recurring Costs</p>
          <p className="text-xs text-text-muted">Fixed monthly obligations</p>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent/10">
          <Repeat2 size={14} className="text-accent" />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-disabled animate-pulse">Detecting patterns…</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-6">
          <p className="text-xs text-text-muted">No recurring bills detected yet.</p>
          <p className="text-[10px] text-text-disabled">Need 2+ months of transaction history.</p>
        </div>
      ) : (
        <>
          {/* Total */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-text-primary mono">
              {formatCurrency(total, 'EUR', true)}
            </p>
            <p className="text-[10px] text-text-disabled mt-0.5">per month</p>
          </div>

          {/* Top recurring vendors */}
          <div className="flex-1 space-y-2">
            {expenses.map((expense, i) => (
              <motion.div
                key={expense.vendor}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-raised"
              >
                <span className="text-xs text-text-secondary truncate mr-2">
                  {expense.vendor}
                </span>
                <span className="text-xs font-semibold text-text-primary mono whitespace-nowrap">
                  {formatCurrency(expense.avgMonthly, 'EUR', true)}
                </span>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
