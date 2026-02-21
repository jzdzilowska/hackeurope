'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, TrendingDown, CreditCard, Sparkles, BarChart3,
  ArrowUpRight, X, ChevronRight, Zap,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import PageShell, { SectionHeader } from '@/components/layout/PageShell'
import { mockInsights, mockBurnData, mockKPIs } from '@/lib/mock-data'
import { formatCurrency, cn } from '@/lib/utils'
import type { InsightCard } from '@/lib/types'

const TYPE_META = {
  anomaly:      { icon: AlertTriangle, color: '#F87171', bg: 'rgba(248,113,113,0.08)', label: 'Anomaly'      },
  runway:       { icon: TrendingDown,  color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',  label: 'Runway'       },
  subscription: { icon: CreditCard,   color: '#A8C940', bg: 'rgba(168,201,64,0.08)',   label: 'Subscription' },
  saving:       { icon: Sparkles,     color: '#34D399', bg: 'rgba(52,211,153,0.08)',   label: 'Saving'       },
  margin:       { icon: BarChart3,    color: '#818CF8', bg: 'rgba(129,140,248,0.08)',  label: 'Margin'       },
}

const URGENCY_BADGE = {
  high:   'bg-danger/10 text-danger border-danger/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low:    'bg-surface-raised text-text-muted border-border/50',
}

// Runway projection data (months ahead)
const RUNWAY_DATA = [
  { month: 'Feb', cash: 98991, runway: 6.5 },
  { month: 'Mar', cash: 83761, runway: 5.5 },
  { month: 'Apr', cash: 68531, runway: 4.5 },
  { month: 'May', cash: 53301, runway: 3.5 },
  { month: 'Jun', cash: 38071, runway: 2.5 },
  { month: 'Jul', cash: 22841, runway: 1.5 },
  { month: 'Aug', cash: 7611,  runway: 0.5 },
]

function InsightRow({ card, onDismiss }: { card: InsightCard, onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[card.type]
  const Icon = meta.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      className="card overflow-hidden group"
    >
      <button
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-surface-raised/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Type icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: meta.bg }}
        >
          <Icon size={16} style={{ color: meta.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <span className={cn(
              'text-2xs font-medium px-1.5 py-0.5 rounded border',
              URGENCY_BADGE[card.urgency]
            )}>
              {card.urgency}
            </span>
          </div>
          <p className="text-sm font-semibold text-text-primary leading-snug">{card.headline}</p>
        </div>

        {/* Right: action + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {card.actionLabel && (
            <span className="text-2xs text-text-disabled group-hover:text-text-muted transition-colors hidden sm:block">
              {card.actionLabel}
            </span>
          )}
          <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
            <ChevronRight size={14} className="text-text-muted" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 flex items-start justify-between gap-6 border-t border-border/30 pt-4">
              <p className="text-sm text-text-secondary leading-relaxed flex-1">{card.body}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {card.actionLabel && (
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/15 transition-colors">
                    {card.actionLabel} <ArrowUpRight size={11} />
                  </button>
                )}
                <button
                  onClick={() => onDismiss(card.id)}
                  className="p-2 rounded-lg text-text-disabled hover:text-text-muted hover:bg-surface-raised transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function InsightsPage() {
  const [dismissed, setDismissed] = useState<string[]>([])
  const visible = mockInsights.filter(c => !dismissed.includes(c.id))

  const handleDismiss = (id: string) => setDismissed(d => [...d, id])

  const healthScore = mockKPIs.financialHealthScore

  return (
    <PageShell tag="INTELLIGENCE" title="Insights">

      {/* ── Financial health score ── */}
      <div>
        <SectionHeader tag="HEALTH" title="Financial Score" />
        <div className="grid grid-cols-3 gap-3">

          {/* Score hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}
            className="card p-6 relative overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0" style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(168,201,64,0.10) 0%, transparent 65%)',
            }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled mb-4">
              Overall health
            </p>

            {/* Circular score — SVG */}
            <div className="relative flex items-center justify-center mb-4">
              <svg width="100" height="100" className="-rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                <motion.circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={healthScore >= 70 ? '#A8C940' : healthScore >= 50 ? '#FBBF24' : '#F87171'}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - healthScore / 100) }}
                  transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold mono text-text-primary leading-none">{healthScore}</span>
                <span className="text-2xs text-text-muted">/ 100</span>
              </div>
            </div>

            <p className="text-xs font-semibold text-warning text-center">
              {healthScore >= 70 ? 'Healthy' : healthScore >= 50 ? 'Needs attention' : 'At risk'}
            </p>
            <p className="text-2xs text-text-disabled text-center mt-0.5">
              Based on runway, burn trend, and cash reserves
            </p>
          </motion.div>

          {/* Key signals */}
          <div className="col-span-2 grid grid-cols-2 gap-3">
            {[
              { label: 'Cash runway', value: `${mockKPIs.runway.toFixed(1)} mo`, state: 'warn',    note: 'Below 8 months threshold' },
              { label: 'Burn trend',  value: `+${mockKPIs.burnTrend}% MoM`,      state: 'warn',    note: 'Spending increased vs last month' },
              { label: 'Revenue',     value: '€23,000',                           state: 'healthy', note: '+7% MoM, on target' },
              { label: 'Net margin',  value: '33.8%',                             state: 'healthy', note: 'Improving for 2nd consecutive month' },
            ].map((sig, i) => (
              <motion.div
                key={sig.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className="card p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-2xs font-medium uppercase tracking-[0.11em] text-text-disabled">{sig.label}</p>
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0 mt-0.5',
                    sig.state === 'healthy' ? 'bg-success' : 'bg-warning'
                  )} />
                </div>
                <p className={cn(
                  'text-xl font-bold mono leading-tight mb-1',
                  sig.state === 'healthy' ? 'text-text-primary' : 'text-warning'
                )}>
                  {sig.value}
                </p>
                <p className="text-2xs text-text-disabled">{sig.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Runway forecast chart ── */}
      <div>
        <SectionHeader tag="FORECAST" title="Runway Projection" action="Adjust assumptions" />
        <div className="card p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-xs text-text-muted">Cash balance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-danger opacity-60" />
              <span className="text-xs text-text-muted">Zero-cash threshold</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Zap size={11} className="text-accent" />
              <span className="text-xs text-text-muted">Based on €15,230/mo burn</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={RUNWAY_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#A8C940" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#A8C940" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                formatter={(v: number) => [formatCurrency(v, 'EUR'), 'Cash']}
              />
              <Area type="monotone" dataKey="cash" stroke="#A8C940" strokeWidth={2}
                fill="url(#cashGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-text-disabled mt-3 text-center">
            At current burn, cash reaches zero approx. <strong className="text-danger">Aug 2025</strong>. 
            Raise target or reduce burn by <strong className="text-warning">€3.2k/mo</strong> to extend to 12 months.
          </p>
        </div>
      </div>

      {/* ── AI insight cards ── */}
      <div>
        <SectionHeader
          tag="AI"
          title={`Insights ${visible.length > 0 ? `(${visible.length})` : ''}`}
          action={dismissed.length > 0 ? `${dismissed.length} dismissed` : undefined}
        />
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visible.map(card => (
              <InsightRow key={card.id} card={card} onDismiss={handleDismiss} />
            ))}
          </AnimatePresence>
          {visible.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-10 text-center"
            >
              <Sparkles size={22} className="text-text-disabled mx-auto mb-3" />
              <p className="text-sm text-text-muted">All insights reviewed.</p>
              <button
                onClick={() => setDismissed([])}
                className="mt-3 text-xs text-accent hover:underline"
              >
                Restore all
              </button>
            </motion.div>
          )}
        </div>
      </div>

    </PageShell>
  )
}
