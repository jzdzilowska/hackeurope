'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, SkipForward, Loader2, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import { cn, formatCurrency, formatRelativeDate, generateStripeRef } from '@/lib/utils'
import { mockApprovals } from '@/lib/mock-data'
import type { PaymentApproval } from '@/lib/types'

type CardState = 'idle' | 'loading' | 'approved' | 'skipped'

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
  const handleSkip = () => setState('skipped')

  if (state === 'skipped') return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'card p-4 transition-all duration-300',
        state === 'approved' && 'border-success/30 bg-success/[0.03]'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Merchant logo */}
        <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0">
          {approval.merchantLogoUrl ? (
            <img src={approval.merchantLogoUrl} alt={approval.merchantName} className="w-5 h-5 object-contain" />
          ) : (
            <span className="text-xs font-bold text-text-muted">{approval.merchantName.charAt(0)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{approval.merchantName}</p>
          <p className="text-2xs text-text-muted">{approval.helmCategory}</p>
        </div>

        {/* Status badge */}
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="badge-neutral text-2xs">
              <Clock size={9} /> Pending
            </motion.span>
          )}
          {state === 'loading' && (
            <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="badge-accent text-2xs">
              <Loader2 size={9} className="animate-spin" /> Processing
            </motion.span>
          )}
          {state === 'approved' && (
            <motion.span key="approved"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="badge-success text-2xs">
              <CheckCircle2 size={9} /> Approved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Amount + date row */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div>
          <p className="text-2xs text-text-muted mb-0.5">Expected amount</p>
          <p className="text-lg font-bold mono text-text-primary">
            {formatCurrency(approval.expectedAmount, 'EUR')}
          </p>
          {approval.expectedAmountMax > approval.expectedAmount && (
            <p className="text-2xs text-text-muted">up to {formatCurrency(approval.expectedAmountMax, 'EUR', true)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xs text-text-muted mb-0.5">Due date</p>
          <p className="text-sm font-medium text-text-primary">{formatRelativeDate(approval.expectedDate)}</p>
          <p className="text-2xs text-text-muted">
            Last: {formatCurrency(approval.lastPaidAmount, 'EUR', true)}
          </p>
        </div>
      </div>

      {/* Stripe ref — shows after approval */}
      <AnimatePresence>
        {state === 'approved' && stripeRef && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3 px-3 py-2 rounded-lg bg-success/8 border border-success/20 flex items-center gap-2"
          >
            <ShieldCheck size={12} className="text-success flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-2xs text-success font-medium">Payment scheduled via Stripe</p>
              <p className="text-2xs text-text-muted mono">{stripeRef}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {state === 'idle' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-2"
          >
            <button
              onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-accent text-black hover:bg-accent-hover active:scale-[0.98] transition-all"
            >
              <CheckCircle2 size={12} />
              Approve & Auto-Pay
            </button>
            <button
              onClick={handleSkip}
              className="px-3 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-surface-raised border border-border/60 transition-all"
            >
              <SkipForward size={12} />
            </button>
          </motion.div>
        )}
        {state === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-2"
          >
            <Loader2 size={13} className="animate-spin text-accent" />
            <span className="text-xs text-text-muted">Creating Stripe payment...</span>
          </motion.div>
        )}
        {state === 'approved' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-text-muted"
          >
            Executes on {formatRelativeDate(approval.expectedDate)}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ApprovalQueue() {
  const [approvals] = useState(mockApprovals)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="flex flex-col gap-3"
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
