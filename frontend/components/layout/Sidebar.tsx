'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, Zap, Plus, Sun, Moon } from 'lucide-react'
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
  const { org: mockOrg, accounts: mockAccounts } = useDashboard()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="w-[210px] flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-border/50 bg-background/95 backdrop-blur-sm z-20">

      {/* ── Logo ── */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #00D4A0 0%, #7FEDD4 40%, #C0F5E8 70%, #F0FAF8 100%)',
              boxShadow: '0 0 14px rgba(0,212,160,0.18)',
            }}
          >
            <Zap size={13} className="text-black" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">HELM</span>
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
            <p className="text-2xs text-text-muted">{mockOrg.employeeCount} people</p>
          </div>
        </div>
      </div>

      {/* ── Nav — circle-dot style (Dwarf-inspired) ── */}
      <nav className="flex-1 px-4 space-y-0.5">
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
                    : 'text-text-muted hover:text-text-secondary'
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

      {/* ── Live accounts summary ── */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-disabled px-3 mb-2">
          Accounts
        </p>
        {mockAccounts.map(acc => (
          <div
            key={acc.id}
            className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-surface-raised/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: acc.institutionColor }}
              />
              <span className="text-xs text-text-muted truncate">{acc.institution}</span>
            </div>
            <span className="text-xs mono text-text-secondary flex-shrink-0 ml-2">
              {formatCurrency(acc.currentBalance, acc.currency, true)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Connect account CTA ── */}
      <div className="px-4 pb-6">
        <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/50 hover:border-accent/30 hover:bg-accent/[0.03] transition-all text-xs text-text-disabled hover:text-accent group">
          <Plus size={12} className="group-hover:text-accent transition-colors" />
          Connect bank
        </button>
      </div>

      {/* ── Theme toggle + Settings row ── */}
      <div className="px-4 pb-5 border-t border-border/30 pt-3 space-y-0.5">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-surface-raised/60 transition-colors cursor-pointer text-xs"
        >
          {theme === 'dark' ? <Sun size={13} strokeWidth={1.8} /> : <Moon size={13} strokeWidth={1.8} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
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
