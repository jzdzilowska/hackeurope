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

// ── Script generator — mirrors dashboard section order ────────────────────
export function generateBriefingScript({
  org,
  accounts,
  kpis,
  burnData,
  categories,
  insights,
  approvals,
  recurring,
  fixedCosts,
  surplusSummary,
  restockData,
}: BriefingInput): string {
  const parts: string[] = []

  // ── Greeting ──────────────────────────────────────────────────────────────
  parts.push(`Good ${timeOfDay()}. Here's your HELM financial briefing for ${org.name}.`)

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 1 — CASH POSITION  (mirrors CashPositionHero + RecurringCosts)
  // ═════════════════════════════════════════════════════════════════════════

  // Institution breakdown exactly as CashPositionHero shows it
  const instMap = new Map<string, number>()
  for (const acc of accounts) {
    instMap.set(acc.institution, (instMap.get(acc.institution) ?? 0) + acc.currentBalance)
  }
  const institutions = [...instMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  const instText = institutions
    .map(([name, total]) => `${name} at ${fmtK(total)}`)
    .join(', ')

  const runwayLabel =
    kpis.runway >= 9 ? 'a strong position'
    : kpis.runway >= 6 ? 'a healthy position'
    : kpis.runway >= 3 ? 'the amber zone — monitor carefully'
    : 'a critical position — immediate action required'

  parts.push(
    `Your total cash position is ${fmt(kpis.totalCashPosition)}, ` +
    `held across ${institutions.length > 0 ? instText : `${accounts.length} accounts`}. ` +
    `At your current burn rate that gives you ${kpis.runway.toFixed(1)} months of runway — ${runwayLabel}.`
  )

  // Burn rate trend (mirrors the "+x% vs last month" CashPositionHero shows)
  const burnDir = kpis.burnTrend > 0 ? 'up' : 'down'
  parts.push(
    `Monthly burn is ${fmt(kpis.monthlyBurn)}, ${burnDir} ${Math.abs(kpis.burnTrend).toFixed(1)}% versus last month.`
  )

  // Fixed / recurring costs (mirrors RecurringCosts)
  if (fixedCosts) {
    const topVendors = fixedCosts.topExpenses.slice(0, 3)
    const vendorText = topVendors
      .map(e => `${e.vendor} at ${fmtK(e.avgMonthly)} per month`)
      .join(', ')
    parts.push(
      `Fixed monthly obligations total ${fmt(fixedCosts.totalMonthly)}. ` +
      (vendorText ? `Your top recurring costs are: ${vendorText}.` : '')
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 2 — FINANCIAL INTELLIGENCE  (CashflowChart + RestockForecast + SurplusChart)
  // ═════════════════════════════════════════════════════════════════════════

  // Financial health score
  const healthLabel =
    kpis.financialHealthScore >= 80 ? 'excellent'
    : kpis.financialHealthScore >= 60 ? 'moderate'
    : kpis.financialHealthScore >= 40 ? 'needs attention'
    : 'critical'
  parts.push(
    `Your financial health score is ${kpis.financialHealthScore} out of 100 — ${healthLabel}.`
  )

  // Revenue vs burn trend from burnData (mirrors CashflowChart's 6-month view)
  if (burnData.length >= 2) {
    const latest = burnData[burnData.length - 1]
    const prev   = burnData[burnData.length - 2]
    const revGrowth = ((latest.revenue - prev.revenue) / prev.revenue * 100)
    const revDir    = revGrowth >= 0 ? 'up' : 'down'
    parts.push(
      `Revenue in ${latest.month} was ${fmt(latest.revenue)}, ${revDir} ${Math.abs(revGrowth).toFixed(1)}% from ${prev.month}. ` +
      `Net position was ${fmt(latest.net)}.`
    )
  }

  // Category spend (mirrors SurplusChart / spend breakdown)
  const topCats = [...categories].sort((a, b) => b.amount - a.amount).slice(0, 3)
  if (topCats.length > 0) {
    const catText = topCats.map(c => `${c.name} at ${fmt(c.amount)}`).join(', ')
    parts.push(`Largest spend categories this month: ${catText}.`)
  }

  // Restock forecast (mirrors RestockForecast)
  if (restockData && restockData.confidence !== 'low') {
    const dueDateStr = relativeDate(restockData.impliedRestockDueDate)
    parts.push(
      `Restock forecast: ${fmtK(restockData.dueNextWeek)} due next week and ${fmtK(restockData.dueNextMonth)} due next month. ` +
      `Based on recent sales, an implied restock of ${fmtK(restockData.impliedRestockFromRecentSales)} is expected ${dueDateStr}.`
    )
  }

  // Surplus summary (mirrors SurplusChart stats + interpretation)
  if (surplusSummary && surplusSummary.monthsAnalysed > 0) {
    const negWarning =
      surplusSummary.negativeMonths > 0
        ? ` You had ${surplusSummary.negativeMonths} negative month${surplusSummary.negativeMonths > 1 ? 's' : ''} out of ${surplusSummary.monthsAnalysed}.`
        : ''
    parts.push(
      `Monthly surplus analysis: average surplus ${fmtK(surplusSummary.avgSurplus)}, safe floor ${fmtK(surplusSummary.consistentFloor)}.${negWarning} ` +
      stripMd(surplusSummary.interpretation)
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION 3 — PAYMENTS & APPROVALS  (UpcomingPayments + ApprovalQueue)
  // ═════════════════════════════════════════════════════════════════════════

  // Upcoming recurring payments — sorted by due date, same as UpcomingPayments component
  const sorted = [...recurring].sort(
    (a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime()
  )
  const soonest = sorted.slice(0, 3)
  if (soonest.length > 0) {
    const totalMonthly = recurring.reduce((s, r) => s + r.averageAmount, 0)
    parts.push(
      `You have ${recurring.length} recurring payment${recurring.length !== 1 ? 's' : ''}, totalling ${fmt(totalMonthly)} per month.`
    )
    const paymentLines = soonest.map(r =>
      `${r.merchantName} — ${fmtK(r.averageAmount)} — due ${relativeDate(r.nextExpectedDate)}`
    )
    parts.push(`Soonest due: ${paymentLines.join('; ')}.`)
  }

  // Call out unused / low-usage subscriptions (mirrors the usage dot in UpcomingPayments)
  const flagged = recurring.filter(r => r.usageFlag === 'unused' || r.usageFlag === 'low')
  if (flagged.length > 0) {
    const names = flagged.map(r => `${r.merchantName} (${r.usageFlag})`).join(', ')
    parts.push(`Subscriptions flagged for low or no usage: ${names}. These may be worth reviewing.`)
  }

  // Pending approvals (mirrors ApprovalQueue — amount, max, due date)
  const pending = approvals.filter(a => a.status === 'pending')
  if (pending.length > 0) {
    const details = pending.map(a => {
      const range =
        a.expectedAmountMax > a.expectedAmount
          ? `${fmtK(a.expectedAmount)} to ${fmtK(a.expectedAmountMax)}`
          : fmtK(a.expectedAmount)
      return `${a.merchantName} — ${range} — due ${relativeDate(a.expectedDate)}`
    }).join('; ')
    parts.push(
      `${pending.length} payment${pending.length !== 1 ? 's' : ''} need${pending.length === 1 ? 's' : ''} your approval: ${details}.`
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // INSIGHTS — top alerts by urgency
  // ═════════════════════════════════════════════════════════════════════════
  const urgencyRank: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const activeInsights = insights
    .filter(i => !i.dismissed)
    .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency])
    .slice(0, 3)

  if (activeInsights.length > 0) {
    parts.push(`Top insight${activeInsights.length > 1 ? 's' : ''}:`)
    activeInsights.forEach((ins, i) => {
      parts.push(`${i + 1}. ${stripMd(ins.headline)}. ${stripMd(ins.body)}`)
    })
  }

  // ── Closing ────────────────────────────────────────────────────────────────
  parts.push(
    "That's your HELM briefing. Review the dashboard for the full picture and take action on any flagged items."
  )

  return parts.join(' ')
}
