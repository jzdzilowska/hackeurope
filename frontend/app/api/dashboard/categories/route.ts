import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { mapPlaidToHelmCategory, HELM_CATEGORY_COLORS, type HelmCategory } from '@/lib/dashboard/categories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Current month expenses
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: txns, error } = await supabase
      .from('transactions')
      .select('amount, category_primary, merchant_name')
      .eq('user_id', user_id)
      .eq('pending', false)
      .gte('date', monthStart)
      .gt('amount', 0); // expenses only (Plaid positive = money out)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate by HelmCategory
    const categoryTotals = new Map<HelmCategory, number>();

    (txns || []).forEach((t) => {
      // Skip income categories that slipped through
      if (t.category_primary === 'INCOME' || t.category_primary === 'TRANSFER_IN') return;

      const cat = mapPlaidToHelmCategory(t.category_primary, t.merchant_name);
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Number(t.amount));
    });

    const total = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);

    const categories = Array.from(categoryTotals.entries())
      .map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
        pct: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
        color: HELM_CATEGORY_COLORS[name],
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({ categories });
  } catch (error: unknown) {
    console.error('Categories failed:', error);
    const message = error instanceof Error ? error.message : 'Categories failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
