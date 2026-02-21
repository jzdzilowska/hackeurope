'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, CheckCircle2, Loader2, ArrowRight, Zap } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

type Step = 'org' | 'connect' | 'syncing' | 'done'

const MOCK_BANKS = [
  { id: 'boi',     name: 'Bank of Ireland',  balance: 47230.50, color: '#0E4FA8', delay: 0    },
  { id: 'revolut', name: 'Revolut Business', balance: 38920.00, color: '#191C1F', delay: 1200 },
  { id: 'wise',    name: 'Wise',             balance: 12840.75, color: '#9FE870', delay: 2400 },
]

const SYNC_STEPS = [
  { label: 'Authenticating with Plaid',    ms: 0    },
  { label: 'Fetching transaction history', ms: 1000 },
  { label: 'Categorising transactions',    ms: 2200 },
  { label: 'Calculating runway & burn',    ms: 3200 },
  { label: 'Generating AI insights',       ms: 4000 },
  { label: 'Ready',                        ms: 4800 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]           = useState<Step>('org')
  const [orgName, setOrgName]     = useState('')
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [syncStep, setSyncStep]   = useState(-1)

  const startConnect = (bankId: string) => {
    // Simulate Plaid Link modal → instant connect for demo
    setTimeout(() => {
      setConnected(prev => new Set([...prev, bankId]))
    }, 800)
  }

  const startSync = () => {
    setStep('syncing')
    SYNC_STEPS.forEach((s, i) => {
      setTimeout(() => setSyncStep(i), s.ms + 400)
    })
    setTimeout(() => setStep('done'), 5800)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Aurora background glow */}
      <div className="fixed inset-0 pointer-events-none"
           style={{
             background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201,230,81,0.15) 0%, transparent 60%)',
           }}
      />

      <div className="relative z-10 w-full max-w-[440px]">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-glow"
               style={{ background: 'linear-gradient(135deg, #D9F060 0%, #F5EFA0 60%, #E8DDD0 100%)' }}>
            <Zap size={16} className="text-black" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-text-primary">HELM</span>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Org setup ── */}
          {step === 'org' && (
            <motion.div
              key="org"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text-primary mb-2">Set up your workspace</h2>
                <p className="text-sm text-text-muted">We'll pull in your finances automatically.</p>
              </div>

              <div className="card p-6 space-y-4">
                <div>
                  <label className="label block mb-2">Company name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="TechFlow Labs"
                    className="w-full bg-surface-raised border border-border/60 rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="label block mb-2">Team size</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['1–5', '6–20', '21–50', '50+'].map(size => (
                      <button key={size}
                        className="py-2 rounded-lg border border-border/60 text-xs text-text-secondary hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all">
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('connect')}
                disabled={!orgName.trim()}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                  orgName.trim()
                    ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]'
                    : 'bg-surface-raised text-text-disabled cursor-not-allowed'
                )}
              >
                Continue <ArrowRight size={14} />
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Connect banks ── */}
          {step === 'connect' && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text-primary mb-2">Connect your accounts</h2>
                <p className="text-sm text-text-muted">Secure read-only access via Plaid. No credentials stored.</p>
              </div>

              <div className="space-y-3">
                {MOCK_BANKS.map(bank => {
                  const isConnected = connected.has(bank.id)
                  return (
                    <motion.div
                      key={bank.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: MOCK_BANKS.indexOf(bank) * 0.08 }}
                      className={cn(
                        'card p-4 flex items-center gap-4 transition-all',
                        isConnected && 'border-success/30 bg-success/[0.03]'
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center flex-shrink-0"
                           style={{ backgroundColor: bank.color + '22' }}>
                        <Building2 size={16} style={{ color: bank.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{bank.name}</p>
                        {isConnected && (
                          <motion.p
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-success mono"
                          >
                            {formatCurrency(bank.balance, 'EUR')}
                          </motion.p>
                        )}
                      </div>

                      {isConnected ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <CheckCircle2 size={18} className="text-success" />
                        </motion.div>
                      ) : (
                        <button
                          onClick={() => startConnect(bank.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border/60 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all"
                        >
                          <Plus size={12} /> Connect
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              <button
                onClick={startSync}
                disabled={connected.size === 0}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                  connected.size > 0
                    ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]'
                    : 'bg-surface-raised text-text-disabled cursor-not-allowed'
                )}
              >
                {connected.size === 0
                  ? 'Connect at least one account'
                  : `Sync ${connected.size} account${connected.size !== 1 ? 's' : ''}`
                }
                {connected.size > 0 && <ArrowRight size={14} />}
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Syncing ── */}
          {step === 'syncing' && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="card p-8 text-center space-y-6"
            >
              {/* Aurora pulse */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute w-20 h-20 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(201,230,81,0.3) 0%, transparent 70%)' }}
                />
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, #D9F060 0%, #F5EFA0 60%, #E8DDD0 100%)' }}>
                  <Zap size={22} className="text-black" strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">Pulling in your finances</h3>
                <p className="text-sm text-text-muted">This takes about 5 seconds</p>
              </div>

              <div className="space-y-2 text-left">
                {SYNC_STEPS.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: syncStep >= i ? 1 : 0.25, x: 0 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {syncStep > i ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 size={14} className="text-success" />
                        </motion.div>
                      ) : syncStep === i ? (
                        <Loader2 size={13} className="text-accent animate-spin" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                      )}
                    </div>
                    <span className={cn(
                      'text-xs',
                      syncStep >= i ? 'text-text-primary' : 'text-text-muted'
                    )}>
                      {s.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-8 text-center space-y-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 size={26} className="text-success" />
              </motion.div>

              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1">You're all set</h3>
                <p className="text-sm text-text-muted">
                  3 accounts connected · 847 transactions imported · 5 insights generated
                </p>
              </div>

              {/* Preview stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Cash position', value: '€98,991' },
                  { label: 'Runway',         value: '6.5 mo'  },
                  { label: 'Monthly burn',   value: '€15.2k'  },
                ].map(stat => (
                  <div key={stat.label} className="bg-surface-raised rounded-lg p-3 border border-border/50">
                    <p className="text-base font-bold mono text-text-primary">{stat.value}</p>
                    <p className="text-2xs text-text-muted mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-black hover:bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Open HELM <ArrowRight size={14} />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
