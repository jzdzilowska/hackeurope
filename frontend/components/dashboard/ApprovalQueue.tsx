'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, Zap, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
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
    <div className="card p-5 w-full flex-shrink-0">
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
    </div>
  )
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

export default function ApprovalQueue() {
  const { approvals: mockApprovals } = useDashboard()
  const [approvals] = useState(mockApprovals)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const paginate = (newDirection: number) => {
    const next = index + newDirection
    if (next < 0 || next >= approvals.length) return
    setDirection(newDirection)
    setIndex(next)
  }

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 40
    const { offset, velocity } = info
    if (offset.x < -swipeThreshold || velocity.x < -300) {
      paginate(1)
    } else if (offset.x > swipeThreshold || velocity.x > 300) {
      paginate(-1)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="flex flex-col gap-3 w-full min-w-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="label">Approval queue</p>
        <div className="flex items-center gap-2">
          <span className="badge-accent text-2xs">{approvals.length} pending</span>
          {approvals.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => paginate(-1)}
                disabled={index === 0}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-surface-high"
                aria-label="Previous"
              >
                <ChevronLeft size={12} className="text-text-muted" />
              </button>
              <button
                onClick={() => paginate(1)}
                disabled={index === approvals.length - 1}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-surface-high"
                aria-label="Next"
              >
                <ChevronRight size={12} className="text-text-muted" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Carousel */}
      <div className="relative overflow-hidden w-full rounded-card">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={approvals[index]?.id ?? index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            className="w-full cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'pan-y' }}
          >
            {approvals[index] && (
              <ApprovalCard approval={approvals[index]} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {approvals.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {approvals.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > index ? 1 : -1)
                setIndex(i)
              }}
              className={cn(
                'rounded-full transition-all duration-300',
                i === index
                  ? 'w-4 h-1.5 bg-accent'
                  : 'w-1.5 h-1.5 bg-border hover:bg-text-disabled'
              )}
              aria-label={`Go to approval ${i + 1}`}
            />
          ))}
        </div>
      )}

      {approvals.length === 0 && (
        <div className="card p-6 text-center">
          <CheckCircle2 size={20} className="text-success mx-auto mb-2" />
          <p className="text-sm text-text-secondary">All caught up</p>
        </div>
      )}
    </motion.div>
  )
}
