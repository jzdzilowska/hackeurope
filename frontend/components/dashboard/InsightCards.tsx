'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, TrendingDown, Tag, Zap, BarChart2, X, ArrowRight } from 'lucide-react'
import { cn, formatTimeAgo } from '@/lib/utils'
import { mockInsights } from '@/lib/mock-data'
import type { InsightCard, InsightType } from '@/lib/types'

const iconMap: Record<InsightType, React.ReactNode> = {
  anomaly:      <AlertTriangle size={13} />,
  runway:       <TrendingDown size={13} />,
  subscription: <Tag size={13} />,
  saving:       <Zap size={13} />,
  margin:       <BarChart2 size={13} />,
}

const urgencyStyles: Record<string, string> = {
  high:   'bg-danger/10 text-danger border-danger/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low:    'bg-accent/10 text-accent border-accent/20',
}

function InsightCardItem({ card, onDismiss }: { card: InsightCard; onDismiss: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.22 }}
      className="card-hover flex-shrink-0 w-[260px] p-4 flex flex-col gap-3 relative group"
    >
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(card.id)}
        className="absolute top-3 right-3 p-1 rounded-md text-text-disabled hover:text-text-secondary hover:bg-surface-raised opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={11} />
      </button>

      {/* Header */}
      <div className="flex items-start gap-2.5 pr-5">
        <div className={cn('p-1.5 rounded-md border flex-shrink-0', urgencyStyles[card.urgency])}>
          {iconMap[card.type]}
        </div>
        <div>
          <p className="text-xs font-semibold text-text-primary leading-snug">{card.headline}</p>
          <p className="text-2xs text-text-muted mt-0.5">{formatTimeAgo(card.generatedAt)}</p>
        </div>
      </div>

      {/* Body */}
      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{card.body}</p>

      {/* Action */}
      {card.actionLabel && (
        <button className="flex items-center gap-1 text-2xs font-medium text-accent hover:text-accent-hover transition-colors mt-auto">
          {card.actionLabel}
          <ArrowRight size={11} />
        </button>
      )}
    </motion.div>
  )
}

export default function InsightCards() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = mockInsights.filter(c => !dismissed.has(c.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="label">AI Insights</p>
        <span className="text-2xs text-text-muted">{visible.length} active</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {visible.map((card) => (
            <InsightCardItem
              key={card.id}
              card={card}
              onDismiss={(id) => setDismissed(prev => new Set([...prev, id]))}
            />
          ))}
        </AnimatePresence>

        {/* Sage-cream "ask anything" CTA card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="flex-shrink-0 w-[180px] rounded-card overflow-hidden cursor-pointer group relative"
          style={{
            background: 'linear-gradient(135deg, #00D4A0 0%, #7FEDD4 38%, #C0F5E8 65%, #F0FAF8 100%)',
          }}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/6 transition-colors" />
          <div className="relative z-10 p-4 h-full flex flex-col justify-between" style={{ minHeight: '150px' }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.10)' }}
            >
              <span className="text-black/60 text-sm font-bold">+</span>
            </div>
            <div>
              <p className="text-2xs text-black/45 font-medium mb-0.5">Ask HELM</p>
              <p className="text-sm font-semibold text-black/75 leading-tight">Any financial question</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
