import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

const priceIds: Record<string, Record<string, string | undefined>> = {
  growth: {
    monthly: process.env.STRIPE_PRICE_ID_GROWTH_MONTHLY,
    annual: process.env.STRIPE_PRICE_ID_GROWTH_ANNUAL,
  },
}

export async function POST(req: NextRequest) {
  // If Stripe isn't configured, return a fallback URL
  if (!stripeSecretKey) {
    return NextResponse.json({
      url: null,
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.',
    })
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

  try {
    const { plan, interval } = await req.json()

    const priceId = priceIds[plan]?.[interval]

    if (!priceId) {
      return NextResponse.json({
        url: null,
        message: `No price ID configured for ${plan}/${interval}. Set STRIPE_PRICE_ID_GROWTH_MONTHLY and STRIPE_PRICE_ID_GROWTH_ANNUAL.`,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/onboarding?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/#pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
