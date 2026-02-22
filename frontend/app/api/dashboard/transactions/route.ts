import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { mapPlaidToHelmCategory } from '@/lib/dashboard/categories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10);

    const supabase = createServiceClient();

    const { data: txns, error, count } = await supabase
      .from('transactions')
      .select('id, account_id, amount, iso_currency_code, date, name, merchant_name, logo_url, category_primary, pending', { count: 'exact' })
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transactions = (txns || []).map((t) => ({
      id: t.id,
      accountId: t.account_id || '',
      amount: -(Number(t.amount)),  // Negate: Plaid positive=expense → frontend negative=debit
      currency: t.iso_currency_code || 'USD',
      date: t.date,
      merchantName: t.merchant_name || t.name || 'Unknown',
      merchantLogoUrl: t.logo_url || undefined,
      helmCategory: mapPlaidToHelmCategory(t.category_primary, t.merchant_name),
      pending: t.pending || false,
    }));

    return NextResponse.json({
      transactions,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    });
  } catch (error: unknown) {
    console.error('Transactions failed:', error);
    const message = error instanceof Error ? error.message : 'Transactions failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
