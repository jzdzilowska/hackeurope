'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Bar, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

interface MonthlySnapshot {
  month: string
  snapshotDate: string
  cashOnDate: number
  inflows30d: number
  outflows30d: number
  restock30d: number
  surplus: number
  type: 'historical' | 'upcoming'
}

interface SurplusData {
  months: MonthlySnapshot[]
  summary: {
    monthsAnalysed: number
    avgSurplus: number
    minSurplus: number
    maxSurplus: number
    consistentFloor: number
    negativeMonths: number
    interpretation: string
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const isProjected = payload[0]?.payload?.projected
  return (
    <div className="card px-3 py-2.5 text-xs space-y-1 min-w-[160px]">
      <p className="text-text-muted font-medium mb-1">{label}</p>
      {isProjected && <p className="text-[10px] text-text-disabled italic">Projected</p>}
      {payload.map((p: any) => {
        if (p.value === undefined || p.value === null) return null
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
              <span className="text-text-secondary">{p.name}</span>
            </span>
            <span className="mono text-text-primary">
              {formatCurrency(Math.abs(p.value), 'EUR', true)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function SurplusChart() {
  const [data, setData] = useState<SurplusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/surplus?user_id=${USER_ID}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const chartData = (data?.months ?? []).map(m => ({
    month: new Date(m.month + '-01T00:00:00Z').toLocaleDateString('en', {
      month: 'short', year: '2-digit',
    }),
    inflows: m.inflows30d,
    overhead: -m.outflows30d,
    restock: -m.restock30d,
    surplus: m.surplus,
    projected: m.type === 'upcoming',
  }))

  const summary = data?.summary
  const surplusLine = summary?.avgSurplus ?? 0
  const floorLine = summary?.consistentFloor ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="card p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="label mb-0.5">Monthly Surplus</p>
          <p className="text-xs text-text-muted">Deployable cash · 12-month view</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full inline-block bg-[#0c42b8]" />
            Inflows
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full inline-block bg-[#2c5070]" />
            Overhead
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full inline-block bg-[#9e5a00]" />
            Restock
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-xs text-text-disabled animate-pulse">Calculating surplus…</p>
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="month"
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

              {/* Positive stack: inflows */}
              <Bar dataKey="inflows" name="Inflows" stackId="pos" maxBarSize={18}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="#0c42b8" fillOpacity={d.projected ? 0.4 : 0.75} />
                ))}
              </Bar>

              {/* Negative stack: overhead */}
              <Bar dataKey="overhead" name="Overhead" stackId="neg" maxBarSize={18}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="#2c5070" fillOpacity={d.projected ? 0.35 : 0.65} />
                ))}
              </Bar>

              {/* Negative stack: restock */}
              <Bar dataKey="restock" name="Restock" stackId="neg" maxBarSize={18}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="#9e5a00" fillOpacity={d.projected ? 0.35 : 0.65} />
                ))}
              </Bar>

              {/* Surplus line overlay */}
              <Line
                type="monotone"
                dataKey="surplus"
                name="Surplus"
                stroke="#0a7030"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0a7030', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#0a7030', strokeWidth: 0 }}
              />

              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              {floorLine > 0 && (
                <ReferenceLine
                  y={floorLine}
                  stroke="#0a7030"
                  strokeOpacity={0.35}
                  strokeDasharray="5 3"
                  label={{ value: 'Safe floor', position: 'insideTopLeft', fill: '#0a7030', fontSize: 9, fillOpacity: 0.6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary stats */}
      {summary && summary.monthsAnalysed > 0 && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-surface-raised p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">Avg surplus</p>
              <p className="text-sm font-semibold text-text-primary mono">
                {formatCurrency(summary.avgSurplus, 'EUR', true)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-raised p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">Safe floor</p>
              <p className="text-sm font-semibold text-success mono">
                {formatCurrency(summary.consistentFloor, 'EUR', true)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-raised p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">Neg. months</p>
              <p className={`text-sm font-semibold mono ${summary.negativeMonths > 0 ? 'text-danger' : 'text-success'}`}>
                {summary.negativeMonths}/{summary.monthsAnalysed}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed">
            {summary.interpretation}
          </p>
        </div>
      )}
    </motion.div>
  )
}
