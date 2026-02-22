/**
 * insights-compute.ts — Live financial computation from Supabase data.
 *
 * Ported from insights_engine/health_queries.py to TypeScript.
 * Runs entirely in-process (no Python dependency) so the insights page
 * always shows live numbers even when the AI backend is offline.
 *
 * Plaid amount convention: positive = expense, negative = income.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ── Category classification maps (from health_queries.py) ────────────────────

const FIXED_PRIMARY = new Set([
  'RENT_AND_UTILITIES',
  'LOAN_PAYMENTS',
])

const VARIABLE_PRIMARY = new Set([
  'GENERAL_MERCHANDISE',
  'TRAVEL',
  'FOOD_AND_DRINK',
  'ENTERTAINMENT',
  'PERSONAL_CARE',
  'HOME_IMPROVEMENT',
  'TRANSPORTATION',
])

const PAYROLL_SIGNALS = [
  'payroll', 'salary', 'salaries', 'wages', 'wage', 'compensation',
  'paychex', 'adp', 'gusto', 'rippling', 'deel', 'remote.com',
]

const AD_SIGNALS = [
  'advertising', 'ad spend', 'ads', 'marketing',
  'google ads', 'meta ads', 'facebook ads', 'tiktok ads',
  'linkedin ads', 'twitter ads', 'snapchat ads', 'bing ads',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthStart(monthsBack = 0): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsBack)
  return d.toISOString().split('T')[0]
}

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

interface Txn {
  amount: number
  category_primary?: string
  category_detailed?: string
  ai_category?: string
  name?: string
  merchant_name?: string
}

function classifyTransaction(txn: Txn): 'fixed' | 'variable' | 'payroll' | 'other' {
  const catPrimary = (txn.category_primary ?? '').toUpperCase().trim()
  const catDetailed = (txn.category_detailed ?? '').toUpperCase().trim()
  const aiCat = (txn.ai_category ?? '').toLowerCase().trim()
  const name = (txn.name ?? '').toLowerCase().trim()
  const merchant = (txn.merchant_name ?? '').toLowerCase().trim()
  const combined = `${aiCat} ${name} ${merchant}`

  // Payroll takes priority
  if (PAYROLL_SIGNALS.some(sig => combined.includes(sig))) return 'payroll'
  if (FIXED_PRIMARY.has(catPrimary)) return 'fixed'
  if (VARIABLE_PRIMARY.has(catPrimary)) return 'variable'

  if (catPrimary === 'GENERAL_SERVICES') {
    if (AD_SIGNALS.some(sig => combined.includes(sig))) return 'variable'
    if (catDetailed.includes('SUBSCRIPTION') || catDetailed.includes('INSURANCE')) return 'fixed'
    return 'fixed'
  }

  if (catPrimary === 'TRANSFER_OUT') {
    if (PAYROLL_SIGNALS.some(sig => combined.includes(sig))) return 'payroll'
    return 'other'
  }

  return 'other'
}

/**
 * OLS linear regression to forecast the next value in a series.
 * Returns the mean if fewer than 2 data points; always non-negative.
 */
function linearForecast(series: number[]): number {
  const n = series.length
  if (n < 2) return series[0] ?? 0
  const xMean = (n - 1) / 2
  const yMean = series.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (series[i] - yMean)
    den += (i - xMean) ** 2
  }
  const m = den ? num / den : 0
  return Math.max(0, m * n + (yMean - m * xMean))
}

function round2(v: number): number { return Math.round(v * 100) / 100 }
function round1(v: number): number { return Math.round(v * 10) / 10 }

// ── 1. Financial Health ──────────────────────────────────────────────────────

export interface CostBucket {
  amount: number
  pct: number
  items?: Array<{ merchant: string; amount: number }>
}

export interface FinancialHealth {
  net_worth: number
  effective_net_worth: number
  outstanding_invoice_total: number
  overdue_invoice_total: number
  total_expenditure: number
  total_income: number
  total_profit: number
  profit_margin_pct: number
  cost_breakdown: {
    fixed: CostBucket
    variable: CostBucket
    payroll: CostBucket
    other: CostBucket
  }
}

export async function computeFinancialHealth(
  supabase: SupabaseClient,
  userId: string,
): Promise<FinancialHealth> {
  const periodStart = monthStart(0) // current month
  const tom = tomorrow()

  // Net worth
  const { data: accounts } = await supabase
    .from('accounts')
    .select('balance_current')
    .eq('user_id', userId)

  const netWorth = (accounts ?? []).reduce(
    (sum, a) => sum + (Number(a.balance_current) || 0), 0,
  )

  // Transactions for current month
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, category_primary, category_detailed, ai_category, name, merchant_name')
    .eq('user_id', userId)
    .gte('date', periodStart)
    .lt('date', tom)

  const rows = (txns ?? []) as Txn[]

  // P&L
  const expenditure = rows
    .filter(t => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0)
  const income = rows
    .filter(t => Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const profit = income - expenditure

  // Cost breakdown
  const buckets: Record<string, number> = { fixed: 0, variable: 0, payroll: 0, other: 0 }
  const bucketItems: Record<string, Array<{ merchant: string; amount: number }>> = {
    fixed: [], variable: [], payroll: [], other: [],
  }

  for (const txn of rows) {
    const amt = Number(txn.amount)
    if (amt <= 0) continue
    const label = classifyTransaction(txn)
    buckets[label] += amt
    bucketItems[label].push({
      merchant: txn.merchant_name || txn.name || 'Unknown',
      amount: round2(amt),
    })
  }

  const pct = (part: number) => expenditure > 0 ? round1(part / expenditure * 100) : 0

  // Invoices
  const { data: invData } = await supabase
    .from('invoices')
    .select('amount, due_date, status')
    .eq('user_id', userId)
    .neq('status', 'paid')

  const today = new Date().toISOString().split('T')[0]
  const outstandingTotal = (invData ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const overdueTotal = (invData ?? [])
    .filter(i => i.due_date && i.due_date < today)
    .reduce((s, i) => s + (Number(i.amount) || 0), 0)

  return {
    net_worth: round2(netWorth),
    effective_net_worth: round2(netWorth - outstandingTotal),
    outstanding_invoice_total: round2(outstandingTotal),
    overdue_invoice_total: round2(overdueTotal),
    total_expenditure: round2(expenditure),
    total_income: round2(income),
    total_profit: round2(profit),
    profit_margin_pct: round1(income > 0 ? (profit / income * 100) : 0),
    cost_breakdown: {
      fixed:    { amount: round2(buckets.fixed),    pct: pct(buckets.fixed),    items: bucketItems.fixed },
      variable: { amount: round2(buckets.variable), pct: pct(buckets.variable), items: bucketItems.variable },
      payroll:  { amount: round2(buckets.payroll),  pct: pct(buckets.payroll),  items: bucketItems.payroll },
      other:    { amount: round2(buckets.other),    pct: pct(buckets.other) },
    },
  }
}

// ── 2. Forecast Data ─────────────────────────────────────────────────────────

export interface MonthlyData {
  month: string
  expenditure: number
  income: number
  profit: number
  category_spend: Record<string, number>
}

export interface ForecastData {
  historical_months: MonthlyData[]
  avg_monthly_burn: number
  predicted_expenditure: number
  predicted_income: number
}

export async function computeForecastData(
  supabase: SupabaseClient,
  userId: string,
): Promise<ForecastData> {
  const monthly: MonthlyData[] = []

  for (let i = 3; i >= 1; i--) {
    const start = monthStart(i)
    const end = monthStart(i - 1)

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, category_primary')
      .eq('user_id', userId)
      .gte('date', start)
      .lt('date', end)

    const rows = (txns ?? []) as Array<{ amount: number; category_primary?: string }>

    const expenditure = rows
      .filter(t => Number(t.amount) > 0)
      .reduce((s, t) => s + Number(t.amount), 0)
    const income = rows
      .filter(t => Number(t.amount) < 0)
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

    const catSpend: Record<string, number> = {}
    for (const t of rows) {
      if (Number(t.amount) > 0) {
        const cat = t.category_primary || 'UNKNOWN'
        catSpend[cat] = (catSpend[cat] || 0) + Number(t.amount)
      }
    }

    monthly.push({
      month: start.substring(0, 7),
      expenditure: round2(expenditure),
      income: round2(income),
      profit: round2(income - expenditure),
      category_spend: Object.fromEntries(
        Object.entries(catSpend).map(([k, v]) => [k, round2(v)]),
      ),
    })
  }

  const expSeries = monthly.map(m => m.expenditure)
  const incSeries = monthly.map(m => m.income)
  const avgBurn = expSeries.length > 0
    ? expSeries.reduce((a, b) => a + b, 0) / expSeries.length
    : 0

  return {
    historical_months: monthly,
    avg_monthly_burn: round2(avgBurn),
    predicted_expenditure: round2(linearForecast(expSeries)),
    predicted_income: round2(linearForecast(incSeries)),
  }
}

// ── 3. Heuristic Health Score ────────────────────────────────────────────────

export interface HeuristicScoreResult {
  health_score: number
  score_breakdown: Record<string, { score: number; reasoning: string }>
  top_3_controllable_improvements: string[]
}

export function computeHeuristicScoreAndActions(
  health: FinancialHealth,
  forecast: ForecastData,
): HeuristicScoreResult {
  const runway = forecast.avg_monthly_burn > 0
    ? health.net_worth / forecast.avg_monthly_burn
    : 99

  // Burn trend
  const months = forecast.historical_months
  let burnTrendPct = 0
  if (months.length >= 2) {
    const prev = months[months.length - 2].expenditure
    const curr = months[months.length - 1].expenditure
    burnTrendPct = prev > 0 ? ((curr - prev) / prev) * 100 : 0
  }

  const fmt = (v: number) => `€${Math.round(v).toLocaleString('en-IE')}`

  // ── Score breakdown (4 dimensions, each 0–25) ─────────────────────────────
  // Cost structure: low fixed % = flexible
  const fixedPct = health.cost_breakdown.fixed.pct
  const costStructureScore = fixedPct < 15 ? 22 : fixedPct < 30 ? 16 : 10
  const costStructureReasoning = `Fixed costs at ${fixedPct.toFixed(1)}% of total spend${
    fixedPct < 15 ? ' — excellent operational flexibility' :
    fixedPct < 30 ? ' — moderate fixed cost base' :
    ' — high fixed cost exposure, limiting flexibility'
  }. Variable costs at ${health.cost_breakdown.variable.pct.toFixed(1)}%, payroll at ${health.cost_breakdown.payroll.pct.toFixed(1)}%.`

  // Profit quality: margin-driven
  const margin = health.profit_margin_pct
  const profitScore = margin > 30 ? 23 : margin > 15 ? 18 : margin > 0 ? 12 : 5
  const profitReasoning = `Profit margin of ${margin.toFixed(1)}% (${fmt(health.total_profit)} on ${fmt(health.total_income)} income)${
    margin > 30 ? ' is exceptionally strong' :
    margin > 15 ? ' is solid' :
    margin > 0  ? ' is thin — limited buffer for unexpected costs' :
    ' is negative — spending exceeds income'
  }.`

  // Cash efficiency: runway + invoices
  let cashScore = 12
  if (runway > 6) cashScore += 8
  else if (runway > 3) cashScore += 4
  else cashScore -= 4
  if (health.overdue_invoice_total > 0) cashScore -= 5
  if (health.outstanding_invoice_total > health.net_worth * 0.5) cashScore -= 3
  cashScore = Math.max(0, Math.min(25, cashScore))
  const cashReasoning = `${fmt(health.net_worth)} in liquid assets with ${runway.toFixed(1)} months of runway.${
    health.overdue_invoice_total > 0
      ? ` ${fmt(health.overdue_invoice_total)} in overdue invoices is dragging cash efficiency.`
      : ''
  }${
    health.outstanding_invoice_total > 0
      ? ` ${fmt(health.outstanding_invoice_total)} total outstanding.`
      : ''
  }`

  // Expense control: burn trend
  let expenseScore = 16
  if (burnTrendPct < -5) expenseScore = 22
  else if (burnTrendPct < 5) expenseScore = 18
  else if (burnTrendPct > 15) expenseScore = 8
  const expenseReasoning = `Month-over-month burn ${
    burnTrendPct < 0 ? `decreased ${Math.abs(burnTrendPct).toFixed(1)}%` :
    burnTrendPct === 0 ? 'is flat' :
    `increased ${burnTrendPct.toFixed(1)}%`
  }${burnTrendPct < 0 ? ' — strong cost discipline' : burnTrendPct > 10 ? ' — costs accelerating' : ''}.`

  const totalScore = Math.max(0, Math.min(100, costStructureScore + profitScore + cashScore + expenseScore))

  // ── Top 3 actionable improvements ──────────────────────────────────────────
  const actions: Array<{ priority: number; text: string }> = []

  if (health.overdue_invoice_total > 0) {
    actions.push({
      priority: 1,
      text: `Collect ${fmt(health.overdue_invoice_total)} in overdue invoices to immediately improve liquidity and runway.`,
    })
  }

  if (health.outstanding_invoice_total > health.net_worth * 0.3) {
    actions.push({
      priority: 2,
      text: `Tighten payment terms — ${fmt(health.outstanding_invoice_total)} outstanding represents ${Math.round(health.outstanding_invoice_total / health.net_worth * 100)}% of net worth.`,
    })
  }

  if (burnTrendPct > 10) {
    actions.push({
      priority: 3,
      text: `Investigate the ${burnTrendPct.toFixed(1)}% month-over-month burn increase. Review variable costs (${health.cost_breakdown.variable.pct.toFixed(1)}% of spend) for quick wins.`,
    })
  }

  if (runway < 6) {
    actions.push({
      priority: 4,
      text: `Cash runway is ${runway.toFixed(1)} months — below the 6-month safety target. Prioritise cash preservation and receivables collection.`,
    })
  }

  const lazyCash = health.net_worth - (forecast.avg_monthly_burn * 9)
  if (lazyCash > 10000) {
    actions.push({
      priority: 5,
      text: `Move ${fmt(lazyCash)} in excess cash to a high-yield savings account to generate passive income.`,
    })
  }

  if (health.cost_breakdown.payroll.pct > 50) {
    actions.push({
      priority: 6,
      text: `Payroll at ${health.cost_breakdown.payroll.pct.toFixed(1)}% of expenditure is above typical benchmarks. Review headcount efficiency.`,
    })
  }

  // Always have at least 3
  if (actions.length < 3) {
    actions.push({
      priority: 10,
      text: `Maintain current cost discipline — profit margin of ${margin.toFixed(1)}% and avg monthly burn of ${fmt(forecast.avg_monthly_burn)} are ${margin > 15 ? 'healthy' : 'manageable'}.`,
    })
  }
  if (actions.length < 3) {
    actions.push({
      priority: 11,
      text: `Review subscription and SaaS spend for unused seats or duplicate tools to reduce fixed overhead.`,
    })
  }
  if (actions.length < 3) {
    actions.push({
      priority: 12,
      text: `Negotiate annual pricing with top suppliers to lock in rates and reduce variable cost volatility.`,
    })
  }

  actions.sort((a, b) => a.priority - b.priority)

  return {
    health_score: totalScore,
    score_breakdown: {
      cost_structure:  { score: costStructureScore,  reasoning: costStructureReasoning },
      profit_quality:  { score: profitScore,         reasoning: profitReasoning },
      cash_efficiency: { score: cashScore,           reasoning: cashReasoning },
      expense_control: { score: expenseScore,        reasoning: expenseReasoning },
    },
    top_3_controllable_improvements: actions.slice(0, 3).map(a => a.text),
  }
}
