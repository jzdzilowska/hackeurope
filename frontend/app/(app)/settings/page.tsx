'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, RefreshCw, Zap, Building2, Users,
  Bell, Shield, CreditCard, Unlink, ArrowUpRight,
} from 'lucide-react'
import PageShell, { SectionHeader } from '@/components/layout/PageShell'
import { useDashboard } from '@/lib/dashboard-context'
import { formatCurrency, formatTimeAgo, cn } from '@/lib/utils'

const MOCK_TEAM = [
  { name: 'Alex Chen',     email: 'alex@techflowlabs.io',   role: 'Owner',  initials: 'AC', active: true  },
  { name: 'Priya Sharma',  email: 'priya@techflowlabs.io',  role: 'Admin',  initials: 'PS', active: true  },
  { name: 'Tom Müller',    email: 'tom@techflowlabs.io',    role: 'Viewer', initials: 'TM', active: false },
]

export default function SettingsPage() {
  const { org: mockOrg, accounts: mockAccounts } = useDashboard()
  const [orgName, setOrgName]           = useState(mockOrg.name)
  const [saved, setSaved]               = useState(false)
  const [notifMap, setNotifMap]         = useState({
    burnAlert:    true,
    weeklyDigest: true,
    approvals:    true,
    anomalies:    false,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const toggleNotif = (key: keyof typeof notifMap) =>
    setNotifMap(m => ({ ...m, [key]: !m[key] }))

  return (
    <PageShell tag="SETTINGS" title="Configuration">

      {/* ── Organisation ── */}
      <div>
        <SectionHeader tag="ORG" title="Organisation" />
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled block mb-2">
                Company name
              </label>
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled block mb-2">
                Business type
              </label>
              <div className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm text-text-secondary flex items-center justify-between">
                <span>{mockOrg.businessType === 'software' ? 'Software / Services' : 'Physical Goods'}</span>
                <span className="text-2xs text-text-disabled px-2 py-0.5 rounded bg-surface border border-border/50">
                  {mockOrg.businessType === 'software' ? 'Software mode' : 'COGS mode'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled block mb-2">
                Team size
              </label>
              <div className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm text-text-secondary">
                {mockOrg.employeeCount} people
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled block mb-2">
                Stripe Customer ID
              </label>
              <div className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm mono text-text-muted">
                {mockOrg.stripeCustomerId}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/30">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                saved
                  ? 'bg-success/12 text-success border border-success/25'
                  : 'bg-accent text-black hover:bg-accent-hover'
              )}
            >
              {saved ? <><CheckCircle2 size={14} /> Saved</> : 'Save changes'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Connected accounts ── */}
      <div>
        <SectionHeader tag="CONNECTIONS" title="Connected Banks" action="Add account" />
        <div className="space-y-2">
          {mockAccounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card p-4 flex items-center gap-4 group hover:border-border-focus transition-all"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: acc.institutionColor }}
              >
                {acc.institution.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{acc.officialName}</p>
                <p className="text-2xs text-text-muted capitalize">{acc.type} · {acc.currency}</p>
              </div>
              <div className="text-right flex-shrink-0 mr-2">
                <p className="text-sm font-semibold mono text-text-primary">
                  {formatCurrency(acc.currentBalance, acc.currency, true)}
                </p>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 14 }}
                  >
                    <RefreshCw size={9} className="text-text-disabled" />
                  </motion.div>
                  <span className="text-2xs text-text-disabled">{formatTimeAgo(acc.lastSynced)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/8 border border-success/20 text-2xs text-success font-medium">
                  <CheckCircle2 size={10} /> Connected
                </span>
                <button className="p-2 rounded-lg text-text-disabled hover:text-danger hover:bg-danger/8 transition-all opacity-0 group-hover:opacity-100">
                  <Unlink size={13} />
                </button>
              </div>
            </motion.div>
          ))}

          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/50 hover:border-accent/30 hover:bg-accent/[0.02] transition-all text-xs text-text-disabled hover:text-accent group">
            <Building2 size={13} className="group-hover:text-accent transition-colors" />
            Connect another bank account
          </button>
        </div>
      </div>

      {/* ── Integrations ── */}
      <div>
        <SectionHeader tag="INTEGRATIONS" title="Connected Services" />
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              name:    'Stripe',
              desc:    'Payment processing & auto-pay',
              icon:    CreditCard,
              color:   '#635BFF',
              status:  'connected',
              detail:  mockOrg.stripeCustomerId,
            },
            {
              name:    'Supabase',
              desc:    'Database & real-time sync',
              icon:    Shield,
              color:   '#3ECF8E',
              status:  'connected',
              detail:  'project_techflow_prod',
            },
            {
              name:    'Claude AI',
              desc:    'Financial insights engine',
              icon:    Zap,
              color:   '#CC785C',
              status:  'connected',
              detail:  'claude-sonnet-4-5',
            },
            {
              name:    'Slack',
              desc:    'Payment approval notifications',
              icon:    Bell,
              color:   '#4A154B',
              status:  'disconnected',
              detail:  'Not configured',
            },
          ].map((intg, i) => {
            const Icon = intg.icon
            return (
              <motion.div
                key={intg.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="card p-4 flex items-center gap-3 group hover:border-border-focus transition-all"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${intg.color}22` }}
                >
                  <Icon size={16} style={{ color: intg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{intg.name}</p>
                  <p className="text-2xs text-text-muted truncate">{intg.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn(
                    'text-2xs font-medium px-2 py-0.5 rounded-pill border',
                    intg.status === 'connected'
                      ? 'bg-success/8 text-success border-success/20'
                      : 'bg-surface-raised text-text-muted border-border/50'
                  )}>
                    {intg.status === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                  <span className="text-[10px] text-text-disabled mono">{intg.detail}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Team ── */}
      <div>
        <SectionHeader tag="TEAM" title="Members" action="Invite member" />
        <div className="card overflow-hidden divide-y divide-border/30">
          {MOCK_TEAM.map((member, i) => (
            <motion.div
              key={member.email}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-4 px-5 py-4 hover:bg-surface-raised/20 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-text-primary flex-shrink-0"
                style={{
                  background: member.active
                    ? 'linear-gradient(135deg, rgba(44,41,38,0.12) 0%, rgba(44,41,38,0.06) 100%)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${member.active ? 'rgba(44,41,38,0.25)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {member.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{member.name}</p>
                <p className="text-2xs text-text-muted">{member.email}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  'text-2xs px-2 py-0.5 rounded-pill border',
                  member.role === 'Owner' ? 'bg-accent/8 text-accent border-accent/20'
                  : member.role === 'Admin' ? 'bg-surface-raised text-text-secondary border-border/50'
                                           : 'bg-surface text-text-muted border-border/30'
                )}>
                  {member.role}
                </span>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  member.active ? 'bg-success' : 'bg-border'
                )} title={member.active ? 'Online' : 'Offline'} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Notifications ── */}
      <div>
        <SectionHeader tag="ALERTS" title="Notifications" />
        <div className="card overflow-hidden divide-y divide-border/30">
          {([
            { key: 'burnAlert',    label: 'Burn rate alerts',       desc: 'Notify when burn increases >10% MoM'          },
            { key: 'weeklyDigest', label: 'Weekly digest',          desc: 'Sunday summary of spend, runway, and insights' },
            { key: 'approvals',   label: 'Payment approvals',       desc: 'Get notified when new payments need sign-off'  },
            { key: 'anomalies',   label: 'Spending anomalies',      desc: 'Flag unexpected charges vs. historical average' },
          ] as const).map((notif, i) => (
            <div
              key={notif.key}
              className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised/20 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{notif.label}</p>
                <p className="text-2xs text-text-muted mt-0.5">{notif.desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(notif.key)}
                className={cn(
                  'relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0',
                  notifMap[notif.key] ? 'bg-accent' : 'bg-surface-raised border border-border'
                )}
                style={{ minWidth: '2.5rem', height: '1.375rem' }}
              >
                <motion.div
                  animate={{ x: notifMap[notif.key] ? 18 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute top-[3px] w-[15px] h-[15px] rounded-full bg-white shadow-sm"
                />
              </button>
            </div>
          ))}
        </div>
      </div>

    </PageShell>
  )
}
