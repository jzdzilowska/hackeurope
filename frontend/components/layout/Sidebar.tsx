'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, Zap, Plus, Sun, Moon, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
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

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-border/40 bg-surface z-20">

      {/* ── Logo ── */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#1C1B18' }}
          >
            <Zap size={13} style={{ color: '#F0EDE8' }} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">Runwave</span>
        </div>
      </div>

      {/* ── Org pill ── */}
      <div className="px-4 mb-7">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-background border border-border/60">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(44,41,38,0.10)' }}
          >
            <span className="text-[10px] font-bold text-accent">
              {mockOrg.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-text-primary truncate leading-tight">{mockOrg.name}</p>
            <p className="text-[11px] text-text-muted">{mockOrg.employeeCount} people</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable middle: nav + stats ── */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
        {/* ── Nav — circle-dot style ── */}
        <nav className="px-3 space-y-0.5">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 1 }}
                  transition={{ duration: 0.1 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative group',
                    active
                      ? 'bg-background text-text-primary'
                      : 'text-text-muted hover:text-text-secondary hover:bg-background/60'
                  )}
                >
                  {/* Circle dot indicator */}
                  <div className={cn(
                    'w-[17px] h-[17px] rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-200',
                    active
                      ? 'border-accent/50 bg-accent/8'
                      : 'border-border/50 group-hover:border-border-focus'
                  )}>
                    {active && (
                      <motion.div
                        layoutId="nav-dot"
                        className="w-[5px] h-[5px] rounded-full bg-accent"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                  </div>
                  <span className={cn('font-medium text-[13px]', active ? 'text-text-primary' : '')}>
                    {label}
                  </span>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* ── Quick stats ── */}
        <div className="px-4 mt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-disabled px-3 mb-3">
            Snapshot
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl">
              <TrendingUp size={11} className="text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-muted leading-tight">Cash</p>
                <p className="text-xs font-semibold mono text-text-primary">
                  {formatCurrency(mockKPIs.totalCashPosition, 'EUR', true)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl">
              <TrendingDown size={11} className="text-danger flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-muted leading-tight">Monthly costs</p>
                <p className="text-xs font-semibold mono text-text-primary">
                  {formatCurrency(mockKPIs.monthlyBurn, 'EUR', true)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl">
              <Receipt size={11} className="text-warning flex-shrink-0" />
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
          <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border/60 hover:border-accent/30 hover:bg-accent/[0.03] transition-all text-xs text-text-disabled hover:text-accent group">
            <Plus size={11} className="group-hover:text-accent transition-colors" />
            Connect bank
          </button>
        </div>
      </div>

      {/* ── Theme toggle + Settings row ── */}
      <div className="px-3 pb-5 border-t border-border/30 pt-3 space-y-0.5">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-text-secondary hover:bg-background transition-colors cursor-pointer text-xs"
        >
          {theme === 'dark' ? <Sun size={12} strokeWidth={1.8} /> : <Moon size={12} strokeWidth={1.8} />}
          <span className="text-[13px]">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <Link href="/settings">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-text-secondary hover:bg-background transition-colors cursor-pointer">
            <Settings size={12} strokeWidth={1.8} />
            <span className="text-[13px]">Settings</span>
          </div>
        </Link>
      </div>
    </aside>
  )
}
