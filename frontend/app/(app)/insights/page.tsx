'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, AlertTriangle, ChevronRight, Sparkles, RefreshCw,
  ShoppingCart, CheckCircle2, XCircle, AlertCircle,
  Package, Calendar, Target, Activity, DollarSign,
  Clock, ChevronDown, Zap,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import PageShell, { SectionHeader } from '@/components/layout/PageShell'
import { formatCurrency, cn } from '@/lib/utils'
import { FALLBACK_HEALTH, FALLBACK_SUBSCRIPTIONS } from '@/lib/insights-fallback'
import { useDashboard } from '@/lib/dashboard-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthData {
  health_score: number
  net_worth: number
  total_income: number
  total_profit: number
  total_expenditure: number
  avg_monthly_burn: number
  profit_margin_pct: number
  forecast_confidence: string
  predicted_burn_next_month: number
  predicted_income_next_month: number
  forecast_reasoning: string
  seasonal_risk: string | null
  inventory_alert: string | null
  lazy_cash_alert: string | null
  investment_opportunity: string | null
  score_breakdown: Record<string, { score: number; reasoning: string }>
  top_3_controllable_improvements: string[]
  payroll_assessment: string
  variable_cost_assessment: string
  benchmark_comparison: {
    summary: string
    areas_above_benchmark: string[]
    areas_below_benchmark: string[]
  }
  cost_breakdown: {
    payroll: { pct: number; amount: number }
    fixed: { pct: number; amount: number }
    variable: { pct: number; amount: number }
    other: { pct: number; amount: number }
  }
  historical_months: Array<{
    month: string
    income: number
    profit: number
    expenditure: number
    category_spend: Record<string, number>
  }>
  executive_briefing?: {
    root_cause: string
    connected_narrative: string
    single_most_impactful_action: string
    if_nothing_changes: string
  }
}

interface SubData {
  summary: string
  priority_score: number
  total_estimated_monthly_savings: number
  total_estimated_annual_savings: number
  insights: Array<{
    title: string
    severity: string
    insight_type: string
    priority_rank: number
    headline_metric: string
    description: string
    recommended_actions: Array<{
      action: string
      effort: string
      timeframe: string
      estimated_impact: string
    }>
  }>
  raw?: {
    runway_stress_test?: {
      current_balance: number
      avg_monthly_burn: number
      stressed_runway_months: number
    }
  }
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function ScorePill({ score, max = 25 }: { score: number; max?: number }) {
  const pct = score / max
  const color = pct >= 0.7 ? '#00D4A0' : pct >= 0.4 ? '#C49040' : '#B85858'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-surface-raised overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 1.0, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <span className="text-xs font-bold mono" style={{ color }}>{score}/{max}</span>
    </div>
  )
}

function SeverityDot({ severity }: { severity: string }) {
  const col = severity === 'critical' ? '#B85858' : severity === 'warning' ? '#C49040' : '#00D4A0'
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0 mt-1">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: col }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: col }} />
    </span>
  )
}

function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high:   { label: 'High confidence',   cls: 'text-success border-success/20 bg-success/8'  },
    medium: { label: 'Medium confidence', cls: 'text-warning border-warning/20 bg-warning/8'  },
    low:    { label: 'Low confidence',    cls: 'text-danger  border-danger/20  bg-danger/8'   },
  }
  const m = map[level] ?? map.medium
  return (
    <span className={cn('text-2xs font-semibold px-2 py-0.5 rounded-full border', m.cls)}>{m.label}</span>
  )
}

function SkeletonBlock({ h = 'h-24', className = '' }: { h?: string; className?: string }) {
  return <div className={cn('skeleton rounded-xl', h, className)} />
}

// ─── Section 1: Executive Briefing ───────────────────────────────────────────

function ExecutiveBriefing({ briefing, score, savings, profitMarginPct, monthsRunway, orgName }: {
  briefing: HealthData['executive_briefing']
  score: number
  savings: number
  profitMarginPct: number
  monthsRunway: number
  orgName: string
}) {
  const [expanded, setExpanded] = useState(true)
  const scoreColor = score >= 70 ? '#00D4A0' : score >= 40 ? '#C49040' : '#B85858'
  const scoreLabel = score >= 70 ? (monthsRunway < 3 ? 'Profitable · Cash Risk' : 'Healthy') : score >= 40 ? 'Needs Attention' : 'At Risk'
  const circumference = 2 * Math.PI * 40

  const bullets = briefing ? [
    { icon: Target,   label: 'Root cause',          text: briefing.root_cause,                   color: '#B85858' },
    { icon: Activity, label: 'The full picture',    text: briefing.connected_narrative,          color: '#818CF8' },
    { icon: Zap,      label: 'Single best action',  text: briefing.single_most_impactful_action, color: '#00D4A0' },
    { icon: Clock,    label: 'If nothing changes',  text: briefing.if_nothing_changes,           color: '#C49040' },
  ] : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl border border-border overflow-hidden"
      style={{ background: 'var(--tooltip-bg)' }}
    >
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse 90% 60% at 100% 0%, rgba(0,212,160,0.07) 0%, transparent 60%)',
      }} />

      <div className="relative flex items-start gap-6 p-6 pb-5">
        {/* Score ring */}
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" className="-rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--svg-ring)" strokeWidth="6" />
            <motion.circle
              cx="48" cy="48" r="40" fill="none"
              stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
              transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 8px ${scoreColor}55)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold mono leading-none" style={{ color: scoreColor }}>{score}</span>
            <span className="text-[9px] text-text-disabled tracking-wide">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={13} className="text-accent flex-shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled">
              HELM Intelligence · Executive Briefing
            </span>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2 leading-tight">{orgName}</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full border"
              style={{ color: scoreColor, borderColor: `${scoreColor}30`, background: `${scoreColor}10` }}
            >
              {scoreLabel}
            </span>
            {savings > 0 && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Sparkles size={10} className="text-accent" />
                {formatCurrency(savings, 'USD', true)}/mo savings identified
              </span>
            )}
          </div>

          {/* 3-metric tension bar */}
          <div className="flex items-center gap-0 mt-3 rounded-xl overflow-hidden border border-border/30">
            <div className="flex-1 px-3 py-2 text-center border-r border-border/30">
              <p className="text-[10px] text-text-disabled uppercase tracking-widest">Profit margin</p>
              <p className="text-sm font-bold mono text-success">{profitMarginPct.toFixed(1)}%</p>
            </div>
            <div className="flex-1 px-3 py-2 text-center border-r border-border/30">
              <p className="text-[10px] text-text-disabled uppercase tracking-widest">Cash runway</p>
              <p className={`text-sm font-bold mono ${monthsRunway < 3 ? 'text-warning' : 'text-text-primary'}`}>{monthsRunway < 0.5 ? '<1 mo' : `${monthsRunway} mo`}</p>
            </div>
            <div className="flex-1 px-3 py-2 text-center">
              <p className="text-[10px] text-text-disabled uppercase tracking-widest">Stressed runway</p>
              <p className="text-sm font-bold mono text-danger">−0.3 mo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 mx-6" />

      <div className="relative p-6 pt-5 space-y-4">
        {bullets.slice(0, expanded ? 4 : 2).map((b, i) => {
          const Icon = b.icon
          return (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="flex gap-3"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${b.color}12`, border: `1px solid ${b.color}20` }}
              >
                <Icon size={13} style={{ color: b.color }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: b.color }}>
                  {b.label}
                </p>
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{b.text}</p>
              </div>
            </motion.div>
          )
        })}

        {briefing && bullets.length > 2 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mt-1"
          >
            <ChevronDown size={12} className={cn('transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Collapse' : 'Show all insights'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Section 2: Financial Health Score ───────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  cost_structure:  'Cost Structure',
  profit_quality:  'Profit Quality',
  cash_efficiency: 'Cash Efficiency',
  expense_control: 'Expense Control',
}

function HealthScoreSection({ health }: { health: HealthData }) {
  const breakdown = health.score_breakdown ?? {}

  const costData = health.cost_breakdown ? [
    { name: 'Payroll',  value: health.cost_breakdown.payroll?.pct  ?? 0, color: '#B85858' },
    { name: 'Other',    value: health.cost_breakdown.other?.pct    ?? 0, color: '#C49040' },
    { name: 'Variable', value: health.cost_breakdown.variable?.pct ?? 0, color: '#00D4A0' },
    { name: 'Fixed',    value: health.cost_breakdown.fixed?.pct    ?? 0, color: '#6898C8' },
  ] : []

  return (
    <div className="grid grid-cols-[1fr_1.6fr] gap-4">
      <div className="card p-5 space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled">Score breakdown</p>
        {Object.entries(breakdown).map(([key, val], i) => (
          <motion.div key={key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-text-secondary">{DIMENSION_LABELS[key] ?? key}</span>
            </div>
            <ScorePill score={val.score} max={25} />
          </motion.div>
        ))}

        {costData.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled mb-3">Cost composition</p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {costData.map(d => (
                <motion.div
                  key={d.name}
                  style={{ background: d.color, width: `${d.value}%` }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {costData.map(d => (
                <div key={d.name} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-2xs text-text-disabled">{d.name} {d.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled">Top actions</p>
        {(health.top_3_controllable_improvements ?? []).map((imp, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
            className="flex gap-3 p-3 rounded-xl bg-surface-raised/50 border border-border/30"
          >
            <div className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{imp}</p>
          </motion.div>
        ))}
        {health.benchmark_comparison?.summary && (
          <div className="pt-1 border-t border-border/30">
            <p className="text-xs text-text-muted leading-relaxed">{health.benchmark_comparison.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section 3: Forecast & Seasonality ───────────────────────────────────────

function ForecastSection({ health }: { health: HealthData }) {
  const chartData = [
    ...(health.historical_months ?? []).map(m => ({
      month: new Date(m.month + '-01').toLocaleDateString('en-IE', { month: 'short' }),
      burn: m.expenditure,
      income: m.income,
      actual: true,
    })),
    {
      month: 'Forecast',
      burn: health.predicted_burn_next_month ?? 0,
      income: health.predicted_income_next_month ?? 0,
      actual: false,
    },
  ]

  const runway = health.avg_monthly_burn
    ? Math.round((health.net_worth / health.avg_monthly_burn) * 10) / 10
    : 0

  const alerts = [
    health.seasonal_risk    && { icon: Calendar,     color: '#C49040', label: 'Seasonal Risk',       text: health.seasonal_risk },
    health.inventory_alert  && { icon: Package,      color: '#6898C8', label: 'Inventory Alert',     text: health.inventory_alert },
    health.investment_opportunity && { icon: DollarSign, color: '#00D4A0', label: 'Capital Opportunity', text: health.investment_opportunity },
  ].filter(Boolean) as Array<{ icon: React.ElementType; color: string; label: string; text: string }>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Cash Runway',     value: `${runway} mo`,                                          note: runway < 6 ? 'Below safe threshold' : 'Above 6-month target',   state: runway < 6 ? 'warn' : 'ok'    },
          { label: 'Avg Monthly Burn', value: formatCurrency(health.avg_monthly_burn, 'USD', true),   note: 'Last 3-month average',                                          state: 'neutral'                      },
          { label: 'Forecast Burn',   value: formatCurrency(health.predicted_burn_next_month, 'USD', true), note: 'Next month (AI adj.)',                                    state: 'neutral'                      },
          { label: 'Forecast Income', value: formatCurrency(health.predicted_income_next_month, 'USD', true), note: 'Next month (AI adj.)',
            state: health.predicted_income_next_month < health.predicted_burn_next_month ? 'warn' : 'ok' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
            className="card p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-2xs font-medium uppercase tracking-[0.1em] text-text-disabled">{kpi.label}</p>
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', kpi.state === 'ok' ? 'bg-success' : kpi.state === 'warn' ? 'bg-warning' : 'bg-border')} />
            </div>
            <p className={cn('text-xl font-bold mono leading-none mb-1', kpi.state === 'warn' ? 'text-warning' : 'text-text-primary')}>{kpi.value}</p>
            <p className="text-2xs text-text-disabled leading-tight">{kpi.note}</p>
          </motion.div>
        ))}
      </div>

      <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled mb-0.5">3-Month Trend + Forecast</p>
              <ConfidenceBadge level={health.forecast_confidence ?? 'medium'} />
            </div>
            <div className="flex gap-3">
              {[{ label: 'Burn', color: '#B85858' }, { label: 'Income', color: '#00D4A0' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-2xs text-text-muted">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--grid-line)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--grid-tick)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--grid-tick)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                cursor={{ fill: 'var(--overlay-subtle)' }}
                contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--tooltip-label)', marginBottom: 4 }}
                itemStyle={{ color: 'var(--tooltip-item)' }}
                formatter={(v: number, name: string) => [formatCurrency(v, 'USD'), name === 'burn' ? 'Burn' : 'Income']}
              />
              <Bar dataKey="burn" fill="#B85858" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.actual ? '#B85858' : '#B8585855'} />
                ))}
              </Bar>
              <Bar dataKey="income" fill="#00D4A0" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.actual ? '#00D4A0' : '#00D4A055'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {health.forecast_reasoning && (
            <p className="text-xs text-text-disabled mt-3 leading-relaxed border-t border-border/30 pt-3 line-clamp-2">
              <span className="text-text-muted font-medium">AI: </span>{health.forecast_reasoning}
            </p>
          )}
          {alerts.length > 0 && (
            <div className="space-y-2 mt-3 pt-3 border-t border-border/30">
              {alerts.map((a, i) => {
                const Icon = a.icon
                return (
                  <motion.div
                    key={a.label}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex gap-3 p-3 rounded-xl border"
                    style={{ borderColor: `${a.color}25`, background: `${a.color}06` }}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${a.color}15` }}>
                      <Icon size={12} style={{ color: a.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: a.color }}>{a.label}</p>
                      <p className="text-xs text-text-secondary leading-relaxed">{a.text}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
    </div>
  )
}

// ─── Section 4: Runway & Priority Insights ────────────────────────────────────

function PriorityInsights({ sub }: { sub: SubData }) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const insights = sub.insights ?? []
  const runway = sub.raw?.runway_stress_test
  const runwayMonths = runway?.stressed_runway_months ?? 0
  const runwayPct = Math.min((runwayMonths / 24) * 100, 100)
  const runwayColor = runwayMonths < 6 ? '#B85858' : runwayMonths < 12 ? '#C49040' : '#00D4A0'

  return (
    <div className="grid grid-cols-[1fr_1.6fr] gap-4">
      <div className="card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled mb-4">Runway Health</p>
        {runway && (
          <div className="space-y-4">
            <div className="relative flex items-center justify-center mb-2">
              <svg width="120" height="120" className="-rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--svg-ring)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={runwayColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - runwayPct / 100) }}
                  transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 6px ${runwayColor}44)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold mono" style={{ color: runwayColor }}>{runwayMonths.toFixed(1)}</span>
                <span className="text-2xs text-text-disabled">months</span>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Cash balance', value: formatCurrency(runway.current_balance, 'USD', true) },
                { label: 'Monthly burn',  value: formatCurrency(runway.avg_monthly_burn, 'USD', true) },
                { label: 'Status',        value: runwayMonths < 6 ? 'Critical' : runwayMonths < 12 ? 'Caution' : 'Safe' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs text-text-muted">{r.label}</span>
                  <span className="text-xs font-semibold mono text-text-primary">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 p-3 rounded-xl bg-surface-raised/50 border border-border/30">
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{sub.summary}</p>
        </div>
      </div>

      <div className="space-y-2">
        {insights.length === 0 && (
          <div className="card p-8 text-center">
            <Sparkles size={20} className="text-text-disabled mx-auto mb-2" />
            <p className="text-sm text-text-muted">No critical insights flagged.</p>
          </div>
        )}
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
            className="card overflow-hidden"
          >
            <button
              className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-raised/20 transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <SeverityDot severity={ins.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-[0.1em]',
                    ins.severity === 'critical' ? 'text-danger' : ins.severity === 'warning' ? 'text-warning' : 'text-success'
                  )}>
                    {ins.severity}
                  </span>
                  <span className="text-[10px] text-text-disabled">{ins.headline_metric}</span>
                </div>
                <p className="text-sm font-semibold text-text-primary">{ins.title}</p>
              </div>
              <motion.div animate={{ rotate: expanded === i ? 90 : 0 }} className="flex-shrink-0">
                <ChevronRight size={13} className="text-text-muted" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-border/30"
                >
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{ins.description}</p>
                    {ins.recommended_actions?.map((act, j) => (
                      <div key={j} className="flex gap-3 p-3 rounded-lg bg-surface-raised/50 border border-border/30">
                        <div className={cn(
                          'text-2xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 h-fit',
                          act.effort === 'low' ? 'bg-success/10 text-success' : act.effort === 'medium' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                        )}>
                          {act.effort}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-text-primary mb-0.5 line-clamp-1">{act.action}</p>
                          <p className="text-2xs text-text-disabled">{act.estimated_impact} · {act.timeframe}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Section 5: Purchase Advisor ─────────────────────────────────────────────

type Verdict = {
  risk_level: 'green' | 'yellow' | 'red'
  verdict: string
  reasoning: string
  alternatives: string[]
  best_time_to_buy: string
  runway_after_purchase_months: number | null
  investment_opportunity: string | null
  _demo?: boolean
}

const RISK_CONFIG = {
  green:  { icon: CheckCircle2, color: '#00D4A0', label: 'Approved', bg: 'rgba(0,212,160,0.08)',  border: 'rgba(0,212,160,0.2)'  },
  yellow: { icon: AlertCircle,  color: '#C49040', label: 'Caution',  bg: 'rgba(196,144,64,0.08)', border: 'rgba(196,144,64,0.2)' },
  red:    { icon: XCircle,      color: '#B85858', label: 'Rejected', bg: 'rgba(184,88,88,0.08)',  border: 'rgba(184,88,88,0.2)'  },
}

function PurchaseAdvisor() {
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !price) return
    setLoading(true)
    setError(null)
    setVerdict(null)
    try {
      const res = await fetch('/api/ask-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), price: parseFloat(price), currency: 'USD' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      setVerdict(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate purchase')
    } finally {
      setLoading(false)
    }
  }

  const cfg = verdict ? RISK_CONFIG[verdict.risk_level] : null
  const VerdictIcon = cfg?.icon

  return (
    <div className="grid grid-cols-[1fr_1.4fr] gap-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <ShoppingCart size={13} className="text-accent" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled">HELM Financial Advisor</p>
            <p className="text-xs font-semibold text-text-primary">Should I buy this?</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-2xs text-text-disabled mb-1.5 block uppercase tracking-widest">What are you buying?</label>
            <input
              type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Forklift for warehouse expansion"
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-disabled focus:outline-none focus:border-accent/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-2xs text-text-disabled mb-1.5 block uppercase tracking-widest">Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled text-sm">$</span>
              <input
                type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="w-full bg-surface-raised border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-text-primary placeholder-text-disabled focus:outline-none focus:border-accent/40 transition-colors mono"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !description.trim() || !price}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
              loading || !description.trim() || !price
                ? 'bg-surface-raised text-text-disabled cursor-not-allowed'
                : 'bg-accent text-black hover:brightness-105 active:scale-[0.98]'
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={13} className="animate-spin" /> Analysing…
              </span>
            ) : 'Get AI Verdict'}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-xs text-danger bg-danger/8 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      <div ref={resultRef}>
        <AnimatePresence mode="wait">
          {!verdict && !loading && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="card p-8 h-full flex flex-col items-center justify-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-raised flex items-center justify-center">
                <Brain size={20} className="text-text-disabled" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-muted mb-1">AI Purchase Advisor</p>
                <p className="text-xs text-text-disabled leading-relaxed">
                  Enter a purchase above. HELM will evaluate it against your live cash position, runway, and category
                  spend — and return a Green / Yellow / Red verdict in seconds.
                </p>
              </div>
            </motion.div>
          )}
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="card p-8 h-full flex flex-col items-center justify-center gap-4"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-accent/20 animate-spin border-t-accent" />
                <Brain size={16} className="text-accent absolute inset-0 m-auto" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary mb-1">Analysing purchase…</p>
                <p className="text-xs text-text-disabled">Evaluating against live financial position</p>
              </div>
            </motion.div>
          )}
          {verdict && cfg && VerdictIcon && (
            <motion.div key="verdict"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="card p-5 flex flex-col gap-4"
              style={{ borderColor: cfg.border }}
            >
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: cfg.bg }}>
                <VerdictIcon size={20} style={{ color: cfg.color }} />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{verdict.verdict}</p>
                </div>
              </div>
              <div>
                <p className="text-2xs text-text-disabled uppercase tracking-widest mb-1.5">Reasoning</p>
                <p className="text-xs text-text-secondary leading-relaxed">{verdict.reasoning}</p>
              </div>
              <div className="flex gap-3">
                {verdict.runway_after_purchase_months !== null && (
                  <div className="flex-1 p-3 rounded-lg bg-surface-raised/50 border border-border/30">
                    <p className="text-2xs text-text-disabled mb-1">Runway after</p>
                    <p className="text-base font-bold mono text-text-primary">{verdict.runway_after_purchase_months}mo</p>
                  </div>
                )}
                <div className="flex-1 p-3 rounded-lg bg-surface-raised/50 border border-border/30">
                  <p className="text-2xs text-text-disabled mb-1">Best time</p>
                  <p className="text-xs font-semibold text-text-primary">{verdict.best_time_to_buy}</p>
                </div>
              </div>
              {verdict.alternatives?.length > 0 && (
                <div>
                  <p className="text-2xs text-text-disabled uppercase tracking-widest mb-1.5">Alternatives</p>
                  <ul className="space-y-1">
                    {verdict.alternatives.map((alt, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-text-secondary">
                        <ChevronRight size={10} className="text-text-disabled flex-shrink-0 mt-0.5" />{alt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {verdict.investment_opportunity && (
                <div className="p-3 rounded-xl bg-success/6 border border-success/15">
                  <p className="text-2xs text-success font-semibold uppercase tracking-widest mb-1">Capital Opportunity</p>
                  <p className="text-xs text-text-secondary leading-relaxed">{verdict.investment_opportunity}</p>
                </div>
              )}
              {verdict._demo && (
                <p className="text-2xs text-text-disabled border-t border-border/30 pt-3">
                  Demo mode · Python API offline · Start with{' '}
                  <code className="text-accent">uvicorn insights_engine.main:app --port 8000</code>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { org } = useDashboard()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [sub, setSub] = useState<SubData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [aiStale, setAiStale] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights-data')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      if (json.health) {
        setHealth(json.health as HealthData)
        setSub(json.subscriptions as SubData)
        setLastUpdated(json.lastUpdated)
        setIsLive(json.live === true)
        setAiStale(json.aiStale === true)
        setUsingFallback(false)
      } else {
        setHealth(FALLBACK_HEALTH as unknown as HealthData)
        setSub(FALLBACK_SUBSCRIPTIONS as unknown as SubData)
        setUsingFallback(true)
        setIsLive(false)
      }
    } catch {
      setHealth(FALLBACK_HEALTH as unknown as HealthData)
      setSub(FALLBACK_SUBSCRIPTIONS as unknown as SubData)
      setUsingFallback(true)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    // Trigger AI regeneration in background, then fetch fresh live data
    setRegenerating(true)
    fetch('/api/insights-data/regenerate', { method: 'POST' })
      .catch(() => {})
      .finally(() => setRegenerating(false))
    await fetchData()
  }

  useEffect(() => { fetchData() }, [])

  const topBarRight = (
    <div className="flex items-center gap-3">
      {lastUpdated && !usingFallback && (
        <span className="text-2xs text-text-disabled">
          Updated {new Date(lastUpdated).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      {isLive && !usingFallback && (
        <span className="text-2xs text-success/80 bg-success/8 border border-success/20 px-2 py-1 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Live data
        </span>
      )}
      {aiStale && !usingFallback && (
        <span className="text-2xs text-accent/80 bg-accent/8 border border-accent/20 px-2 py-1 rounded-full">
          AI analysis updating…
        </span>
      )}
      {usingFallback && (
        <span className="text-2xs text-warning/80 bg-warning/8 border border-warning/20 px-2 py-1 rounded-full">
          Demo data
        </span>
      )}
      <button
        onClick={handleRefresh} disabled={loading}
        className="flex items-center gap-1.5 text-2xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <RefreshCw size={11} className={loading || regenerating ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  )

  return (
    <PageShell tag={org.name.toUpperCase()} title="Intelligence Hub" topBarRight={topBarRight}>
      {loading ? (
        <div className="space-y-8">
          <SkeletonBlock h="h-56" />
          <div className="grid grid-cols-2 gap-4"><SkeletonBlock h="h-64" /><SkeletonBlock h="h-64" /></div>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <SkeletonBlock key={i} h="h-24" />)}
          </div>
          <div className="grid grid-cols-2 gap-4"><SkeletonBlock h="h-72" /><SkeletonBlock h="h-72" /></div>
        </div>
      ) : health && sub ? (
        <>
          {/* 1 — Executive Briefing */}
          <div>
            <SectionHeader tag="AI SYNTHESIS" title="Executive Briefing" />
            <ExecutiveBriefing
              briefing={health.executive_briefing}
              score={health.health_score}
              savings={sub.total_estimated_monthly_savings}
              profitMarginPct={health.profit_margin_pct}
              monthsRunway={health.avg_monthly_burn > 0 ? Math.round((health.net_worth / health.avg_monthly_burn) * 10) / 10 : 0}
              orgName={org.name}
            />
          </div>

          {/* 2 — Financial Health Score */}
          <div>
            <SectionHeader tag="CONTROLLABLE METRICS" title="Financial Health Score" />
            <HealthScoreSection health={health} />
          </div>

          {/* 3 — Forecast & Seasonality */}
          <div>
            <SectionHeader tag="FORECAST & INTELLIGENCE" title="Burn Forecast + Seasonal Alerts" />
            <ForecastSection health={health} />
          </div>

          {/* 5 — Purchase Advisor */}
          <div>
            <SectionHeader tag="FINANCIAL ADVISOR" title="Purchase Advisor" />
            <PurchaseAdvisor />
          </div>
        </>
      ) : (
        <div className="card p-12 text-center">
          <AlertTriangle size={24} className="text-warning mx-auto mb-3" />
          <p className="text-sm text-text-muted mb-3">{error ?? 'No insights data available.'}</p>
          <button onClick={fetchData} className="text-xs text-accent hover:underline">Try again</button>
        </div>
      )}
    </PageShell>
  )
}

