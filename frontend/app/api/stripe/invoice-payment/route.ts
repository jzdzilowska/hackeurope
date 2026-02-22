import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Stripe test card tokens (always succeed in sandbox) ───────────────────────
// pm_card_visa   → Visa, no 3DS, succeeds immediately
// pm_card_amex   → Amex alternative
// See: https://docs.stripe.com/testing#cards
const SANDBOX_PAYMENT_METHOD = 'pm_card_visa'

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === 'sk_test_51...') return null
  return new Stripe(key, { apiVersion: '2026-01-28.clover' })
}

// ── Fallback ref when Stripe key is not yet configured ───────────────────────
function mockStripeId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = 'pi_test_'
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const invoiceId = String(body?.approvalId || '')

  if (!invoiceId) {
    return NextResponse.json({ error: 'approvalId (invoice id) required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── 1. Fetch invoice details from Supabase ────────────────────────────────
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('id, user_id, vendor, amount, due_date, status, parsed_data')
    .eq('id', invoiceId)
    .single()

  if (invErr || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 })
  }

  const amount   = Number(invoice.amount)
  const vendor   = invoice.vendor || 'Vendor'
  const userId   = invoice.user_id
  const dueDate  = invoice.due_date || new Date().toISOString().slice(0, 10)
  // Prefer EUR; fall back to USD if the invoice has a currency in parsed_data
  const currency = (invoice.parsed_data?.currency as string | undefined)?.toLowerCase() ?? 'eur'

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invoice has an invalid amount' }, { status: 400 })
  }

  // ── 2. Look up user's primary checking account for the mock transaction ───
  const { data: accts } = await supabase
    .from('accounts')
    .select('id, plaid_account_id, name, type, subtype')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  const account =
    accts?.find(a => a.subtype === 'checking') ??
    accts?.find(a => a.type === 'depository') ??
    accts?.[0] ??
    null

  // ── 3. Run Stripe sandbox PaymentIntent ───────────────────────────────────
  const stripe = getStripeClient()
  let stripePaymentId: string
  let stripeStatus: string

  if (!stripe) {
    // No key configured — simulate a successful intent locally
    stripePaymentId = mockStripeId()
    stripeStatus    = 'succeeded'
  } else {
    // pm_card_visa always succeeds in Stripe test mode — no real card charged
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses smallest currency unit
      currency,
      confirm: true,
      payment_method: SANDBOX_PAYMENT_METHOD,
      payment_method_types: ['card'],
      description: `Invoice payment — ${vendor}`,
      metadata: {
        invoiceId,
        userId,
        vendor,
        dueDate,
        source: 'helm_dashboard',
        sandbox: 'true',
      },
    })
    stripePaymentId = intent.id
    stripeStatus    = intent.status
  }

  // ── 4. Write mock transaction row to Supabase ─────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  let newTransactionId: string | null = null

  if (account) {
    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({
        user_id:                userId,
        account_id:             account.id,
        plaid_transaction_id:   `stripe_${stripePaymentId}`, // unique synthetic ID
        plaid_account_id:       account.plaid_account_id,
        amount:                 amount,      // positive = money out (Plaid convention)
        date:                   today,
        authorized_date:        today,
        name:                   `Stripe Payment — ${vendor}`,
        merchant_name:          vendor,
        category_primary:       'GENERAL_SERVICES',
        category_detailed:      'GENERAL_SERVICES_OTHER_GENERAL_SERVICES',
        category_confidence:    'HIGH',
        pending:                false,
        payment_channel:        'online',
        iso_currency_code:      currency.toUpperCase(),
      })
      .select('id')
      .single()

    if (!txnErr && txn) {
      newTransactionId = txn.id
    }
  }

  // ── 5. Mark invoice as paid ───────────────────────────────────────────────
  await supabase
    .from('invoices')
    .update({
      status:             'paid',
      stripe_payment_id:  stripePaymentId,
      updated_at:         new Date().toISOString(),
      ...(newTransactionId ? { transaction_id: newTransactionId } : {}),
    })
    .eq('id', invoiceId)

  return NextResponse.json({
    stripeRef:        stripePaymentId,
    stripePaymentId,
    status:           stripeStatus,
    transactionId:    newTransactionId,
    vendor,
    amount,
    currency,
    sandbox:          true,
  })
}
