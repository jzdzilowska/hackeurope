import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: txns, error } = await supabase
      .from('transactions')
      .select('amount, date, category_primary')
      .eq('user_id', user_id)
      .eq('pending', false)
      .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by YYYY-MM
    const months = new Map<string, { burn: number; revenue: number }>();

    (txns || []).forEach((t) => {
      const monthKey = t.date.substring(0, 7);
      if (!months.has(monthKey)) months.set(monthKey, { burn: 0, revenue: 0 });
      const entry = months.get(monthKey)!;

      const isIncome = t.category_primary === 'INCOME' || t.category_primary === 'TRANSFER_IN';

      if (isIncome || t.amount < 0) {
        // Income — Plaid negative amounts or INCOME category
        entry.revenue += Math.abs(Number(t.amount));
      } else {
        // Expense — Plaid positive amounts
        entry.burn += Number(t.amount);
      }
    });

    // Sort chronologically and format
    const data = Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const monthIdx = parseInt(key.split('-')[1], 10) - 1;
        return {
          month: MONTH_NAMES[monthIdx],
          burn: Math.round(val.burn * 100) / 100,
          revenue: Math.round(val.revenue * 100) / 100,
          net: Math.round((val.revenue - val.burn) * 100) / 100,
        };
      });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('Burn chart failed:', error);
    const message = error instanceof Error ? error.message : 'Burn chart failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
