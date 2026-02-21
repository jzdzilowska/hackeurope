import { NextResponse } from 'next/server'

// Stub: real Plaid replaced by mock flow in onboarding UI
export async function POST() {
  return NextResponse.json({ link_token: 'mock-link-token', expiration: null })
}
