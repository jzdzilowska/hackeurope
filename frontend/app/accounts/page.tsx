'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import PageShell, { SectionHeader } from '@/components/layout/PageShell'
import { useDashboard } from '@/lib/dashboard-context'
import { formatCurrency, formatDate, formatTimeAgo, cn } from '@/lib/utils'
import type { HelmCategory, Transaction } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  Infrastructure: '#5B9BD5', 'SaaS & Tools': '#E87878', Payroll: '#7AC0A8',
  Marketing: '#6898C8', 'Office & Rent': '#C89850', Revenue: '#5B9BD5', Other: '#888',
}

const ALL_CATS: (HelmCategory | 'All')[] = [
  'All', 'Revenue', 'Infrastructure', 'SaaS & Tools', 'Payroll', 'Marketing', 'Office & Rent',
]

function groupByDate(txns: Transaction[]) {
  const groups: Record<string, Transaction[]> = {}
  txns.forEach(t => {
    const label = (() => {
      const d = new Date(t.date), now = new Date()
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
      if (diff === 0) return 'Today'
      if (diff === 1) return 'Yesterday'
      const week = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      if (diff < 7) return week[d.getDay()]
      return formatDate(t.date)
    })()
    if (!groups[label]) groups[label] = []
    groups[label].push(t)
  })
  return groups
}

export default function AccountsPage() {
  const { accounts, transactions, kpis } = useDashboard()
  const [activeFilter, setActiveFilter] = useState<HelmCategory | 'All'>('All')

  const filtered = activeFilter === 'All'
    ? transactions
    : transactions.filter(t => t.helmCategory === activeFilter)
  const grouped = groupByDate(filtered)

  return (
    <PageShell tag="BANKING" title="Accounts">
      {/* ── Account cards ── */}
      <div>
        <SectionHeader tag="CONNECTED" title="Bank Accounts" action="Add account" />
        <div className="grid grid-cols-3 gap-3">
          {accounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22,1,0.36,1] }}
              className="relative card p-5 overflow-hidden group hover:border-border-focus transition-all"
            >
              {/* Institution colour bloom */}
              <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 opacity-40"
                style={{
                  background: `radial-gradient(circle at 80% 20%, ${acc.institutionColor}55, transparent 70%)`,
                  filter: 'blur(18px)',
                }}
              />

              <div className="relative z-10">
                {/* Institution badge + sync */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: acc.institutionColor }}
                    >
                      {acc.institution.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary leading-tight">{acc.institution}</p>
                      <p className="text-2xs text-text-muted capitalize">{acc.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-2xs text-text-disabled">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 16 }}
                    >
                      <RefreshCw size={9} />
                    </motion.div>
                    <span>{formatTimeAgo(acc.lastSynced)}</span>
                  </div>
                </div>

                {/* Balance */}
                <div className="mb-3">
                  <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-disabled mb-1">Current balance</p>
                  <p className="text-3xl font-bold mono tracking-tight text-text-primary leading-none">
                    {formatCurrency(acc.currentBalance, acc.currency, true)}
                  </p>
                </div>

                {/* Available vs current diff */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <div>
                    <p className="text-2xs text-text-disabled mb-0.5">Available</p>
                    <p className="text-xs mono font-medium text-text-secondary">
                      {formatCurrency(acc.availableBalance, acc.currency, true)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs text-text-disabled mb-0.5">Pending</p>
                    <p className="text-xs mono font-medium text-warning">
                      −{formatCurrency(acc.currentBalance - acc.availableBalance, acc.currency, true)}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-border group-hover:text-text-muted transition-colors"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary strip */}
        <div className="mt-3 flex items-center gap-4 px-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-success" />
            <span className="text-xs text-text-muted">
              Total across accounts:
              <span className="mono font-semibold text-text-primary ml-1.5">
                {formatCurrency(kpis.totalCashPosition, 'USD')}
              </span>
            </span>
          </div>
          <span className="text-border">·</span>
          <span className="text-xs text-text-muted">
            <span className="text-success font-medium">+7.2%</span> vs last month
          </span>
        </div>
      </div>

      {/* ── Transaction history ── */}
      <div>
        <SectionHeader tag="TRANSACTIONS" title="Recent Activity" action="Export CSV" />

        {/* Category filter tabs */}
        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          {ALL_CATS.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeFilter === cat
                  ? 'bg-accent/12 text-accent border border-accent/25'
                  : 'text-text-muted border border-border/50 hover:border-border-focus hover:text-text-secondary'
              )}
            >
              {cat !== 'All' && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                  style={{ background: CATEGORY_COLORS[cat] ?? '#888' }}
                />
              )}
              {cat}
            </button>
          ))}
        </div>

        {/* Grouped transaction list */}
        <div className="card overflow-hidden divide-y divide-border/30">
          <AnimatePresence mode="popLayout">
            {Object.entries(grouped).map(([dateLabel, txns]) => (
              <motion.div
                key={dateLabel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                layout
              >
                {/* Date group header */}
                <div className="px-5 py-2 bg-surface/40">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled">
                    {dateLabel}
                  </span>
                </div>

                {/* Transactions */}
                {txns.map((txn, i) => {
                  const isCredit = txn.amount > 0
                  const acc = accounts.find(a => a.id === txn.accountId)
                  return (
                    <motion.div
                      key={txn.id}
                      layout
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-raised/40 transition-colors group"
                    >
                      {/* Merchant icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-2xs font-bold text-text-muted border border-border/50"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                      >
                        {txn.merchantLogoUrl ? (
                          <img
                            src={txn.merchantLogoUrl}
                            alt=""
                            className="w-5 h-5 rounded object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          txn.merchantName.slice(0,2).toUpperCase()
                        )}
                      </div>

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate leading-tight">
                          {txn.merchantName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: `${CATEGORY_COLORS[txn.helmCategory] ?? '#888'}18`,
                              color: CATEGORY_COLORS[txn.helmCategory] ?? '#888',
                            }}
                          >
                            {txn.helmCategory}
                          </span>
                          {txn.recurringId && (
                            <span className="text-2xs text-text-disabled">recurring</span>
                          )}
                        </div>
                      </div>

                      {/* Account badge */}
                      {acc && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: acc.institutionColor }}
                          />
                          <span className="text-2xs text-text-disabled">{acc.institution}</span>
                        </div>
                      )}

                      {/* Amount */}
                      <div className="text-right flex-shrink-0 w-24">
                        <p className={cn(
                          'text-sm font-semibold mono',
                          isCredit ? 'text-success' : 'text-text-primary'
                        )}>
                          {isCredit ? '+' : ''}
                          {formatCurrency(Math.abs(txn.amount), txn.currency, true)}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  )
}
