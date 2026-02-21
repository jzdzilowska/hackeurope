import { NextRequest, NextResponse } from 'next/server';

// Plaid sync route — disabled (plaid SDK not configured)
export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: 'Plaid sync not configured' }, { status: 501 });
}
