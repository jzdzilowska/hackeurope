'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
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
  const { theme, setTheme } = useTheme()

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
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)',
              boxShadow: '0 0 14px rgba(44,41,38,0.18)',
            }}
          >
            <Zap size={13} className="text-black" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">HELM</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-text-muted hover:text-text-primary transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-text-muted hover:text-text-primary transition-colors">Pricing</a>
          <a href="#about" className="text-sm text-text-muted hover:text-text-primary transition-colors">About</a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised/60 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
          </button>
          <Link href="/onboarding" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="text-sm font-medium px-4 py-2 rounded-pill bg-accent text-black hover:bg-accent-hover transition-colors"
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
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <hr className="border-border/30" />
          <Link href="/onboarding" className="block text-sm text-text-secondary">Sign in</Link>
          <Link
            href="/onboarding"
            className="block text-center text-sm font-medium px-4 py-2.5 rounded-pill bg-accent text-black"
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
            <span className="text-sage-cream">Your wholesale finances.</span>
            <br />
            <span className="text-text-primary">Finally clear.</span>
          </h1>
        </FadeUp>

        {/* Subheadline */}
        <FadeUp delay={0.2}>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect your banks, scan invoices from email, and get AI-powered insights
            that help you manage cash flow and protect your margins.
          </p>
        </FadeUp>

        {/* CTAs */}
        <FadeUp delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-pill bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-all shadow-glow hover:shadow-teal-glow"
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
    <section className="py-16 border-y border-border/30">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-center text-xs font-medium uppercase tracking-widest text-text-disabled mb-10">
            Built for wholesale businesses across Europe
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14">
            {[
              { value: '€2M+', label: 'tracked' },
              { value: '500+', label: 'invoices processed' },
              { value: '99.9%', label: 'uptime' },
              { value: '60-day', label: 'forecasting' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-text-primary mono">{stat.value}</p>
                <p className="text-xs text-text-muted mt-1">{stat.label}</p>
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
    desc: 'You pay suppliers in 15 days but customers pay you in 60. The gap is killing your margins.',
    color: 'text-danger',
    bg: 'bg-danger/10',
  },
  {
    icon: ScrollText,
    title: 'Invoice chaos',
    desc: 'Invoices arrive by email, PDF, post. Matching them to payments is a full-time job.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: Hourglass,
    title: 'Slow-paying customers',
    desc: "Three customers are 30+ days late. You find out when you manually check the books.",
    color: 'text-chart-amber',
    bg: 'bg-chart-amber/10',
  },
  {
    icon: EyeOff,
    title: 'Hidden cost creep',
    desc: "Material costs went up 15% but your prices didn't. You discover the margin hit at quarter-end.",
    color: 'text-chart-pink',
    bg: 'bg-chart-pink/10',
  },
]

function PainPoints() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled text-center mb-3">The reality</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-text-primary mb-4">Sound familiar?</h2>
          <p className="text-center text-text-secondary max-w-xl mx-auto mb-14">
            Every wholesale business hits these problems. Most discover them too late.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {painPoints.map((item, i) => (
            <FadeUp key={item.title} delay={i * 0.1}>
              <div className="card p-6 group hover:border-border-focus transition-all duration-200">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', item.bg)}>
                  <item.icon size={18} className={item.color} />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </FadeUp>
          ))}
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
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled text-center mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-text-primary mb-4">
            Everything you need to see your finances clearly
          </h2>
          <p className="text-center text-text-secondary max-w-xl mx-auto mb-14">
            Built specifically for wholesale businesses — not repurposed startup tools.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <FadeUp key={feat.title} delay={i * 0.08} className={feat.span}>
              <div className={cn(
                'card p-6 h-full group hover:border-border-focus transition-all duration-200',
                feat.featured && 'border-accent/20 bg-accent/[0.03]'
              )}>
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-4',
                  feat.featured ? 'bg-accent/10' : 'bg-surface-raised'
                )}>
                  <feat.icon size={18} className={feat.featured ? 'text-accent' : 'text-text-secondary'} />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{feat.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feat.desc}</p>
              </div>
            </FadeUp>
          ))}
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
                HELM understands suppliers, seasonal cycles, payment terms, and freight costs.
                Ask it anything about your finances in plain English.
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
                <span className="text-xs font-medium text-text-primary">Ask HELM</span>
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
   SECTION 7 — SOCIAL PROOF / METRICS
   ═══════════════════════════════════════════════ */

function SocialProof() {
  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(44,41,38,0.05) 0%, transparent 70%)',
        }}
      />
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <FadeUp>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled mb-3">By the numbers</p>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-14">
            Trusted by wholesale businesses
          </h2>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { target: 2, prefix: '€', suffix: 'M+', label: 'in transactions tracked' },
            { target: 88, suffix: '+', label: 'invoices auto-parsed' },
            { target: 60, suffix: '-day', label: 'cash forecasting' },
          ].map((stat, i) => (
            <FadeUp key={stat.label} delay={i * 0.15}>
              <div className="card p-8">
                <p className="text-4xl md:text-5xl font-bold text-accent mono mb-2">
                  <AnimatedCounter target={stat.target} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-text-muted">{stat.label}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Testimonial placeholder */}
        <FadeUp delay={0.4}>
          <div className="mt-14 max-w-2xl mx-auto">
            <p className="text-lg text-text-secondary italic leading-relaxed">
              "We used to spend the first week of every month figuring out where our money went.
              HELM gives us that clarity in real time."
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-xs font-bold text-accent">
                MK
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">Michael Keane</p>
                <p className="text-xs text-text-muted">Director, Keane Furniture Wholesale</p>
              </div>
            </div>
          </div>
        </FadeUp>
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
      ctaAction: () => { window.location.href = 'mailto:hello@helm.finance' },
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
                      ? 'bg-accent text-black hover:bg-accent-hover shadow-glow-sm'
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
            Join wholesale businesses using HELM to manage cash flow, track invoices,
            and make better decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-pill bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-all shadow-glow hover:shadow-teal-glow"
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
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)',
                }}
              >
                <Zap size={11} className="text-black" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-text-primary">HELM</span>
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
              <li><a href="mailto:hello@helm.finance" className="text-sm text-text-muted hover:text-text-primary transition-colors">Contact</a></li>
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
          <p className="text-xs text-text-disabled">&copy; {new Date().getFullYear()} HELM. All rights reserved.</p>
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
      <SocialProof />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  )
}
