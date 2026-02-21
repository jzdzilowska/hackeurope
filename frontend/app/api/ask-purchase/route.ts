import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { description, price, currency = 'USD' } = await req.json()
    if (!description || price === undefined) {
      return NextResponse.json({ error: 'description and price are required' }, { status: 400 })
    }

    // Try to call the Python FastAPI backend
    const apiUrl = process.env.PYTHON_API_URL ?? 'http://localhost:8000'
    const resp = await fetch(`${apiUrl}/ask-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, price, currency }),
      signal: AbortSignal.timeout(20000),
    })

    if (!resp.ok) {
      throw new Error(`Python API responded ${resp.status}`)
    }

    const result = await resp.json()
    return NextResponse.json(result)
  } catch (err) {
    // Graceful fallback — return a mock verdict so demo never breaks
    console.warn('Purchase advisor fallback triggered:', err)
    return NextResponse.json({
      risk_level: 'yellow',
      verdict: 'Python API offline — live scoring unavailable. Demo mode active.',
      reasoning: 'The financial advisor API is not currently running. In production this would evaluate the purchase against your live cash position, runway, and category spend.',
      alternatives: ['Start the Python API with: AI_ENABLED=true uvicorn insights_engine.main:app --port 8000'],
      best_time_to_buy: 'Evaluate once API is running',
      runway_after_purchase_months: null,
      investment_opportunity: null,
      _demo: true,
    })
  }
}
