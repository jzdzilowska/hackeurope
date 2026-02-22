import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'
import { computeFinancialHealth, computeForecastData } from '@/lib/insights-compute'

export const dynamic = 'force-dynamic'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

function smartFallback(description: string, price: number, currency: string) {
  const risk_level = price > 50000 ? 'red' : price > 10000 ? 'yellow' : 'green'
  return {
    risk_level,
    verdict:
      risk_level === 'green'
        ? `${description} appears affordable given your current cash position.`
        : risk_level === 'yellow'
        ? `${description} is a significant purchase — review your runway first.`
        : `${description} at ${currency} ${price.toLocaleString()} poses a cash risk. Consider deferring.`,
    reasoning:
      'Evaluated against typical SME working capital thresholds. For a precise verdict, ensure Gemini API key is configured.',
    alternatives: [
      'Consider leasing instead of purchasing outright',
      'Explore supplier financing or extended payment terms',
      'Phase the investment across two quarters',
    ],
    best_time_to_buy: risk_level === 'green' ? 'Now is reasonable' : 'After your next restock cycle clears',
    runway_after_purchase_months: null,
    investment_opportunity: null,
  }
}

export async function POST(req: Request) {
  let body: { description?: string; price?: number; currency?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { description, price, currency = 'EUR' } = body
  if (!description || price === undefined) {
    return NextResponse.json({ error: 'description and price are required' }, { status: 400 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return NextResponse.json(smartFallback(description, price, currency))
  }

  // Fetch live financial context from Supabase
  let financialContext = 'Live financial data unavailable.'
  let runwayAfterPurchase: number | null = null
  try {
    const supabase = createServiceClient()
    const [health, forecast] = await Promise.all([
      computeFinancialHealth(supabase, USER_ID),
      computeForecastData(supabase, USER_ID),
    ])
    const runway =
      forecast.avg_monthly_burn > 0
        ? Math.round((health.net_worth / forecast.avg_monthly_burn) * 10) / 10
        : null
    runwayAfterPurchase =
      forecast.avg_monthly_burn > 0
        ? Math.round(((health.net_worth - price) / forecast.avg_monthly_burn) * 10) / 10
        : null

    financialContext = `
Current financial position:
- Net cash: ${currency} ${health.net_worth.toLocaleString()}
- Total income (last period): ${currency} ${health.total_income.toLocaleString()}
- Total expenditure (last period): ${currency} ${health.total_expenditure.toLocaleString()}
- Profit margin: ${health.profit_margin_pct.toFixed(1)}%
- Average monthly burn: ${currency} ${forecast.avg_monthly_burn.toLocaleString()}
- Current cash runway: ${runway !== null ? runway + ' months' : 'unknown'}
- Runway after this purchase: ${runwayAfterPurchase !== null ? runwayAfterPurchase + ' months' : 'unknown'}
- Outstanding invoices: ${currency} ${health.outstanding_invoice_total.toLocaleString()}
- Overdue invoices: ${currency} ${health.overdue_invoice_total.toLocaleString()}
    `.trim()
  } catch (err) {
    console.warn('[ask-purchase] Could not fetch financial context:', err)
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a CFO advisor for a wholesale SME. Evaluate this purchase and return ONLY valid JSON — no markdown, no code fences.

Purchase: "${description}"
Price: ${currency} ${price}

${financialContext}

Return exactly this JSON structure:
{
  "risk_level": "green" | "yellow" | "red",
  "verdict": "One-sentence verdict (max 15 words)",
  "reasoning": "2-3 sentences referencing the actual numbers above",
  "alternatives": ["alternative 1", "alternative 2"],
  "best_time_to_buy": "Specific timing recommendation",
  "runway_after_purchase_months": ${runwayAfterPurchase !== null ? runwayAfterPurchase : 'null'},
  "investment_opportunity": null
}

Risk guidance:
- green: purchase < 5% of net cash AND runway after > 6 months
- yellow: purchase 5-15% of net cash OR runway after 3-6 months
- red: purchase > 15% of net cash OR runway after < 3 months`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    // Strip any accidental markdown code fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    // Ensure runway_after is always the computed value, not hallucinated
    if (runwayAfterPurchase !== null) {
      parsed.runway_after_purchase_months = runwayAfterPurchase
    }
    return NextResponse.json(parsed)
  } catch (err) {
    console.warn('[ask-purchase] Gemini error, using smart fallback:', err)
    return NextResponse.json(smartFallback(description, price, currency))
  }
}
