import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Stripe test payment method — https://docs.stripe.com/testing#cards
const SANDBOX_PAYMENT_METHOD = 'pm_card_visa'

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === 'sk_test_51...') return null
  return new Stripe(key, { apiVersion: '2026-01-28.clover' })
}

function mockSetupId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = 'seti_test_'
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const enable      = Boolean(body?.enable)
  const recurringId = String(body?.recurringId || '')
  const autoPayId   = String(body?.autoPayId || '')   // existing SetupIntent id to cancel
  const merchantName = String(body?.merchantName || 'Vendor')

  const stripe = getStripeClient()

  if (!enable) {
    // ── Disable auto-pay ─────────────────────────────────────────────────────
    if (stripe && autoPayId && autoPayId.startsWith('seti_')) {
      try { await stripe.setupIntents.cancel(autoPayId) } catch { /* already gone */ }
    }
    return NextResponse.json({ autoPayId: null, status: 'disabled', sandbox: true })
  }

  // ── Enable auto-pay: create a Stripe SetupIntent ──────────────────────────
  if (!stripe) {
    return NextResponse.json({
      autoPayId: mockSetupId(),
      status: 'succeeded',
      sandbox: true,
    })
  }

  const setup = await stripe.setupIntents.create({
    confirm: true,
    payment_method: SANDBOX_PAYMENT_METHOD,
    usage: 'off_session',
    payment_method_types: ['card'],
    description: `Auto-pay mandate for ${merchantName}`,
    metadata: { recurringId, sandbox: 'true', source: 'runwave_dashboard' },
  })

  return NextResponse.json({
    autoPayId: setup.id,
    status:    setup.status,
    sandbox:   true,
  })
}
