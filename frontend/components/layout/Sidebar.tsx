'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Settings, Plus, Sun, Moon, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn, formatCurrency } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'

const navItems = [
  { href: '/dashboard', label: 'Overview'     },
  { href: '/accounts',  label: 'Accounts'     },
  { href: '/payments',  label: 'Payments'     },
  { href: '/insights',  label: 'Insights'     },
  { href: '/settings',  label: 'Settings'     },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { org: mockOrg, kpis: mockKPIs } = useDashboard()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <aside className="w-[210px] flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-border/50 bg-background/95 backdrop-blur-sm z-20">

      {/* ── Logo ── */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/runwave-logo.png"
            alt="Runwave"
            width={28}
            height={28}
            className="w-7 h-7 object-contain dark:invert"
          />
          <span className="text-sm font-semibold tracking-tight text-text-primary">Runwave</span>
        </div>
      </div>

      {/* ── Org pill ── */}
      <div className="px-4 mb-8">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface/60 border border-border/50">
          <div
            className="w-6 h-6 rounded-md border border-accent/20 flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,160,0.10) 0%, rgba(0,212,160,0.06) 100%)' }}
          >
            <span className="text-[10px] font-bold text-accent">
              {mockOrg.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate leading-tight">{mockOrg.name}</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable middle: nav + accounts ── */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
        {/* ── Nav — circle-dot style (Dwarf-inspired) ── */}
        <nav className="px-4 space-y-0.5">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.12 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative group',
                    active
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {/* Circle dot indicator */}
                  <div className={cn(
                    'w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 transition-all',
                    active
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-border/60 group-hover:border-border-focus'
                  )}>
                    {active && (
                      <motion.div
                        layoutId="nav-dot"
                        className="w-1.5 h-1.5 rounded-full bg-accent"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                  </div>

                  <span className={cn('font-medium text-[13px]', active && 'text-text-primary')}>
                    {label}
                  </span>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* ── Quick stats ── */}
        <div className="px-4 mt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted px-3 mb-2.5">
            Snapshot
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface/60">
              <TrendingUp size={12} className="text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-muted leading-tight">Cash</p>
                <p className="text-xs font-semibold mono text-text-primary">
                  {formatCurrency(mockKPIs.totalCashPosition, 'EUR', true)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface/60">
              <TrendingDown size={12} className="text-danger flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-muted leading-tight">Monthly costs</p>
                <p className="text-xs font-semibold mono text-text-primary">
                  {formatCurrency(mockKPIs.monthlyBurn, 'EUR', true)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface/60">
              <Receipt size={12} className="text-warning flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-muted leading-tight">Payables due</p>
                <p className="text-xs font-semibold mono text-text-primary">
                  {formatCurrency(mockKPIs.dueSoon, 'EUR', true)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Connect account CTA ── */}
        <div className="px-4 py-6">
          <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/50 hover:border-accent/30 hover:bg-accent/[0.03] transition-all text-xs text-text-muted hover:text-accent group">
            <Plus size={12} className="group-hover:text-accent transition-colors" />
            Connect bank
          </button>
        </div>
      </div>

      {/* ── Theme toggle + Settings row ── */}
      <div className="px-4 pb-5 border-t border-border/30 pt-3 space-y-0.5">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-surface-raised/60 transition-colors cursor-pointer text-xs"
        >
          {mounted && theme === 'dark' ? <Sun size={13} strokeWidth={1.8} /> : <Moon size={13} strokeWidth={1.8} />}
          <span>{mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <Link href="/settings">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-surface-raised/60 transition-colors cursor-pointer">
            <Settings size={13} strokeWidth={1.8} />
            <span className="text-xs">Settings</span>
          </div>
        </Link>
      </div>
    </aside>
  )
}
