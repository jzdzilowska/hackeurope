import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

export async function GET() {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('ai_insights')
      .select('type, data, created_at, valid_until')
      .eq('user_id', DEMO_USER_ID)
      .in('type', ['financial_health_report', 'subscription_insights'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const health = data?.find(r => r.type === 'financial_health_report')?.data ?? null
    const subscriptions = data?.find(r => r.type === 'subscription_insights')?.data ?? null
    const lastUpdated = data?.[0]?.created_at ?? null

    return NextResponse.json({ health, subscriptions, lastUpdated })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
