'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertCircle } from 'lucide-react'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

interface WeeklyPoint { weekStart: string; amount: number }

interface RestockData {
  cogsRate: number
  lagDays: number
  lagWeeks: number
  bestCorrelation: number
  confidence: 'high' | 'medium' | 'low'
  avgWeeklySales: number
  avgWeeklyRestock: number
  dueNextWeek: number
  dueNextMonth: number
  impliedRestockFromRecentSales: number
  impliedRestockDueDate: string
  sensitivity: {
    salesChangePct: number
    weeklyRestockDelta: number
    monthlyRestockDelta: number
    lagDays: number
  }
  chart: {
    salesSeries: WeeklyPoint[]
    restockSeries: WeeklyPoint[]
    lagWeeks: number
  }
}

const confidenceColors: Record<string, string> = {
  high: '#0a7030',
  medium: '#9e5a00',
  low: '#3e5e84',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2.5 text-xs space-y-1 min-w-[140px]">
      <p className="text-text-muted font-medium mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-text-secondary">{p.name}</span>
          </span>
          <span className="mono text-text-primary">{formatCurrency(p.value ?? 0, 'EUR', true)}</span>
        </div>
      ))}
    </div>
  )
}

export default function RestockForecast() {
  const [data, setData] = useState<RestockData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/restock-forecast?user_id=${USER_ID}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const chartData = (() => {
    if (!data || !data.chart) return []
    const { salesSeries, restockSeries, lagWeeks } = data.chart
    return salesSeries.map((pt, i) => ({
      week: new Date(pt.weekStart + 'T00:00:00Z').toLocaleDateString('en', {
        month: 'short', day: 'numeric',
      }),
      sales: pt.amount,
      // shift restock right by lagWeeks to visually align with the causing sales week
      restock: restockSeries[Math.max(0, i - lagWeeks)]?.amount ?? null,
    }))
  })()

  const confColor = data ? confidenceColors[data.confidence] : '#3e5e84'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card p-5 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="label mb-0.5">Restock Forecast</p>
          <p className="text-xs text-text-muted">Sales → inventory lag model</p>
        </div>
        {data && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ color: confColor, background: confColor + '18', border: `1px solid ${confColor}28` }}
          >
            {data.confidence} confidence
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 min-h-[140px] flex items-center justify-center">
          <p className="text-xs text-text-disabled animate-pulse">Analysing patterns…</p>
        </div>
      ) : !data || data.confidence === 'low' ? (
        <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle size={20} className="text-text-disabled" />
          <p className="text-xs text-text-muted">Insufficient sales data to detect lag pattern.</p>
          <p className="text-[10px] text-text-disabled">Need ≥ 4 weeks of sales & supplier activity.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fill: '#686868', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#686868', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
              <Bar dataKey="sales" name="Sales" maxBarSize={10} fill="#3030cc" fillOpacity={0.7} />
              <Line
                type="monotone"
                dataKey="restock"
                name="Restock"
                stroke="#9e5a00"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary stats */}
      {data && (
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface-raised p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">Due next week</p>
              <p className="text-sm font-semibold text-text-primary mono">
                {formatCurrency(data.dueNextWeek, 'EUR', true)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-raised p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">Due next month</p>
              <p className="text-sm font-semibold text-text-primary mono">
                {formatCurrency(data.dueNextMonth, 'EUR', true)}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-surface-raised p-2.5">
            <p className="text-[10px] text-text-disabled mb-1">Implied restock from recent sales</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary mono">
                {formatCurrency(data.impliedRestockFromRecentSales, 'EUR', true)}
              </p>
              <p className="text-[10px] text-text-muted">
                due {new Date(data.impliedRestockDueDate + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-text-disabled pt-0.5">
            <span>COGS rate: <span className="text-text-secondary">{(data.cogsRate * 100).toFixed(0)}%</span></span>
            <span>Lag: <span className="text-text-secondary">{data.lagDays}d</span></span>
            <span className="flex items-center gap-1">
              <TrendingUp size={10} />
              r = {data.bestCorrelation.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
