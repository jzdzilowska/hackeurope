'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Area, Bar, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

interface CashflowWeek {
  weekStart: string
  balance: number
  inflow: number
  outflow: number
  type: 'historical' | 'projection'
}

interface CashflowData {
  currentCash: number
  weeks: CashflowWeek[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const isProjected = payload[0]?.payload?.projected
  return (
    <div className="card px-3 py-2.5 text-xs space-y-1 min-w-[160px]">
      <p className="text-text-muted font-medium mb-1.5">{label}</p>
      {isProjected && (
        <p className="text-[10px] text-text-disabled italic mb-1">Projected</p>
      )}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-text-secondary capitalize">{p.name}</span>
          </span>
          <span className="mono text-text-primary">
            {formatCurrency(Math.abs(p.value ?? 0), 'EUR', true)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CashflowChart() {
  const [data, setData] = useState<CashflowData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/cashflow?user_id=${USER_ID}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const chartData = (data?.weeks ?? []).map(w => ({
    week: new Date(w.weekStart + 'T00:00:00Z').toLocaleDateString('en', {
      month: 'short', day: 'numeric',
    }),
    balance: w.balance,
    historicalBalance: w.type === 'historical' ? w.balance : null,
    projectedBalance: w.type === 'projection' ? w.balance : null,
    inflow: w.inflow,
    outflow: -w.outflow,
    projected: w.type === 'projection',
  }))

  const todayLabel = chartData.find(d => d.projected)?.week

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="card p-5 flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="label mb-0.5">Balance Position</p>
          <p className="text-xs text-text-muted">3-month history · 4-week forecast</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#3030cc' }} />
            Balance
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            Inflow
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#b41230' }} />
            Outflow
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 min-h-[200px] flex items-center justify-center">
          <p className="text-xs text-text-disabled animate-pulse">Loading cash flow…</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceHistGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3030cc" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3030cc" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="balanceProjGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3030cc" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#3030cc" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="week"
                tick={{ fill: '#686868', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#686868', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `€${(Math.abs(v) / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />

              {/* Historical balance area */}
              <Area
                type="monotone"
                dataKey="historicalBalance"
                stroke="#3030cc"
                strokeWidth={2}
                fill="url(#balanceHistGrad)"
                dot={false}
                connectNulls={false}
                name="Balance"
              />
              {/* Projected balance area — dashed */}
              <Area
                type="monotone"
                dataKey="projectedBalance"
                stroke="#3030cc"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#balanceProjGrad)"
                dot={false}
                connectNulls={false}
                name="Balance (proj.)"
              />

              {/* Inflow bars */}
              <Bar dataKey="inflow" name="Inflow" maxBarSize={6}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="#0a7030" fillOpacity={d.projected ? 0.4 : 0.8} />
                ))}
              </Bar>

              {/* Outflow bars (negative) */}
              <Bar dataKey="outflow" name="Outflow" maxBarSize={6}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="#b41230" fillOpacity={d.projected ? 0.4 : 0.8} />
                ))}
              </Bar>

              {todayLabel && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 2"
                  label={{ value: 'Today', position: 'top', fill: '#686868', fontSize: 10 }}
                />
              )}
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && (
        <p className="text-[10px] text-text-disabled mt-3">
          Current cash: <span className="text-text-secondary font-medium">{formatCurrency(data.currentCash, 'EUR', true)}</span>
        </p>
      )}
    </motion.div>
  )
}
