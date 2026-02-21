'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight, CheckCircle2, Clock, AlertCircle,
  Zap, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react'
import PageShell, { SectionHeader } from '@/components/layout/PageShell'
import { useDashboard } from '@/lib/dashboard-context'
import { formatCurrency, formatDate, generateStripeRef, cn } from '@/lib/utils'

const STATUS_META = {
  active:           { label: 'Active',          color: 'text-success',  bg: 'bg-success/8 border-success/20'  },
  under_review:     { label: 'Under review',     color: 'text-warning',  bg: 'bg-warning/8 border-warning/20'  },
  cancelled:        { label: 'Cancelled',        color: 'text-danger',   bg: 'bg-danger/8 border-danger/20'    },
  pending_approval: { label: 'Needs approval',   color: 'text-accent',   bg: 'bg-accent/8 border-accent/20'   },
}

const USAGE_DOT = {
  active: 'bg-success',
  low:    'bg-warning',
  unused: 'bg-danger',
}

type ApproveState = 'idle' | 'loading' | 'approved'

export default function PaymentsPage() {
  const { recurring: mockRecurring, approvals } = useDashboard()
  const [approveStates, setApproveStates] = useState<Record<string, ApproveState>>({})
  const [stripeRefs, setStripeRefs]       = useState<Record<string, string>>({})
  const [autoPayMap, setAutoPayMap]       = useState<Record<string, boolean>>(
    Object.fromEntries(mockRecurring.map(r => [r.id, r.autoPayEnabled]))
  )

  const total   = mockRecurring.reduce((s, r) => s + r.averageAmount, 0)
  const active  = mockRecurring.filter(r => r.status === 'active').length
  const review  = mockRecurring.filter(r => r.status === 'under_review').length
  const pending = mockRecurring.filter(r => r.status === 'pending_approval').length

  const handleApprove = (id: string) => {
    setApproveStates(s => ({ ...s, [id]: 'loading' }))
    setTimeout(() => {
      setApproveStates(s => ({ ...s, [id]: 'approved' }))
      setStripeRefs(r => ({ ...r, [id]: generateStripeRef() }))
    }, 1400)
  }

  return (
    <PageShell tag="PAYMENTS" title="Subscriptions & Bills">

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { abbr: 'MR', label: 'Monthly Recurring', value: formatCurrency(total, 'EUR', true), sub: `${mockRecurring.length} subscriptions` },
          { abbr: 'AC', label: 'Active',             value: String(active),                    sub: 'auto-pay or confirmed' },
          { abbr: 'UR', label: 'Under Review',       value: String(review),                    sub: 'idle seats detected', warn: review > 0 },
          { abbr: 'PA', label: 'Pending Approval',   value: String(pending),                   sub: 'awaiting sign-off',   urgent: pending > 0 },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.abbr}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22,1,0.36,1] }}
            className="card p-4 flex flex-col justify-between"
            style={{ minHeight: '110px' }}
          >
            <div className="flex items-start justify-between">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/60 text-[10px] font-bold mono text-text-muted"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {kpi.abbr}
              </div>
              {(kpi.warn || kpi.urgent) && (
                <AlertCircle size={13} className={kpi.urgent ? 'text-accent' : 'text-warning'} />
              )}
            </div>
            <div>
              <p className="text-2xs font-medium uppercase tracking-[0.11em] text-text-disabled mb-1">{kpi.label}</p>
              <p className={cn(
                'text-2xl font-bold mono leading-none',
                kpi.urgent ? 'text-accent' : kpi.warn ? 'text-warning' : 'text-text-primary'
              )}>
                {kpi.value}
              </p>
              <p className="text-2xs text-text-disabled mt-1">{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Recurring payments table ── */}
      <div>
        <SectionHeader tag="RECURRING" title="All Subscriptions" action="Export" />
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 px-5 py-3 border-b border-border/40">
            {['Service', 'Category', 'Amount', 'Next payment', 'Status', 'Auto-pay'].map(h => (
              <p key={h} className="text-[10px] font-semibold uppercase tracking-[0.13em] text-text-disabled">{h}</p>
            ))}
          </div>

          {mockRecurring.map((r, i) => {
            const meta = STATUS_META[r.status]
            const autoPay = autoPayMap[r.id]
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 px-5 py-3.5 border-b border-border/20 hover:bg-surface-raised/30 transition-colors items-center last:border-0"
              >
                {/* Service */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-2xs font-bold text-text-muted border border-border/50"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    {r.merchantLogoUrl ? (
                      <img src={r.merchantLogoUrl} alt="" className="w-4.5 h-4.5 rounded object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : r.merchantName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.merchantName}</p>
                    {r.usageFlag && r.usageFlag !== 'active' && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', USAGE_DOT[r.usageFlag])} />
                        <span className="text-2xs text-text-disabled capitalize">{r.usageFlag} usage</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category */}
                <p className="text-xs text-text-muted truncate">{r.helmCategory}</p>

                {/* Amount */}
                <div>
                  <p className="text-sm font-semibold mono text-text-primary">
                    {formatCurrency(r.averageAmount, r.currency, true)}
                  </p>
                  <p className="text-2xs text-text-disabled capitalize">{r.frequency}</p>
                </div>

                {/* Next date */}
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-text-disabled flex-shrink-0" />
                  <p className="text-xs text-text-secondary">{formatDate(r.nextExpectedDate)}</p>
                </div>

                {/* Status badge */}
                <span className={cn(
                  'inline-flex items-center text-2xs font-medium px-2 py-0.5 rounded-pill border w-fit',
                  meta.bg, meta.color
                )}>
                  {meta.label}
                </span>

                {/* Auto-pay toggle */}
                <button
                  onClick={() => setAutoPayMap(m => ({ ...m, [r.id]: !m[r.id] }))}
                  className="flex items-center justify-center transition-colors"
                  title={autoPay ? 'Disable auto-pay' : 'Enable auto-pay'}
                >
                  {autoPay
                    ? <ToggleRight size={22} className="text-accent" />
                    : <ToggleLeft size={22} className="text-text-disabled hover:text-text-muted" />
                  }
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Approval queue ── */}
      <div>
        <SectionHeader tag="APPROVALS" title="Awaiting Sign-Off" />
        <div className="grid grid-cols-2 gap-3">
          {approvals.map((appr, i) => {
            const state = approveStates[appr.id] ?? 'idle'
            const ref   = stripeRefs[appr.id]
            return (
              <motion.div
                key={appr.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="card p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/50"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      {appr.merchantLogoUrl ? (
                        <img src={appr.merchantLogoUrl} alt="" className="w-5 h-5 rounded object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <span className="text-2xs font-bold text-text-muted">{appr.merchantName.slice(0,2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{appr.merchantName}</p>
                      <p className="text-2xs text-text-muted">{appr.helmCategory}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold mono text-text-primary">
                      {formatCurrency(appr.expectedAmount, 'EUR', true)}
                    </p>
                    <p className="text-2xs text-text-disabled">due {formatDate(appr.expectedDate)}</p>
                  </div>
                </div>

                {/* Last paid comparison */}
                <div className="flex items-center gap-3 mb-4 p-2.5 rounded-lg bg-surface-raised/60 border border-border/30">
                  <div className="flex-1">
                    <p className="text-2xs text-text-disabled">Last paid</p>
                    <p className="text-xs mono font-medium text-text-secondary">
                      {formatCurrency(appr.lastPaidAmount, 'EUR', true)} on {formatDate(appr.lastPaidDate)}
                    </p>
                  </div>
                  <ArrowUpRight size={13} className="text-text-disabled" />
                  <div className="flex-1 text-right">
                    <p className="text-2xs text-text-disabled">Expected</p>
                    <p className="text-xs mono font-medium text-text-primary">
                      {formatCurrency(appr.expectedAmount, 'EUR', true)}
                      {appr.expectedAmountMax > appr.expectedAmount &&
                        <span className="text-text-disabled"> – {formatCurrency(appr.expectedAmountMax, 'EUR', true)}</span>
                      }
                    </p>
                  </div>
                </div>

                {/* Stripe ref reveal */}
                <AnimatePresence>
                  {state === 'approved' && ref && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-3"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/6 border border-success/15">
                        <Zap size={11} className="text-success flex-shrink-0" />
                        <span className="text-2xs text-text-muted">Stripe ref</span>
                        <code className="text-2xs mono font-medium text-success ml-auto">{ref}</code>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action button */}
                <button
                  onClick={() => state === 'idle' && handleApprove(appr.id)}
                  disabled={state !== 'idle'}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                    state === 'idle'    ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]' :
                    state === 'loading' ? 'bg-accent/60 text-black cursor-wait' :
                                         'bg-success/12 text-success border border-success/25 cursor-default'
                  )}
                >
                  {state === 'idle'    && <><CheckCircle2 size={14} /> Approve & pay via Stripe</>}
                  {state === 'loading' && <><Loader2 size={14} className="animate-spin" /> Processing…</>}
                  {state === 'approved' && <><CheckCircle2 size={14} /> Approved</>}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

    </PageShell>
  )
}
