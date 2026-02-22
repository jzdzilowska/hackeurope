'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, Zap, ArrowUpRight } from 'lucide-react'
import { cn, formatCurrency, formatDate, generateStripeRef } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'
import type { PaymentApproval } from '@/lib/types'

type CardState = 'idle' | 'loading' | 'approved'

function ApprovalCard({ approval }: { approval: PaymentApproval }) {
  const [state, setState] = useState<CardState>('idle')
  const [stripeRef, setStripeRef] = useState('')

  const handleApprove = () => {
    setState('loading')
    setTimeout(() => {
      setStripeRef(generateStripeRef())
      setState('approved')
    }, 1400)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={{ duration: 0.3 }}
      className="card p-5"
    >
      {/* Header: logo + name + amount */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/50 flex-shrink-0"
            style={{ background: 'var(--overlay-subtle)' }}
          >
            {approval.merchantLogoUrl ? (
              <img src={approval.merchantLogoUrl} alt="" className="w-5 h-5 rounded object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <span className="text-2xs font-bold text-text-muted">{approval.merchantName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{approval.merchantName}</p>
            <p className="text-2xs text-text-muted">{approval.helmCategory}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold mono text-text-primary">
            {formatCurrency(approval.expectedAmount, 'EUR', true)}
          </p>
          <p className="text-2xs text-text-disabled">due {formatDate(approval.expectedDate)}</p>
        </div>
      </div>

      {/* Last paid comparison */}
      <div className="flex items-center gap-3 mb-4 p-2.5 rounded-lg bg-surface-raised/60 border border-border/30">
        <div className="flex-1">
          <p className="text-2xs text-text-disabled">Last paid</p>
          <p className="text-xs mono font-medium text-text-secondary">
            {formatCurrency(approval.lastPaidAmount, 'EUR', true)} on {formatDate(approval.lastPaidDate)}
          </p>
        </div>
        <ArrowUpRight size={13} className="text-text-disabled flex-shrink-0" />
        <div className="flex-1 text-right">
          <p className="text-2xs text-text-disabled">Expected</p>
          <p className="text-xs mono font-medium text-text-primary">
            {formatCurrency(approval.expectedAmount, 'EUR', true)}
            {approval.expectedAmountMax > approval.expectedAmount &&
              <span className="text-text-disabled"> – {formatCurrency(approval.expectedAmountMax, 'EUR', true)}</span>
            }
          </p>
        </div>
      </div>

      {/* Stripe ref reveal */}
      <AnimatePresence>
        {state === 'approved' && stripeRef && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/6 border border-success/15">
              <Zap size={11} className="text-success flex-shrink-0" />
              <span className="text-2xs text-text-muted">Stripe ref</span>
              <code className="text-2xs mono font-medium text-success ml-auto">{stripeRef}</code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button */}
      <button
        onClick={() => state === 'idle' && handleApprove()}
        disabled={state !== 'idle'}
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
          state === 'idle'     ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]' :
          state === 'loading'  ? 'bg-accent/60 text-white cursor-wait' :
                                 'bg-success/12 text-success border border-success/25 cursor-default'
        )}
      >
        {state === 'idle'    && <><CheckCircle2 size={14} /> Approve & pay via Stripe</>}
        {state === 'loading' && <><Loader2 size={14} className="animate-spin" /> Processing…</>}
        {state === 'approved' && <><CheckCircle2 size={14} /> Approved</>}
      </button>
    </motion.div>
  )
}

export default function ApprovalQueue() {
  const { approvals: mockApprovals } = useDashboard()
  const [approvals] = useState(mockApprovals)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="flex flex-col gap-3 w-full min-w-0"
    >
      <div className="flex items-center justify-between">
        <p className="label">Approval queue</p>
        <span className="badge-accent text-2xs">{approvals.length} pending</span>
      </div>

      <AnimatePresence mode="popLayout">
        {approvals.map((approval) => (
          <ApprovalCard key={approval.id} approval={approval} />
        ))}
      </AnimatePresence>

      {approvals.length === 0 && (
        <div className="card p-6 text-center">
          <CheckCircle2 size={20} className="text-success mx-auto mb-2" />
          <p className="text-sm text-text-secondary">All caught up</p>
        </div>
      )}
    </motion.div>
  )
}
