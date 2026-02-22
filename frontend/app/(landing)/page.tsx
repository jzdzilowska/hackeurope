'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView, useAnimation } from 'framer-motion'
import {
  Zap, ArrowRight, Check, Landmark, Sparkles, ScrollText,
  LineChart, BookOpen, AudioLines, Shield, Lock, CreditCard,
  ChevronRight, BarChart3, EyeOff, Hourglass, Banknote,
  Menu, X, Sun, Moon, ScanLine,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════
   ANIMATION HELPERS
   ═══════════════════════════════════════════════ */

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 2000
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{prefix}{count}{suffix}</span>
}

/* ═══════════════════════════════════════════════
   SECTION 1 — STICKY NAV
   ═══════════════════════════════════════════════ */

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300',
      scrolled
        ? 'bg-background/80 backdrop-blur-lg border-b border-border/30 shadow-lg shadow-black/20'
        : 'bg-transparent'
    )}>
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
        {/* Logo */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/runwave-logo.png"
              alt="Runwave"
              width={28}
              height={28}
              className="w-7 h-7 object-contain dark:invert"
            />
            <span className="text-sm font-semibold tracking-tight text-text-primary">Runwave</span>
          </Link>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center justify-center gap-8">
          <a href="#features" className="text-sm text-text-muted hover:text-text-primary transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-text-muted hover:text-text-primary transition-colors">Pricing</a>
          <a href="#about" className="text-sm text-text-muted hover:text-text-primary transition-colors">About</a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised/60 transition-colors"
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
          </button>
          <Link href="/onboarding" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="text-sm font-medium px-4 py-2 rounded-pill bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Start free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-text-muted" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-16 inset-x-0 bg-background/95 backdrop-blur-lg border-b border-border/30 px-6 py-6 space-y-4"
        >
          <a href="#features" onClick={() => setMobileOpen(false)} className="block text-sm text-text-secondary">Features</a>
          <a href="#pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-text-secondary">Pricing</a>
          <a href="#about" onClick={() => setMobileOpen(false)} className="block text-sm text-text-secondary">About</a>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 text-sm text-text-secondary"
          >
            {mounted && theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <hr className="border-border/30" />
          <Link href="/onboarding" className="block text-sm text-text-secondary">Sign in</Link>
          <Link
            href="/onboarding"
            className="block text-center text-sm font-medium px-4 py-2.5 rounded-pill bg-accent text-white"
          >
            Start free
          </Link>
        </motion.div>
      )}
    </nav>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 2 — HERO
   ═══════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(44,41,38,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center px-6">
        {/* Pill badge */}
        <FadeUp>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-accent/10 border border-accent/20 mb-8">
            <Zap size={12} className="text-accent" />
            <span className="text-xs font-medium text-accent">AI-Powered Financial Intelligence for Wholesale</span>
          </div>
        </FadeUp>

        {/* Headline */}
        <FadeUp delay={0.1}>
          <h1 className="text-4xl sm:text-5xl md:text-[64px] font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-sage-cream">See your true working capital —</span>
            <br />
            <span className="text-text-primary">not just your bank balance.</span>
          </h1>
        </FadeUp>

        {/* Subheadline */}
        <FadeUp delay={0.2}>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect multiple bank accounts, automatically extract invoices from Gmail, reconstruct historical cash positions, and project your balance forward based on real receivables and payables.
          </p>
        </FadeUp>

        {/* CTAs */}
        <FadeUp delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-pill bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all shadow-glow hover:shadow-teal-glow"
            >
              Start free
              <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-pill border border-border/60 text-text-secondary font-medium text-sm hover:border-border-focus hover:text-text-primary transition-all"
            >
              See how it works
            </a>
          </div>
          <p className="text-xs text-text-muted">
            No credit card required · Set up in 2 minutes
          </p>
        </FadeUp>

        {/* Trust badges */}
        <FadeUp delay={0.4}>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={12} className="text-accent/60" />
              Bank-grade encryption
            </span>
            <span className="text-text-disabled">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={12} className="text-accent/60" />
              Read-only access
            </span>
            <span className="text-text-disabled">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CreditCard size={12} className="text-accent/60" />
              Powered by Plaid
            </span>
          </div>
        </FadeUp>

        {/* Hero dashboard screenshot mock */}
        <FadeUp delay={0.5}>
          <div className="mt-16 relative">
            {/* Glow behind screenshot */}
            <div className="absolute inset-0 -inset-x-12 -inset-y-8 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(44,41,38,0.10) 0%, transparent 70%)',
              }}
            />
            <div
              className="relative rounded-xl border border-border/50 bg-surface overflow-hidden shadow-2xl"
              style={{
                perspective: '1200px',
              }}
            >
              <div style={{ transform: 'rotateX(2deg)', transformOrigin: 'bottom center' }}>
                {/* Mock dashboard UI */}
                <div className="p-6 sm:p-8">
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-accent">F</span>
                      </div>
                      <span className="text-sm font-medium text-text-primary">Furniture Wholesale Co.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-20 rounded-md bg-surface-raised" />
                      <div className="h-6 w-6 rounded-md bg-surface-raised" />
                    </div>
                  </div>

                  {/* Cash position hero */}
                  <div className="relative rounded-xl p-6 sm:p-8 mb-6 overflow-hidden" style={{
                    background: 'linear-gradient(135deg, rgba(44,41,38,0.08) 0%, rgba(44,41,38,0.03) 100%)',
                  }}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">Total Cash on Hand</p>
                    <div className="flex items-end gap-3 mb-3">
                      <span className="text-3xl sm:text-4xl font-bold mono text-text-primary">€247,891</span>
                      <span className="text-xs font-medium text-success px-2 py-0.5 rounded-pill bg-success/10 mb-1">+12.4%</span>
                    </div>
                    <div className="flex gap-4 text-xs text-text-muted">
                      <span>Bank of Ireland: €142,230</span>
                      <span>Revolut: €68,920</span>
                      <span>Wise: €36,741</span>
                    </div>
                  </div>

                  {/* KPI cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Cash Runway', value: '8.2 mo', color: 'text-success' },
                      { label: 'Monthly Costs', value: '€30,210', color: 'text-text-primary' },
                      { label: 'Due in 14 Days', value: '€18,450', color: 'text-warning' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="rounded-xl bg-surface-raised/50 border border-border/30 p-4">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-text-disabled mb-2">{kpi.label}</p>
                        <p className={cn('text-lg font-bold mono', kpi.color)}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 3 — TRUST BAR
   ═══════════════════════════════════════════════ */

function TrustBar() {
  return (
    <section className="py-16 border-y border-border/30 bg-surface-raised/10">
      <div className="max-w-6xl mx-auto px-6">
        <FadeUp>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-text-disabled mb-12">
            Integrated with the core financial stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
            {[
              { name: 'Plaid', logo: 'https://cdn.brandfetch.io/plaid.com/w/512/h/512/logo', label: 'Data Sync' },
              { name: 'Gemini', logo: 'https://cdn.brandfetch.io/google.com/w/512/h/512/logo', label: 'Multimodal OCR' },
              { name: 'Claude', logo: 'https://cdn.brandfetch.io/anthropic.com/w/512/h/512/logo', label: 'Financial Brain' },
              { name: 'Stripe', logo: 'https://cdn.brandfetch.io/stripe.com/w/512/h/512/logo', label: 'Stripe Billing' },
            ].map((item) => (
              <div key={item.name} className="flex flex-col items-center gap-3 group cursor-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.logo}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="rounded-xl"
                />
                <span className="text-sm font-bold text-text-primary tracking-tight">{item.name}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-disabled group-hover:text-text-muted transition-colors">{item.label}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 4 — PAIN POINTS
   ═══════════════════════════════════════════════ */

const painPoints = [
  {
    icon: Banknote,
    title: 'Cash flow surprises',
    desc: 'You pay suppliers in 15 days but customers pay you in 60. The gap distorts your working capital — and you only see it after the fact.',
    color: 'text-danger',
    bg: 'bg-danger/10',
  },
  {
    icon: ScrollText,
    title: 'Invoice chaos',
    desc: 'Invoices arrive by email, PDF, post. Runwave parses them automatically and matches them to bank transactions in real time.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: Hourglass,
    title: 'Slow-paying customers',
    desc: "Three customers are 30+ days late. Runwave builds a receivables matrix that shows exactly who owes you, how long, and how it impacts cash.",
    color: 'text-chart-amber',
    bg: 'bg-chart-amber/10',
  },
  {
    icon: EyeOff,
    title: 'Hidden cost creep',
    desc: "Material costs went up 15% but your prices didn't. Runwave detects price creep and supplier cost changes as they appear in transaction data.",
    color: 'text-chart-pink',
    bg: 'bg-chart-pink/10',
  },
]

function PainPoints() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-surface-raised/30">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          {/* Left Column: Sticky Heading */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-danger/10 border border-danger/20 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-danger">The Reality Gap</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-6 leading-[1.1]">
                Sound familiar? <br />
                <span className="text-text-muted">You're managing cash without seeing the cycle.</span>
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-md">
                Every wholesale business hits these structural problems. By the time they show up in your bank balance, the damage is already done.
              </p>
              
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-8 border border-border/40 shadow-2xl group">
                <Image 
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1000"
                  alt="Wholesale Warehouse"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Built for Wholesale</p>
                  <p className="text-white/90 text-sm font-medium leading-tight">Designed around the cash flow challenges of wholesale distribution.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-6 border-t border-border/40">
                <p className="text-xs text-text-muted font-medium">
                  Architected for high-volume wholesale operations.
                </p>
              </div>
            </FadeUp>
          </div>

          {/* Right Column: Creative Card Grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {painPoints.map((item, i) => (
                <FadeUp key={item.title} delay={i * 0.15}>
                  <div className="group relative bg-surface border border-border/50 rounded-2xl p-6 hover:border-border-focus transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden h-full flex flex-col">
                    {/* Background accent glow */}
                    <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500", item.bg.replace('10', '40'))} />

                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500', item.bg)}>
                      <item.icon size={22} className={item.color} />
                    </div>

                    <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center justify-between">
                      {item.title}
                      <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-text-disabled" />
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-8 flex-1">
                      {item.desc}
                    </p>

                    {/* Custom severity indicator */}
                    <div className="pt-4 border-t border-border/30 flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">Risk Impact</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((s) => (
                          <div key={s} className={cn(
                            "w-1.5 h-3 rounded-full transition-all duration-500",
                            s <= (i === 0 ? 4 : i === 3 ? 4 : 3)
                              ? (i === 0 || i === 3 ? "bg-danger" : "bg-warning")
                              : "bg-surface-high group-hover:bg-border"
                          )} />
                        ))}
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 5 — FEATURE BENTO GRID
   ═══════════════════════════════════════════════ */

const features = [
  {
    icon: Landmark,
    title: 'Multi-Bank Dashboard',
    desc: 'Connect all your accounts — see total cash on hand across every bank in one view.',
    span: 'col-span-1',
  },
  {
    icon: Sparkles,
    title: 'AI Financial Insights',
    desc: 'Claude-powered analysis tailored to wholesale — seasonal trends, supplier costs, margin changes. Not generic advice.',
    span: 'sm:col-span-2',
    featured: true,
  },
  {
    icon: ScanLine,
    title: 'Invoice Scanner',
    desc: 'Invoices in your inbox get auto-detected and parsed. No manual entry, no missed payments.',
    span: 'col-span-1',
  },
  {
    icon: LineChart,
    title: 'Cash Flow Forecasting',
    desc: "See what's coming in and going out — 60 days ahead. No more end-of-month surprises.",
    span: 'sm:col-span-2',
  },
  {
    icon: BookOpen,
    title: 'Accounts Receivable',
    desc: 'Who owes you, how much, and how late. Track every outstanding invoice in real time.',
    span: 'col-span-1',
  },
  {
    icon: AudioLines,
    title: 'Voice Summaries',
    desc: 'Get a daily financial briefing you can listen to on the drive to the warehouse.',
    span: 'col-span-1',
  },
]

function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden bg-white dark:bg-[#0C0B0A]">
      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          {/* Left Column: Sticky Header */}
          <div className="lg:w-1/3 lg:sticky lg:top-32">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-accent/5 border border-accent/10 mb-6">
                <Sparkles size={12} className="text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Feature Set v2.0</span>
              </div>
              <h2 className="text-4xl font-bold text-text-primary mb-6 leading-tight">
                Core financial systems — <span className="text-sage-cream">automated.</span>
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed mb-8">
                Runwave reconstructs your historical cash position, projects forward from structured invoices, models inventory lag, and calculates deployable surplus — automatically.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Landmark, label: 'Multi-Bank Sync' },
                  { icon: ScanLine, label: 'Gemini OCR' },
                  { icon: LineChart, label: 'Cash Forecasting' }
                ].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-raised transition-colors cursor-default group">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border/40 shadow-sm group-hover:border-accent/30">
                      <item.icon size={14} className="text-text-muted group-hover:text-accent" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{item.label}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Right Column: Creative Feature Cards */}
          <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: AI Insights (Featured) */}
            <FadeUp delay={0.1} className="md:col-span-2">
              <div className="group relative bg-[#141210] rounded-[32px] p-8 sm:p-12 overflow-hidden border border-white/5 shadow-2xl">
                {/* Animated background gradient */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50 group-hover:opacity-80 transition-opacity duration-700" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10">
                      <Sparkles size={28} className="text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Claude-Powered Reasoning</h3>
                    <p className="text-white/60 text-lg leading-relaxed mb-8">
                      Runwave runs concurrent financial detection modules across your transactions — then surfaces structured, prioritised findings.
                    </p>
                    <div className="inline-flex items-center gap-2 text-white font-semibold group/link cursor-pointer">
                      <span>Explore the Insights engine</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="relative">
                    {/* Mock Insight UI */}
                    <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-2 group-hover:rotate-0 transition-transform duration-500">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Urgent Anomaly</span>
                      </div>
                      <p className="text-white text-sm font-semibold mb-2">Freight costs up 24% from DPD</p>
                      <p className="text-white/50 text-xs leading-relaxed">Your average shipping cost per pallet increased from €42 to €52 this week. Check your surcharge terms.</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Card 2: Invoice Scanner */}
            <FadeUp delay={0.2}>
              <div className="group bg-surface-raised border border-border/50 rounded-[32px] p-8 h-full hover:border-border-focus transition-all duration-300 overflow-hidden relative">
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-6 shadow-sm border border-border/30">
                  <ScanLine size={22} className="text-text-primary" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">Invoice Auto-Pilot</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  Forward any invoice to your @runwave address. Runwave extracts vendor, amount, currency, and due date, writes it to your ledger, and matches it to your bank transactions automatically.
                </p>
                {/* Visual detail */}
                <div className="mt-auto pt-6 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border">
                    <div className="w-8 h-10 bg-surface-high rounded-sm" />
                    <div className="flex-1 space-y-1">
                      <div className="w-2/3 h-2 bg-border rounded-pill" />
                      <div className="w-1/2 h-2 bg-border/50 rounded-pill" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Card 3: AR Tracking */}
            <FadeUp delay={0.3}>
              <div className="group bg-surface border border-border/50 rounded-[32px] p-8 h-full hover:border-border-focus transition-all duration-300 shadow-sm overflow-hidden flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center mb-6 border border-accent/10">
                  <BookOpen size={22} className="text-accent" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">Receivables Matrix</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  See every outstanding invoice, ageing by customer, weighted DSO, and projected cash impact — updated as payments reconcile.
                </p>
                <div className="mt-auto space-y-2">
                  <div className="h-2 w-full bg-surface-high rounded-pill overflow-hidden">
                    <div className="h-full w-2/3 bg-success rounded-pill" />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase text-text-disabled">
                    <span>Paid</span>
                    <span>€42k Outstanding</span>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 6 — AI DEEP-DIVE
   ═══════════════════════════════════════════════ */

function AIDeepDive() {
  return (
    <section id="about" className="py-20 md:py-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 0% 50%, rgba(44,41,38,0.08) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text */}
          <FadeUp>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">AI that speaks wholesale</p>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-5 leading-tight">
                Not generic advice.{' '}
                <span className="text-sage-cream">Real wholesale intelligence.</span>
              </h2>
              <p className="text-text-secondary leading-relaxed mb-6">
                Runwave operates on your computed financial state — cash position, surplus model, restock lag, receivables ageing — and answers operational questions in plain English.
              </p>
              <ul className="space-y-3">
                {[
                  'Understands supplier payment terms and seasonal patterns',
                  'Flags margin erosion before it hits your bottom line',
                  'Identifies slow-paying customers automatically',
                  'Forecasts cash gaps weeks before they happen',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                    <Check size={16} className="text-accent mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>

          {/* Mock chat */}
          <FadeUp delay={0.2}>
            <div className="card p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/30">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Zap size={11} className="text-accent" />
                </div>
                <span className="text-xs font-medium text-text-primary">Ask Runwave</span>
                <span className="text-[10px] text-text-disabled ml-auto">Powered by Claude</span>
              </div>

              {/* User message */}
              <div className="mb-4">
                <div className="inline-block bg-surface-raised rounded-xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm text-text-primary">Which customers are late on payment?</p>
                </div>
              </div>

              {/* AI response */}
              <div className="mb-4">
                <div className="bg-accent/[0.06] border border-accent/10 rounded-xl rounded-br-sm px-4 py-3 max-w-[92%] ml-auto">
                  <p className="text-sm text-text-secondary leading-relaxed mb-3">
                    You have <span className="text-text-primary font-medium">3 customers</span> with overdue invoices totalling <span className="text-accent font-medium mono">€34,200</span>:
                  </p>
                  <div className="space-y-2">
                    {[
                      { name: 'Nordic Interiors', amount: '€18,400', days: '32 days late' },
                      { name: 'Design House Ltd', amount: '€9,800', days: '21 days late' },
                      { name: 'Comfort Living', amount: '€6,000', days: '15 days late' },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs bg-surface/60 rounded-lg px-3 py-2">
                        <span className="text-text-primary font-medium">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="mono text-text-secondary">{item.amount}</span>
                          <span className="text-danger">{item.days}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-3">
                    Nordic Interiors has been consistently late — I'd recommend following up today.
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 8 — PRICING
   ═══════════════════════════════════════════════ */

function Pricing() {
  const [annual, setAnnual] = useState(true)

  const handleStripeCheckout = async (plan: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: annual ? 'annual' : 'monthly' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        // Fallback if Stripe isn't configured
        window.location.href = '/onboarding'
      }
    } catch {
      window.location.href = '/onboarding'
    }
  }

  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      period: '',
      desc: 'Get started with basic financial visibility.',
      features: [
        '1 bank account',
        'Basic dashboard',
        '20 invoices/month',
        '7-day forecast',
      ],
      cta: 'Start free',
      ctaAction: () => { window.location.href = '/onboarding' },
      highlighted: false,
    },
    {
      name: 'Growth',
      price: annual ? '€29' : '€39',
      period: '/mo',
      desc: 'Full financial intelligence for growing wholesalers.',
      features: [
        'Unlimited bank accounts',
        'Full AI insights',
        'Unlimited invoices',
        '60-day forecast',
        'Email invoice scanning',
        'Voice summaries',
      ],
      cta: 'Start free trial',
      ctaAction: () => handleStripeCheckout('growth'),
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For wholesale operations that need more.',
      features: [
        'Everything in Growth',
        'API access',
        'Multi-user',
        'Custom reporting',
        'Priority support',
      ],
      cta: 'Contact us',
      ctaAction: () => { window.location.href = 'mailto:hello@runwave.finance' },
      highlighted: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled text-center mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-text-primary mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-text-secondary max-w-xl mx-auto mb-10">
            Start free, upgrade when you need more. No surprise fees.
          </p>
        </FadeUp>

        {/* Toggle */}
        <FadeUp delay={0.1}>
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={cn('text-sm transition-colors', !annual ? 'text-text-primary' : 'text-text-muted')}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={cn(
                'relative w-12 h-6 rounded-pill transition-colors',
                annual ? 'bg-accent' : 'bg-surface-high'
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                annual ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
            <span className={cn('text-sm transition-colors', annual ? 'text-text-primary' : 'text-text-muted')}>Annual</span>
            {annual && (
              <span className="text-[10px] font-medium text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-pill">
                Save 20%
              </span>
            )}
          </div>
        </FadeUp>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <FadeUp key={plan.name} delay={i * 0.1}>
              <div className={cn(
                'card p-6 sm:p-8 h-full flex flex-col relative',
                plan.highlighted && 'border-accent/30 shadow-glow'
              )}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-semibold text-black bg-accent px-3 py-1 rounded-pill">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-text-primary mb-1">{plan.name}</h3>
                <p className="text-sm text-text-muted mb-5">{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-text-primary mono">{plan.price}</span>
                  {plan.period && <span className="text-sm text-text-muted">{plan.period}</span>}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-text-secondary">
                      <Check size={14} className={plan.highlighted ? 'text-accent' : 'text-text-muted'} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={plan.ctaAction}
                  className={cn(
                    'w-full py-3 rounded-xl text-sm font-semibold transition-all',
                    plan.highlighted
                      ? 'bg-accent text-white hover:bg-accent-hover shadow-glow-sm'
                      : 'border border-border/60 text-text-secondary hover:border-border-focus hover:text-text-primary'
                  )}
                >
                  {plan.cta}
                </button>
                <p className="text-[10px] text-text-disabled text-center mt-3">No credit card required</p>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Stripe badge */}
        <FadeUp delay={0.4}>
          <div className="flex items-center justify-center gap-2 mt-10 text-xs text-text-disabled">
            <Lock size={11} />
            <span>Payments secured by Stripe</span>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 9 — FINAL CTA
   ═══════════════════════════════════════════════ */

function FinalCTA() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 80%, rgba(44,41,38,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <FadeUp>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-5">
            Ready to see your finances clearly?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            Join wholesale businesses using Runwave to manage cash flow, track invoices,
            and make better decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-pill bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all shadow-glow hover:shadow-teal-glow"
            >
              Start free
              <ArrowRight size={16} />
            </Link>
          </div>
          <p className="text-xs text-text-muted">No credit card required · Set up in 2 minutes</p>
        </FadeUp>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SECTION 10 — FOOTER
   ═══════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="border-t border-border/50 py-14">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <Image
                src="/runwave-logo.png"
                alt="Runwave"
                width={24}
                height={24}
                className="w-6 h-6 object-contain dark:invert"
              />
              <span className="text-sm font-semibold text-text-primary">Runwave</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Financial clarity for wholesale businesses.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled mb-4">Product</p>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-text-muted hover:text-text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-text-muted hover:text-text-primary transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled mb-4">Company</p>
            <ul className="space-y-2.5">
              <li><a href="#about" className="text-sm text-text-muted hover:text-text-primary transition-colors">About</a></li>
              <li><a href="mailto:hello@runwave.finance" className="text-sm text-text-muted hover:text-text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled mb-4">Legal</p>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-text-muted hover:text-text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="text-sm text-text-muted hover:text-text-primary transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border/30">
          <p className="text-xs text-text-disabled">&copy; {new Date().getFullYear()} Runwave. All rights reserved.</p>
          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-text-disabled">
              <Shield size={10} /> 256-bit AES
            </span>
            <span className="text-text-disabled text-[10px]">·</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-text-disabled">
              <Lock size={10} /> GDPR compliant
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════
   PAGE EXPORT
   ═══════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary overflow-x-hidden">
      <Nav />
      <Hero />
      <TrustBar />
      <PainPoints />
      <Features />
      <AIDeepDive />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  )
}
