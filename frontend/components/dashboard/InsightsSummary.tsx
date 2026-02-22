'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, TrendingDown, TrendingUp, Clock, Repeat2, BarChart2 } from 'lucide-react'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

interface InsightCard {
  id: string
  type: 'anomaly' | 'saving' | 'runway' | 'subscription' | 'margin'
  headline: string
  body: string
  actionLabel?: string
  dismissed: boolean
  generatedAt: string
  urgency: 'low' | 'medium' | 'high'
}

const typeConfig: Record<InsightCard['type'], { icon: React.FC<any>; color: string }> = {
  anomaly:      { icon: AlertTriangle, color: '#f43f5e' },
  saving:       { icon: TrendingDown,  color: '#22c55e' },
  runway:       { icon: Clock,         color: '#f59e0b' },
  subscription: { icon: Repeat2,       color: '#6366f1' },
  margin:       { icon: BarChart2,     color: '#06b6d4' },
}

const urgencyBg: Record<InsightCard['urgency'], string> = {
  high:   'bg-danger/8 border-danger/18',
  medium: 'bg-warning/8 border-warning/18',
  low:    'bg-border/30 border-border/40',
}

const urgencyDot: Record<InsightCard['urgency'], string> = {
  high:   'bg-danger',
  medium: 'bg-warning',
  low:    'bg-text-disabled',
}

export default function InsightsSummary() {
  const [insights, setInsights] = useState<InsightCard[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/dashboard/insights?user_id=${USER_ID}`)
      .then(r => r.json())
      .then(d => setInsights(d.insights ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visible = insights.filter(i => !dismissed.has(i.id) && !i.dismissed)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="card p-5 flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label mb-0.5">AI Insights</p>
          <p className="text-xs text-text-muted">Anomalies & opportunities</p>
        </div>
        {!loading && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/8 border border-accent/18 text-accent">
            {visible.length} active
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-disabled animate-pulse">Generating insights…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-8">
          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
            <TrendingUp size={16} className="text-success" />
          </div>
          <p className="text-xs text-text-muted">All clear — no anomalies detected.</p>
          <p className="text-[10px] text-text-disabled">Insights refresh with each data sync.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          <AnimatePresence initial={false}>
            {visible.map((insight, idx) => {
              const cfg = typeConfig[insight.type]
              const Icon = cfg.icon
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10, height: 0, marginBottom: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative rounded-xl border p-3 ${urgencyBg[insight.urgency]}`}
                >
                  {/* Dismiss */}
                  <button
                    onClick={() => setDismissed(prev => new Set([...prev, insight.id]))}
                    className="absolute top-2.5 right-2.5 text-text-disabled hover:text-text-muted transition-colors"
                  >
                    <X size={11} />
                  </button>

                  {/* Icon + headline */}
                  <div className="flex items-start gap-2.5 mb-1.5 pr-4">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: cfg.color + '20' }}
                    >
                      <Icon size={12} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${urgencyDot[insight.urgency]}`} />
                        <p className="text-xs font-semibold text-text-primary leading-snug">
                          {insight.headline}
                        </p>
                      </div>
                      <p className="text-[10px] text-text-muted leading-relaxed line-clamp-2">
                        {insight.body}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  {insight.actionLabel && (
                    <button className="ml-8 text-[10px] font-medium text-accent hover:text-accent/80 transition-colors">
                      {insight.actionLabel} →
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
