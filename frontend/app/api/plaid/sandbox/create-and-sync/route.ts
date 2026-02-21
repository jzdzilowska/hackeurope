import { NextRequest, NextResponse } from 'next/server';

// DEV ONLY: Plaid sandbox route — disabled (plaid SDK not configured)
export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: 'Plaid sandbox not configured' }, { status: 501 });
}
