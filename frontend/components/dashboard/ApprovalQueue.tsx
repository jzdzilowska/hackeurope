'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, Zap, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency, formatDate, generateStripeRef } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'
import type { PaymentApproval } from '@/lib/types'

type CardState = 'idle' | 'loading' | 'approved'

function ApprovalCard({
  approval,
  className,
}: {
  approval: PaymentApproval
  className?: string
}) {
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
    <div className={cn('card p-4 w-full flex flex-col', className)}>
      {/* Header: logo + name + amount */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-border/50 flex-shrink-0"
            style={{ background: 'var(--overlay-subtle)' }}
          >
            {approval.merchantLogoUrl ? (
              <img
                src={approval.merchantLogoUrl}
                alt=""
                className="w-4 h-4 rounded object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <span className="text-[9px] font-bold text-text-muted">
                {approval.merchantName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate leading-tight">
              {approval.merchantName}
            </p>
            <p className="text-[10px] text-text-muted leading-tight">{approval.runwaveCategory}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-base font-bold mono text-text-primary leading-tight">
            {formatCurrency(approval.expectedAmount, 'EUR', true)}
          </p>
          <p className="text-[10px] text-text-disabled leading-tight">due {formatDate(approval.expectedDate)}</p>
        </div>
      </div>

      {/* Last paid comparison */}
      <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-surface-raised/60 border border-border/30">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-text-disabled leading-tight">Last paid</p>
          <p className="text-[10px] mono font-medium text-text-secondary leading-tight truncate">
            {formatCurrency(approval.lastPaidAmount, 'EUR', true)}
          </p>
        </div>
        <ArrowUpRight size={11} className="text-text-disabled flex-shrink-0" />
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[9px] text-text-disabled leading-tight">Expected</p>
          <p className="text-[10px] mono font-medium text-text-primary leading-tight truncate">
            {formatCurrency(approval.expectedAmount, 'EUR', true)}
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
            className="overflow-hidden mb-2"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/6 border border-success/15">
              <Zap size={10} className="text-success flex-shrink-0" />
              <span className="text-[10px] text-text-muted">Stripe ref</span>
              <code className="text-[10px] mono font-medium text-success ml-auto">{stripeRef}</code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button — mt-auto keeps it at the bottom without a rigid spacer */}
      <button
        onClick={() => state === 'idle' && handleApprove()}
        disabled={state !== 'idle'}
        className={cn(
          'mt-auto w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
          state === 'idle'
            ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]'
            : state === 'loading'
            ? 'bg-accent/60 text-white cursor-wait'
            : 'bg-success/12 text-success border border-success/25 cursor-default'
        )}
      >
        {state === 'idle'     && <><CheckCircle2 size={12} /> Approve & pay via Stripe</>}
        {state === 'loading'  && <><Loader2 size={12} className="animate-spin" /> Processing…</>}
        {state === 'approved' && <><CheckCircle2 size={12} /> Approved</>}
      </button>
    </div>
  )
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction >= 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

export default function ApprovalQueue() {
  const { approvals: mockApprovals } = useDashboard()
  const [approvals] = useState(mockApprovals)
  const [slideIndex, setSlideIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  // Group into pairs: every 2 approvals = 1 slide / 1 dot
  const slides: PaymentApproval[][] = []
  for (let i = 0; i < approvals.length; i += 2) {
    slides.push(approvals.slice(i, i + 2))
  }

  const paginate = (newDirection: number) => {
    const next = slideIndex + newDirection
    if (next < 0 || next >= slides.length) return
    setDirection(newDirection)
    setSlideIndex(next)
  }

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const { offset, velocity } = info
    if (offset.x < -40 || velocity.x < -300) paginate(1)
    else if (offset.x > 40 || velocity.x > 300) paginate(-1)
  }

  const currentSlide = slides[slideIndex] ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="flex flex-col gap-3 w-full min-w-0 h-full"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="label">Approval queue</p>
        <div className="flex items-center gap-2">
          <span className="badge-accent text-2xs">{approvals.length} pending</span>
          {slides.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => paginate(-1)}
                disabled={slideIndex === 0}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-surface-high"
                aria-label="Previous"
              >
                <ChevronLeft size={12} className="text-text-muted" />
              </button>
              <button
                onClick={() => paginate(1)}
                disabled={slideIndex === slides.length - 1}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-surface-high"
                aria-label="Next"
              >
                <ChevronRight size={12} className="text-text-muted" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Carousel: fills remaining height ── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={slideIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.85 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.10}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex flex-col gap-3 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'pan-y' }}
          >
            {currentSlide.map(approval => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                className="flex-1 min-h-0"
              />
            ))}
            {/* If only 1 card in slide, fill remaining space visually */}
            {currentSlide.length === 1 && (
              <div className="flex-1 min-h-0" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Dot indicators (1 dot = 2 approvals) ── */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 flex-shrink-0 pb-0.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > slideIndex ? 1 : -1)
                setSlideIndex(i)
              }}
              className={cn(
                'rounded-full transition-all duration-300',
                i === slideIndex
                  ? 'w-4 h-1.5 bg-accent'
                  : 'w-1.5 h-1.5 bg-border hover:bg-text-disabled'
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {approvals.length === 0 && (
        <div className="card p-6 text-center flex-1 flex flex-col items-center justify-center">
          <CheckCircle2 size={20} className="text-success mb-2" />
          <p className="text-sm text-text-secondary">All caught up</p>
        </div>
      )}
    </motion.div>
  )
}
