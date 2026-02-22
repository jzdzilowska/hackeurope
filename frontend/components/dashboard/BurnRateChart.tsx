'use client'

import { motion } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useDashboard } from '@/lib/dashboard-context'
import { formatCurrency } from '@/lib/utils'

const C = {
  revenue: '#00D87A',  // neon teal-green
  burn:    '#FF4F4F',  // electric coral-red
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2.5 text-xs space-y-1 min-w-[140px]">
      <p className="text-text-muted font-medium mb-1.5">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.revenue }} />
          <span className="text-text-secondary">Revenue</span>
        </span>
        <span className="mono text-text-primary">{formatCurrency(payload[0]?.value ?? 0, 'EUR', true)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.burn }} />
          <span className="text-text-secondary">Costs</span>
        </span>
        <span className="mono text-text-primary">{formatCurrency(payload[1]?.value ?? 0, 'EUR', true)}</span>
      </div>
    </div>
  )
}

export default function BurnRateChart() {
  const { burnData: mockBurnData } = useDashboard()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="label mb-0.5">Costs vs Revenue</p>
          <p className="text-xs text-text-muted">6-month view</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.revenue }} />
            Revenue
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.burn }} />
            Costs
          </span>
        </div>
      </div>

      <div className="flex-1 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockBurnData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={C.revenue} stopOpacity={0.28} />
                <stop offset="100%" stopColor={C.revenue} stopOpacity={0.0}  />
              </linearGradient>
              <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={C.burn} stopOpacity={0.28} />
                <stop offset="100%" stopColor={C.burn} stopOpacity={0.0}  />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--grid-tick)', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--grid-tick)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--cursor-line)', strokeWidth: 1 }} />

            <Area
              type="monotone" dataKey="revenue"
              stroke={C.revenue} strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false} activeDot={{ r: 4, fill: C.revenue, strokeWidth: 0 }}
            />
            <Area
              type="monotone" dataKey="burn"
              stroke={C.burn} strokeWidth={2}
              fill="url(#burnGrad)"
              dot={false} activeDot={{ r: 4, fill: C.burn, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
