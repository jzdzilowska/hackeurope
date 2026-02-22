import type {
  Organisation, Account, KPIs, InsightCard,
  PaymentApproval, MonthlyBurn, RecurringPayment,
} from './types'
import type { CategorySpend } from './dashboard-context'

// ── Extra shapes from dedicated API endpoints ──────────────────────────────
export interface FixedCostsData {
  totalMonthly: number
  topExpenses: Array<{ vendor: string; avgMonthly: number }>
}

export interface SurplusSummary {
  avgSurplus: number
  consistentFloor: number
  negativeMonths: number
  monthsAnalysed: number
  interpretation: string
}

export interface RestockData {
  dueNextWeek: number
  dueNextMonth: number
  impliedRestockFromRecentSales: number
  impliedRestockDueDate: string
  confidence: 'high' | 'medium' | 'low'
}

export interface BriefingInput {
  // From DashboardContext
  org: Organisation
  accounts: Account[]
  kpis: KPIs
  burnData: MonthlyBurn[]
  categories: CategorySpend[]
  insights: InsightCard[]
  approvals: PaymentApproval[]
  recurring: RecurringPayment[]
  // From dedicated API fetches (mirrors what each component fetches)
  fixedCosts: FixedCostsData | null
  surplusSummary: SurplusSummary | null
  restockData: RestockData | null
}

// ── Formatting helpers ─────────────────────────────────────────────────────
function fmt(amount: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtK(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return `€${(amount / 1000).toFixed(1)}k`
  }
  return fmt(amount)
}

function timeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function relativeDate(iso: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'))
  target.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 0)  return `${Math.abs(days)} days ago`
  if (days <= 7) return `in ${days} days`
  return target.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })
}

function stripMd(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[•·]/g, '').replace(/\s{2,}/g, ' ').trim()
}

// ── Script generator — ~1 minute, urgent/actionable items only ──────────────
export function generateBriefingScript({
  org,
  kpis,
  burnData,
  insights,
  approvals,
  recurring,
  restockData,
}: BriefingInput): string {
  const parts: string[] = []

  // ── Greeting ────────────────────────────────────────────────────────────
  parts.push(`Hey, good ${timeOfDay()}! Here's a quick rundown for ${org.name}.`)

  // ── Runway (only if concerning) ─────────────────────────────────────────
  if (kpis.runway < 6) {
    if (kpis.runway < 3) {
      parts.push(`So the first thing to flag — you're down to about ${kpis.runway.toFixed(1)} months of runway. That's getting into critical territory, so it's worth addressing sooner rather than later.`)
    } else {
      parts.push(`Runway is sitting at around ${kpis.runway.toFixed(1)} months right now — not an emergency, but you're in the amber zone, so worth keeping an eye on.`)
    }
  }

  // ── Burn spike ──────────────────────────────────────────────────────────
  if (Math.abs(kpis.burnTrend) >= 10) {
    if (kpis.burnTrend > 0) {
      parts.push(`Spending has crept up about ${Math.abs(kpis.burnTrend).toFixed(0)}% from last month — might be worth a quick look at what's driving that.`)
    } else {
      parts.push(`Good news on costs — burn is actually down about ${Math.abs(kpis.burnTrend).toFixed(0)}% from last month.`)
    }
  }

  // ── Pending approvals ────────────────────────────────────────────────────
  const pending = approvals.filter(a => a.status === 'pending')
  if (pending.length > 0) {
    const top = pending[0]
    const amount = top.expectedAmountMax > top.expectedAmount
      ? `somewhere between ${fmtK(top.expectedAmount)} and ${fmtK(top.expectedAmountMax)}`
      : fmtK(top.expectedAmount)
    const when = relativeDate(top.expectedDate)
    if (pending.length === 1) {
      parts.push(`You've got one payment waiting on your approval — ${top.merchantName}, ${amount}, due ${when}.`)
    } else {
      const others = pending.length - 1
      parts.push(`There are ${pending.length} payments sitting in the approval queue. The one to deal with first is ${top.merchantName} — that's ${amount}, due ${when} — plus ${others} other${others > 1 ? 's' : ''}.`)
    }
  }

  // ── Flagged subscriptions ────────────────────────────────────────────────
  const flagged = recurring.filter(r => r.usageFlag === 'unused' || r.usageFlag === 'low')
  if (flagged.length > 0) {
    const names = flagged.slice(0, 3).map(r => r.merchantName).join(', ')
    if (flagged.length === 1) {
      parts.push(`Also, it looks like ${names} hasn't really been used recently — might be worth cancelling that one.`)
    } else {
      parts.push(`It also looks like ${names} haven't seen much activity lately. Probably worth reviewing whether you still need those.`)
    }
  }

  // ── Restock (only high confidence) ──────────────────────────────────────
  if (restockData && restockData.confidence === 'high' && restockData.dueNextWeek > 0) {
    parts.push(
      `Heads up on restock — based on recent sales, you're looking at about ${fmtK(restockData.dueNextWeek)} needed next week ` +
      `and ${fmtK(restockData.dueNextMonth)} the month after.`
    )
  }

  // ── Top high-urgency insights only ──────────────────────────────────────
  const urgencyRank: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const topInsights = insights
    .filter(i => !i.dismissed && i.urgency !== 'low')
    .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency])
    .slice(0, 2)

  if (topInsights.length > 0) {
    const [first, second] = topInsights
    const firstText = stripMd(first.headline).replace(/\.$/, '').toLowerCase()
    parts.push(`One more thing worth flagging — ${firstText}.`)
    if (second) {
      const secondText = stripMd(second.headline).replace(/\.$/, '').toLowerCase()
      parts.push(`And also — ${secondText}.`)
    }
  }

  // ── Revenue trend (only if significant) ─────────────────────────────────
  if (burnData.length >= 2) {
    const latest = burnData[burnData.length - 1]
    const prev   = burnData[burnData.length - 2]
    const revGrowth = (latest.revenue - prev.revenue) / prev.revenue * 100
    if (Math.abs(revGrowth) >= 15) {
      if (revGrowth >= 0) {
        parts.push(`Oh, and revenue is up about ${Math.abs(revGrowth).toFixed(0)}% from last month — that's a good sign.`)
      } else {
        parts.push(`Also, revenue is down about ${Math.abs(revGrowth).toFixed(0)}% from last month, so that's something to keep an eye on.`)
      }
    }
  }

  // ── Closing ──────────────────────────────────────────────────────────────
  parts.push("That's everything for now. Full details are on the dashboard whenever you need them.")

  return parts.join(' ')
}
