import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  computeFinancialHealth,
  computeForecastData,
  computeHeuristicScoreAndActions,
} from '@/lib/insights-compute'

export const dynamic = 'force-dynamic'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

export async function GET() {
  try {
    const supabase = createServiceClient()

    // Live computation + AI cache in parallel
    const [health, forecast, aiCache] = await Promise.all([
      computeFinancialHealth(supabase, USER_ID),
      computeForecastData(supabase, USER_ID),
      // Try with stale column; fall back without it (migration may not be applied yet)
      supabase
        .from('ai_insights')
        .select('type, data, created_at, stale')
        .eq('user_id', USER_ID)
        .in('type', ['financial_health_report', 'subscription_insights'])
        .order('created_at', { ascending: false })
        .then(res => res.error
          ? supabase
              .from('ai_insights')
              .select('type, data, created_at')
              .eq('user_id', USER_ID)
              .in('type', ['financial_health_report', 'subscription_insights'])
              .order('created_at', { ascending: false })
          : res
        ),
    ])

    const aiRows = aiCache.data ?? []
    const healthRow = aiRows.find(r => r.type === 'financial_health_report')
    const subRow = aiRows.find(r => r.type === 'subscription_insights')
    const aiHealth = healthRow?.data as Record<string, unknown> | undefined
    const aiSub = subRow?.data as Record<string, unknown> | undefined
    const aiStale = (healthRow as Record<string, unknown> | undefined)?.stale === true

    // If stale, fire background regeneration (non-blocking)
    if (aiStale) {
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      fetch(`${origin}/api/insights-data/regenerate`, { method: 'POST' }).catch(() => {})
    }

    // Build health response: live numbers + AI narrative overlay
    const heuristic = computeHeuristicScoreAndActions(health, forecast)
    const healthResponse = {
      // Live-computed numeric fields
      net_worth: health.net_worth,
      effective_net_worth: health.effective_net_worth,
      outstanding_invoice_total: health.outstanding_invoice_total,
      overdue_invoice_total: health.overdue_invoice_total,
      total_income: health.total_income,
      total_expenditure: health.total_expenditure,
      total_profit: health.total_profit,
      profit_margin_pct: health.profit_margin_pct,
      cost_breakdown: health.cost_breakdown,
      // Live forecast fields
      avg_monthly_burn: forecast.avg_monthly_burn,
      historical_months: forecast.historical_months,
      predicted_burn_next_month: forecast.predicted_expenditure,
      predicted_income_next_month: forecast.predicted_income,
      // AI narrative fields (from cache, with heuristic fallbacks)
      health_score: (aiHealth?.health_score as number) ?? heuristic.health_score,
      score_breakdown: aiHealth?.score_breakdown ?? heuristic.score_breakdown,
      executive_briefing: aiHealth?.executive_briefing ?? null,
      forecast_reasoning: (aiHealth?.forecast_reasoning as string) ?? null,
      forecast_confidence: (aiHealth?.forecast_confidence as string) ?? (aiHealth ? 'medium' : 'low'),
      benchmark_comparison: aiHealth?.benchmark_comparison ?? null,
      seasonal_risk: aiHealth?.seasonal_risk ?? null,
      inventory_alert: aiHealth?.inventory_alert ?? null,
      lazy_cash_alert: aiHealth?.lazy_cash_alert ?? null,
      investment_opportunity: aiHealth?.investment_opportunity ?? null,
      top_3_controllable_improvements: aiHealth?.top_3_controllable_improvements ?? heuristic.top_3_controllable_improvements,
      payroll_assessment: aiHealth?.payroll_assessment ?? null,
      variable_cost_assessment: aiHealth?.variable_cost_assessment ?? null,
    }

    // Build subscriptions response from AI cache if available
    const subResponse = aiSub ?? {
      summary: 'AI analysis pending — refresh to generate.',
      priority_score: 0,
      total_estimated_monthly_savings: 0,
      total_estimated_annual_savings: 0,
      insights: [],
      raw: {
        runway_stress_test: {
          current_balance: health.net_worth,
          avg_monthly_burn: forecast.avg_monthly_burn,
          stressed_runway_months: forecast.avg_monthly_burn > 0
            ? Math.round(((health.net_worth * 0.7) / (forecast.avg_monthly_burn * 1.1)) * 10) / 10
            : 0,
        },
      },
    }

    return NextResponse.json({
      health: healthResponse,
      subscriptions: subResponse,
      lastUpdated: new Date().toISOString(),
      live: true,
      aiStale,
    })
  } catch (err) {
    console.error('Insights API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
