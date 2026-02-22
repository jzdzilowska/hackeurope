'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, X, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { PaymentApproval } from '@/lib/types'

const AUTO_DISMISS_MS = 6000

interface Props {
  invoice: PaymentApproval | null
  onDismiss: () => void
}

export default function InvoiceToast({ invoice, onDismiss }: Props) {
  useEffect(() => {
    if (!invoice) return
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [invoice, onDismiss])

  const dueLabel = invoice?.expectedDate
    ? new Date(invoice.expectedDate).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <AnimatePresence>
      {invoice && (
        <motion.div
          key={invoice.id}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="fixed bottom-5 right-5 z-50 w-[300px]"
        >
          <div className="rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">

            {/* Animated top accent bar */}
            <motion.div
              className="h-0.5 w-full origin-left bg-gradient-to-r from-success via-accent to-success/60"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0">
                    <Mail size={13} className="text-success" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-success mb-0.5">
                      New invoice received
                    </p>
                    <p className="text-sm font-semibold text-text-primary leading-tight">
                      {invoice.merchantName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onDismiss}
                  className="text-text-disabled hover:text-text-secondary transition-colors mt-0.5 flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Amount + due date */}
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-text-disabled mb-0.5">Amount due</p>
                  <p className="text-lg font-bold text-text-primary leading-none">
                    {formatCurrency(invoice.expectedAmount)}
                  </p>
                </div>
                {dueLabel && (
                  <div className="text-right">
                    <p className="text-[10px] text-text-disabled mb-0.5">Due</p>
                    <p className="text-xs font-semibold text-text-secondary">{dueLabel}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5 text-[10px] text-text-disabled">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                Parsed from email · added to approval queue
                <ArrowRight size={8} className="ml-auto flex-shrink-0" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
