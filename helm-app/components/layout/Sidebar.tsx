'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, CreditCard, Lightbulb,
  Settings, Building2, Zap, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mockOrg, mockAccounts } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/accounts',   label: 'Accounts',   icon: Building2 },
  { href: '/payments',   label: 'Payments',   icon: CreditCard },
  { href: '/insights',   label: 'Insights',   icon: Lightbulb },
  { href: '/settings',   label: 'Settings',   icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-border/50 bg-background/80 backdrop-blur-sm z-20">

      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-aurora-card flex items-center justify-center shadow-glow-sm">
            <Zap size={14} className="text-black" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">HELM</span>
        </div>
      </div>

      {/* ── Org pill ── */}
      <div className="px-3 mb-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface border border-border/60">
          <div className="w-6 h-6 rounded-md bg-aurora-subtle border border-accent/20 flex items-center justify-center">
            <span className="text-2xs font-bold text-accent">
              {mockOrg.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate leading-tight">{mockOrg.name}</p>
            <p className="text-2xs text-text-muted">{mockOrg.employeeCount} people</p>
          </div>
          <ChevronRight size={12} className="text-text-muted flex-shrink-0" />
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                <span className={cn('font-medium', active && 'font-semibold')}>{label}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* ── Account balances summary ── */}
      <div className="px-3 pb-4 space-y-1">
        <p className="label px-3 mb-2">Accounts</p>
        {mockAccounts.map(acc => (
          <div
            key={acc.id}
            className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: acc.institutionColor }}
              />
              <span className="text-xs text-text-secondary truncate">{acc.institution}</span>
            </div>
            <span className="text-xs mono text-text-primary flex-shrink-0 ml-2">
              {formatCurrency(acc.currentBalance, acc.currency, true)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Connect bank CTA ── */}
      <div className="px-3 pb-5">
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-xs text-text-muted hover:text-accent group">
          <Building2 size={13} className="group-hover:text-accent" />
          Connect account
        </button>
      </div>
    </aside>
  )
}
