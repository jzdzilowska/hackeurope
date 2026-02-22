'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Loader2, ArrowRight, Zap, X,
  Cloud, Package, Code2, Truck, BarChart2,
  ShieldCheck, Server, Search,
  Briefcase, Users, Clock, User, Wallet, PiggyBank,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────
type Step         = 'type' | 'signin' | 'org' | 'email-scan' | 'connect' | 'syncing' | 'done'
type BusinessType = 'saas' | 'physical' | 'services' | 'individual'

interface MockAccount {
  id:       string
  name:     string
  balance:  number
  currency: string
  type:     string
  mask:     string
}

interface ConnectedItem {
  itemId:          string
  institutionName: string
  institutionLogo: string
  accounts:        MockAccount[]
}

// ── Mock institution data (Plaid sandbox test banks) ────────────────────
const MOCK_INSTITUTIONS = [
  {
    id:      'ins_109508',
    name:    'First Platypus Bank',
    color:   '#1A5276',
    abbr:    'FPB',
    accounts: [
      { id: 'acc_fpb_001', name: 'Plaid Checking', balance: 110.00,  currency: 'USD', type: 'depository', mask: '0000' },
      { id: 'acc_fpb_002', name: 'Plaid Saving',   balance: 210.00,  currency: 'USD', type: 'savings',    mask: '1111' },
    ],
  },
  {
    id:      'ins_109509',
    name:    'First Gingham Credit Union',
    color:   '#6C3483',
    abbr:    'FGC',
    accounts: [
      { id: 'acc_fgc_001', name: 'Plaid Checking', balance: 1120.00, currency: 'USD', type: 'depository', mask: '2222' },
      { id: 'acc_fgc_002', name: 'Plaid Saving',   balance: 840.00,  currency: 'USD', type: 'savings',    mask: '3333' },
    ],
  },
  {
    id:      'ins_109510',
    name:    'Tattersall Federal Credit Union',
    color:   '#1E8449',
    abbr:    'TFC',
    accounts: [
      { id: 'acc_tfc_001', name: 'Plaid Checking', balance: 2310.00, currency: 'USD', type: 'depository', mask: '4444' },
      { id: 'acc_tfc_002', name: 'Plaid Saving',   balance: 1550.00, currency: 'USD', type: 'savings',    mask: '5555' },
    ],
  },
  {
    id:      'ins_109511',
    name:    'Tartan Bank',
    color:   '#C0392B',
    abbr:    'TB',
    accounts: [
      { id: 'acc_tb_001', name: 'Plaid Checking', balance: 5340.00, currency: 'USD', type: 'depository', mask: '6666' },
      { id: 'acc_tb_002', name: 'Plaid Saving',   balance: 2890.00, currency: 'USD', type: 'savings',    mask: '7777' },
    ],
  },
]

// ── Sync steps ─────────────────────────────────────────────────────────
const SYNC_STEPS = [
  { label: 'Verifying bank connection',      ms: 0    },
  { label: 'Fetching transaction history',   ms: 1100 },
  { label: 'Categorising transactions',      ms: 2300 },
  { label: 'Calculating runway & burn',      ms: 3300 },
  { label: 'Generating AI insights',         ms: 4100 },
  { label: 'Building your dashboard',        ms: 4900 },
]

// ── Email scan steps (fake MCP inbox integration) ────────────────────────
const EMAIL_SCAN_STEPS = [
  { label: 'Connecting to email provider…',                   ms: 0    },
  { label: 'Scanning inbox for financial documents…',         ms: 1200 },
  { label: 'Finding invoices from suppliers & customers…',     ms: 2500 },
  { label: 'Categorising as payable vs receivable…',          ms: 3500 },
  { label: 'Importing into Runwave…',                            ms: 4300 },
]

// ── Business type cards ─────────────────────────────────────────────────
const BUSINESS_TYPES = [
  {
    id:       'saas' as BusinessType,
    label:    'SaaS / Software',
    tagline:  'Track burn, runway, and subscription costs',
    icons:    [Cloud, Code2, Server],
    gradient: 'linear-gradient(135deg, rgba(60,90,160,0.18) 0%, rgba(40,60,120,0.08) 100%)',
    border:   'rgba(80,110,200,0.25)',
    glow:     'rgba(70,100,200,0.12)',
    accent:   '#7090D0',
  },
  {
    id:       'physical' as BusinessType,
    label:    'Physical Goods',
    tagline:  'Monitor COGS, inventory, and variable costs',
    icons:    [Package, Truck, BarChart2],
    gradient: 'linear-gradient(135deg, rgba(150,100,50,0.18) 0%, rgba(110,70,30,0.08) 100%)',
    border:   'rgba(180,130,60,0.25)',
    glow:     'rgba(160,110,40,0.12)',
    accent:   '#C09050',
  },
  {
    id:       'services' as BusinessType,
    label:    'Services',
    tagline:  'Track billable hours, client payments, and overhead',
    icons:    [Briefcase, Users, Clock],
    gradient: 'linear-gradient(135deg, rgba(40,160,140,0.18) 0%, rgba(20,120,100,0.08) 100%)',
    border:   'rgba(50,180,160,0.25)',
    glow:     'rgba(40,170,150,0.12)',
    accent:   '#30B0A0',
  },
  {
    id:       'individual' as BusinessType,
    label:    'Individual',
    tagline:  'Monitor personal income, expenses, and savings',
    icons:    [User, Wallet, PiggyBank],
    gradient: 'linear-gradient(135deg, rgba(120,80,180,0.18) 0%, rgba(90,50,150,0.08) 100%)',
    border:   'rgba(140,100,200,0.25)',
    glow:     'rgba(130,90,190,0.12)',
    accent:   '#9070C0',
  },
]

// ── Mock Plaid Link Modal ───────────────────────────────────────────────
type PlaidStep = 'picker' | 'connecting' | 'success'

function MockPlaidModal({
  onClose,
  onConnected,
}: {
  onClose: () => void
  onConnected: (item: ConnectedItem) => void
}) {
  const [plaidStep, setPlaidStep]       = useState<PlaidStep>('picker')
  const [selectedInst, setSelectedInst] = useState<typeof MOCK_INSTITUTIONS[0] | null>(null)
  const [search, setSearch]             = useState('')
  const [progress, setProgress]         = useState(0)

  const filtered = MOCK_INSTITUTIONS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const startConnecting = (inst: typeof MOCK_INSTITUTIONS[0]) => {
    setSelectedInst(inst)
    setPlaidStep('connecting')
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 22 + 8
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setTimeout(() => setPlaidStep('success'), 300)
      }
      setProgress(Math.min(p, 100))
    }, 220)
  }

  const handleSuccess = () => {
    if (!selectedInst) return
    onConnected({
      itemId:          `item_${selectedInst.id}_${Date.now()}`,
      institutionName: selectedInst.name,
      institutionLogo: selectedInst.abbr,
      accounts:        selectedInst.accounts,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="relative bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: '420px', maxHeight: '580px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Plaid-style header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedInst && plaidStep !== 'picker' ? (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-2xs font-bold flex-shrink-0"
                  style={{ background: selectedInst.color, fontSize: '10px' }}
                >
                  {selectedInst.abbr}
                </div>
                <span className="text-sm font-semibold text-gray-800">{selectedInst.name}</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-gray-800">Connect a bank account</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content area */}
        <div className="overflow-y-auto" style={{ maxHeight: '460px' }}>
          <AnimatePresence mode="wait">

            {/* Institution picker */}
            {plaidStep === 'picker' && (
              <motion.div key="picker"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
                className="p-5"
              >
                {/* Search */}
                <div className="relative mb-4">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search for your bank..."
                    className="w-full bg-white pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    autoFocus
                  />
                </div>

                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 px-1">Popular institutions</p>

                <div className="space-y-1.5">
                  {filtered.map(inst => (
                    <button
                      key={inst.id}
                      onClick={() => startConnecting(inst)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: inst.color, fontSize: '10px' }}
                      >
                        {inst.abbr}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{inst.name}</p>
                        <p className="text-xs text-gray-400">{inst.accounts.length} account{inst.accounts.length !== 1 ? 's' : ''} available</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Connecting animation */}
            {plaidStep === 'connecting' && (
              <motion.div key="connecting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 flex flex-col items-center justify-center gap-5"
                style={{ minHeight: '240px' }}
              >
                <Loader2 size={32} className="animate-spin text-blue-500" />
                <div className="text-center space-y-1.5 w-full">
                  <p className="text-sm font-semibold text-gray-800">Connecting securely…</p>
                  <p className="text-xs text-gray-400">Verifying your credentials with {selectedInst?.name}</p>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </motion.div>
            )}

            {/* Success */}
            {plaidStep === 'success' && selectedInst && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-5 space-y-4"
              >
                <div className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Connected!</p>
                    <p className="text-xs text-gray-400">{selectedInst.accounts.length} account{selectedInst.accounts.length !== 1 ? 's' : ''} found</p>
                  </div>
                </div>

                {/* Account list */}
                <div className="space-y-2">
                  {selectedInst.accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{acc.name}</p>
                          <p className="text-2xs text-gray-400">····{acc.mask}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-800 tabular-nums">
                          {acc.currency} {acc.balance.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-2xs text-gray-400 capitalize">{acc.type}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSuccess}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={14} />
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Plaid-style footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-center gap-1.5">
          <ShieldCheck size={11} className="text-gray-300" />
          <span className="text-2xs text-gray-300">Secured by</span>
          <span className="text-2xs font-bold text-gray-400">Plaid</span>
          <span className="text-2xs text-gray-300 mx-1">·</span>
          <span className="text-2xs text-gray-300">256-bit TLS · Read-only</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main onboarding page ───────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep]                     = useState<Step>('type')
  const [bizType, setBizType]               = useState<BusinessType | null>(null)
  const [orgName, setOrgName]               = useState('')
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())
  const [teamSize, setTeamSize]             = useState<string>('')
  const [connectedItems, setConnectedItems] = useState<ConnectedItem[]>([])
  const [syncStep, setSyncStep]             = useState(-1)
  const [emailScanStep, setEmailScanStep]   = useState(-1)
  const [plaidOpen, setPlaidOpen]           = useState(false)
  const [kpis, setKpis]                     = useState<{ totalCashPosition: number; runway: number; monthlyBurn: number } | null>(null)

  useEffect(() => {
    if (step === 'done') {
      fetch('/api/dashboard/overview?user_id=c5cbf7bd-2801-407e-9efe-222d8e93fddc')
        .then(r => r.json())
        .then(data => { if (data.kpis) setKpis(data.kpis) })
        .catch(() => {})
    }
  }, [step])

  const openOAuthPopup = (provider: 'google' | 'github') => {
    const urls = {
      google: 'https://accounts.google.com/AccountChooser?continue=https%3A%2F%2Fmyaccount.google.com',
      github: 'https://github.com/login',
    }
    const w = 500, h = 600
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    const popup = window.open(urls[provider], `${provider}_auth`, `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)

    // Listen for when the user returns to this window (alt-tabbed or clicked back)
    const onFocus = () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(poll)
      // Small delay to feel natural
      setTimeout(() => {
        if (popup && !popup.closed) popup.close()
        setConnectedProviders(prev => new Set([...prev, provider]))
        setStep('org')
      }, 300)
    }
    window.addEventListener('focus', onFocus)

    // Fallback: also poll for popup close
    const poll = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(poll)
        window.removeEventListener('focus', onFocus)
        setConnectedProviders(prev => new Set([...prev, provider]))
        setStep('org')
      }
    }, 500)
  }

  const handleConnected = (item: ConnectedItem) => {
    setConnectedItems(prev => {
      const exists = prev.find(i => i.itemId === item.itemId)
      return exists ? prev : [...prev, item]
    })
  }

  const startEmailScan = () => {
    setStep('email-scan')
    setEmailScanStep(-1)
    EMAIL_SCAN_STEPS.forEach((s, i) => {
      setTimeout(() => setEmailScanStep(i), s.ms + 400)
    })
    setTimeout(() => setStep('connect'), 5600)
  }

  const startSync = () => {
    setStep('syncing')
    SYNC_STEPS.forEach((s, i) => {
      setTimeout(() => setSyncStep(i), s.ms + 400)
    })
    setTimeout(() => setStep('done'), 6200)
  }

  const totalAccounts = connectedItems.flatMap(i => i.accounts)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 55% at 80% 0%, rgba(80,120,45,0.20) 0%, rgba(55,90,25,0.09) 40%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 50% 45% at 5% 60%, rgba(28,70,50,0.10) 0%, transparent 55%)',
        }} />
      </div>

      {/* Mock Plaid modal */}
      <AnimatePresence>
        {plaidOpen && (
          <MockPlaidModal
            onClose={() => setPlaidOpen(false)}
            onConnected={handleConnected}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-[460px]">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2.5 mb-10"
        >
          <Image
            src="/runwave-logo.png"
            alt="Runwave"
            width={32}
            height={32}
            className="w-8 h-8 object-contain dark:invert"
          />
          <span className="text-base font-semibold tracking-tight text-text-primary">Runwave</span>
        </motion.div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['type', 'signin', 'org', 'email-scan', 'connect', 'syncing', 'done'] as Step[]).map((s) => {
            const stepOrder = ['type', 'signin', 'org', 'email-scan', 'connect', 'syncing', 'done']
            const current   = stepOrder.indexOf(step)
            const idx       = stepOrder.indexOf(s)
            return (
              <div
                key={s}
                className={cn(
                  'rounded-full transition-all duration-300',
                  idx < current  ? 'w-2 h-2 bg-accent'
                  : idx === current ? 'w-4 h-2 bg-accent'
                                    : 'w-2 h-2 bg-border'
                )}
              />
            )
          })}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Business type ── */}
          {step === 'type' && (
            <motion.div key="type"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} className="space-y-5"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-text-primary mb-1.5">
                  Select your industry
                </h2>
                <p className="text-sm text-text-muted">
                  This shapes how Runwave analyses your finances.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {BUSINESS_TYPES.map(bt => {
                  const selected = bizType === bt.id
                  return (
                    <motion.button
                      key={bt.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setBizType(bt.id)}
                      className={cn(
                        'relative w-full text-left rounded-card p-5 border transition-all duration-200 overflow-hidden',
                        selected ? 'border-opacity-60' : 'border-border hover:border-opacity-50'
                      )}
                      style={{
                        background: bt.gradient,
                        borderColor: selected ? bt.border : undefined,
                        boxShadow: selected ? `0 0 24px ${bt.glow}` : undefined,
                      }}
                    >
                      {selected && (
                        <motion.div
                          layoutId="type-selected"
                          className="absolute inset-0 rounded-card"
                          style={{ background: bt.gradient, opacity: 0.5 }}
                        />
                      )}

                      <div className="relative z-10 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-3">
                            {bt.icons.map((Icon, i) => (
                              <div
                                key={i}
                                className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10"
                                style={{ background: 'var(--overlay-subtle)' }}
                              >
                                <Icon size={13} style={{ color: bt.accent }} />
                              </div>
                            ))}
                          </div>
                          <p className="text-sm font-semibold text-text-primary mb-1">{bt.label}</p>
                          <p className="text-xs text-text-secondary">{bt.tagline}</p>
                        </div>

                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                          selected
                            ? 'border-accent bg-accent'
                            : 'border-border bg-transparent'
                        )}>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-black"
                            />
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <button
                onClick={() => setStep('signin')}
                disabled={!bizType}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-2',
                  bizType
                    ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]'
                    : 'bg-surface-raised text-text-disabled cursor-not-allowed'
                )}
              >
                Continue <ArrowRight size={14} />
              </button>
            </motion.div>
          )}

          {/* ── Step: Sign in ── */}
          {step === 'signin' && (
            <motion.div key="signin"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} className="space-y-5"
            >
              <div className="text-center mb-2">
                <h2 className="text-2xl font-bold text-text-primary mb-1.5">
                  Sign in to Runwave
                </h2>
                <p className="text-sm text-text-muted">
                  Connect your account to get started.
                </p>
              </div>

              <div className="card p-6 space-y-3">
                {/* Google OAuth button */}
                <button
                  onClick={() => connectedProviders.has('google')
                    ? setConnectedProviders(prev => { const next = new Set(prev); next.delete('google'); return next })
                    : openOAuthPopup('google')
                  }
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border text-sm transition-all',
                    connectedProviders.has('google')
                      ? 'border-success/50 bg-success/5 text-text-primary'
                      : 'border-border bg-surface-raised text-text-primary hover:border-accent/40 hover:bg-accent/5'
                  )}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="font-medium flex-1 text-left">Continue with Google</span>
                  {connectedProviders.has('google') && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
                </button>

                {/* GitHub OAuth button */}
                <button
                  onClick={() => connectedProviders.has('github')
                    ? setConnectedProviders(prev => { const next = new Set(prev); next.delete('github'); return next })
                    : openOAuthPopup('github')
                  }
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border text-sm transition-all',
                    connectedProviders.has('github')
                      ? 'border-success/50 bg-success/5 text-text-primary'
                      : 'border-border bg-surface-raised text-text-primary hover:border-accent/40 hover:bg-accent/5'
                  )}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span className="font-medium flex-1 text-left">Continue with GitHub</span>
                  {connectedProviders.has('github') && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-surface px-3 text-2xs text-text-muted">or continue with email</span></div>
                </div>

                {/* Email fallback */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="flex-1 bg-surface-raised border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                  />
                  <button
                    onClick={() => setConnectedProviders(prev => new Set([...prev, 'email']))}
                    className="px-4 py-3 rounded-lg border border-border text-sm font-medium text-text-secondary hover:border-accent/40 hover:text-accent transition-all"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <p className="text-2xs text-text-muted text-center">
                By continuing, you agree to Runwave&apos;s Terms of Service and Privacy Policy.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('type')}
                  className="px-4 py-3 rounded-xl text-sm font-medium border border-border text-text-secondary hover:border-border-focus hover:text-text-primary transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('org')}
                  disabled={connectedProviders.size === 0}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                    connectedProviders.size > 0
                      ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]'
                      : 'bg-surface-raised text-text-disabled cursor-not-allowed'
                  )}
                >
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step: Org setup ── */}
          {step === 'org' && (
            <motion.div key="org"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} className="space-y-5"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text-primary mb-1.5">Name your workspace</h2>
                <p className="text-sm text-text-muted">Takes 30 seconds. No credit card needed.</p>
              </div>

              <div className="card p-6 space-y-4">
                <div>
                  <label className="label block mb-2">Company name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Artisan Home Furnishings"
                    autoFocus
                    className="w-full bg-surface-raised border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                  />
                </div>

                <div>
                  <label className="label block mb-2">Team size</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['1–5', '6–20', '21–50', '50+'].map(size => (
                      <button
                        key={size}
                        onClick={() => setTeamSize(size)}
                        className={cn(
                          'py-2 rounded-lg border text-xs transition-all',
                          teamSize === size
                            ? 'border-accent/50 bg-accent/10 text-accent font-medium'
                            : 'border-border text-text-secondary hover:border-accent/30 hover:text-accent/80'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('signin')}
                  className="px-4 py-3 rounded-xl text-sm font-medium border border-border text-text-secondary hover:border-border-focus hover:text-text-primary transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => startEmailScan()}
                  disabled={!orgName.trim() || !teamSize}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                    orgName.trim() && teamSize
                      ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]'
                      : 'bg-surface-raised text-text-disabled cursor-not-allowed'
                  )}
                >
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step: Email scan (fake MCP inbox) ── */}
          {step === 'email-scan' && (
            <motion.div key="email-scan"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="card p-8 text-center space-y-7"
            >
              <div className="relative flex items-center justify-center py-2">
                <motion.div
                  animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.08, 0.3] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-24 h-24 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(0,120,212,0.28) 0%, transparent 70%)' }}
                />
                <div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4285F4 0%, #7BAAF7 40%, #B4D0FB 70%, #E8F0FE 100%)' }}
                >
                  <FileText size={24} className="text-white" strokeWidth={2} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">
                  Scanning your inbox
                </h3>
                <p className="text-sm text-text-muted">Looking for invoices, receipts, and financial documents…</p>
              </div>

              <div className="space-y-2.5 text-left">
                {EMAIL_SCAN_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {emailScanStep > i ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 size={14} className="text-success" />
                        </motion.div>
                      ) : emailScanStep === i ? (
                        <Loader2 size={13} className="text-blue-400 animate-spin" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                      )}
                    </div>
                    <span className={cn(
                      'text-xs transition-colors duration-300',
                      emailScanStep >= i ? 'text-text-primary' : 'text-text-muted'
                    )}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Connect (mock Plaid) ── */}
          {step === 'connect' && (
            <motion.div key="connect"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} className="space-y-5"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text-primary mb-1.5">
                  Connect your accounts
                </h2>
                <p className="text-sm text-text-muted">
                  Read-only access via Plaid. Bank credentials never stored.
                </p>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4">
                {['256-bit AES', 'Read-only', 'GDPR'].map(badge => (
                  <span key={badge} className="flex items-center gap-1.5 text-2xs text-text-muted">
                    <ShieldCheck size={10} className="text-accent" />
                    {badge}
                  </span>
                ))}
              </div>

              {/* Connected items */}
              <AnimatePresence>
                {connectedItems.map(item => (
                  <motion.div
                    key={item.itemId}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="card p-4 border-success/25 bg-success/[0.03]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-success" />
                        <p className="text-sm font-medium text-text-primary">{item.institutionName}</p>
                      </div>
                      <span className="badge-success text-2xs">Connected</span>
                    </div>
                    <div className="space-y-1 pl-5">
                      {item.accounts.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between">
                          <span className="text-xs text-text-secondary">{acc.name} ····{acc.mask}</span>
                          <span className="text-xs mono text-text-primary">
                            {acc.currency} {acc.balance.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Connect button */}
              <button
                onClick={() => setPlaidOpen(true)}
                className={cn(
                  'w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all',
                  connectedItems.length === 0
                    ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]'
                    : 'bg-surface border border-border text-text-secondary hover:border-accent/40 hover:text-accent hover:bg-accent/5'
                )}
              >
                <ShieldCheck size={14} />
                {connectedItems.length === 0 ? 'Connect bank account via Plaid' : '+ Connect another account'}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('org')}
                  className="px-4 py-3 rounded-xl text-sm font-medium border border-border text-text-secondary hover:border-border-focus hover:text-text-primary transition-all"
                >
                  Back
                </button>
                <button
                  onClick={startSync}
                  disabled={connectedItems.length === 0}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                    connectedItems.length > 0
                      ? 'bg-accent text-black hover:bg-accent-hover active:scale-[0.98]'
                      : 'bg-surface-raised text-text-disabled cursor-not-allowed'
                  )}
                >
                  {connectedItems.length === 0
                    ? 'Connect at least one account'
                    : `Sync ${totalAccounts.length} account${totalAccounts.length !== 1 ? 's' : ''}`
                  }
                  {connectedItems.length > 0 && <ArrowRight size={14} />}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Syncing ── */}
          {step === 'syncing' && (
            <motion.div key="syncing"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="card p-8 text-center space-y-7"
            >
              <div className="relative flex items-center justify-center py-2">
                <motion.div
                  animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.08, 0.3] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-24 h-24 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(44,41,38,0.28) 0%, transparent 70%)' }}
                />
                <div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)' }}
                >
                  <Zap size={24} className="text-black" strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">
                  Pulling in your finances
                </h3>
                <p className="text-sm text-text-muted">Syncing data from {connectedItems.length} institution{connectedItems.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="space-y-2.5 text-left">
                {SYNC_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
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
                      'text-xs transition-colors duration-300',
                      syncStep >= i ? 'text-text-primary' : 'text-text-muted'
                    )}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 'done' && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="card p-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl bg-success/12 border border-success/25 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 size={26} className="text-success" />
              </motion.div>

              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1.5">
                  You're all set, {orgName || 'there'}!
                </h3>
                <p className="text-sm text-text-muted">
                  {totalAccounts.length} account{totalAccounts.length !== 1 ? 's' : ''} connected
                  {' · '}
                  {bizType === 'physical' ? 'COGS tracking enabled'
                    : bizType === 'services' ? 'Services mode active'
                    : bizType === 'individual' ? 'Personal finance mode'
                    : 'SaaS mode active'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Cash position', value: kpis ? `$${(kpis.totalCashPosition / 1000).toFixed(1)}k` : '...' },
                  { label: 'Runway',         value: kpis ? `${kpis.runway} mo` : '...'  },
                  { label: 'Monthly burn',   value: kpis ? `$${(kpis.monthlyBurn / 1000).toFixed(1)}k` : '...'  },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.08 }}
                    className="bg-surface-raised rounded-lg p-3 border border-border"
                  >
                    <p className="text-base font-bold mono text-text-primary">{stat.value}</p>
                    <p className="text-2xs text-text-muted mt-0.5">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (orgName.trim()) localStorage.setItem('helm_org_name', orgName.trim())
                  if (teamSize) localStorage.setItem('helm_team_size', teamSize)
                  if (bizType) localStorage.setItem('helm_biz_type', bizType)
                  router.push('/dashboard')
                }}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-black hover:bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Open Runwave <ArrowRight size={14} />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
