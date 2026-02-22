import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

export async function POST() {
  const apiUrl = process.env.PYTHON_API_URL ?? 'http://localhost:8000'

  try {
    // Trigger Python backend refresh for both health + subscription insights
    const [healthRes, subRes] = await Promise.allSettled([
      fetch(`${apiUrl}/financial-health/${USER_ID}?refresh=true`, {
        signal: AbortSignal.timeout(30000),
      }),
      fetch(`${apiUrl}/insights/${USER_ID}`, {
        signal: AbortSignal.timeout(30000),
      }),
    ])

    const healthOk = healthRes.status === 'fulfilled' && healthRes.value.ok
    const subOk = subRes.status === 'fulfilled' && subRes.value.ok

    if (!healthOk && !subOk) {
      return NextResponse.json(
        { status: 'unavailable', detail: 'Python API offline' },
        { status: 503 },
      )
    }

    // Clear stale flag after successful regeneration
    const supabase = createServiceClient()
    await supabase
      .from('ai_insights')
      .update({ stale: false })
      .eq('user_id', USER_ID)

    return NextResponse.json({
      status: 'regenerated',
      health: healthOk,
      subscriptions: subOk,
    })
  } catch (err) {
    console.warn('Regenerate failed:', err)
    return NextResponse.json(
      { status: 'unavailable', detail: 'Python API unreachable' },
      { status: 503 },
    )
  }
}
