import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { mapPlaidToRunwaveCategory } from '@/lib/dashboard/categories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get pending invoices — exclude failed-parse rows (null vendor or zero amount)
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, vendor, amount, due_date, status, parsed_data, transaction_id, created_at')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .not('vendor', 'is', null)
      .gt('amount', 0)
      .order('due_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For each invoice, look up last paid transaction from same vendor
    const approvals = await Promise.all(
      (invoices || []).map(async (inv) => {
        let lastPaidAmount = Number(inv.amount);
        let lastPaidDate = inv.due_date;
        let runwaveCategory: ReturnType<typeof mapPlaidToRunwaveCategory> = 'Other';

        // Find last transaction matching this vendor
        if (inv.vendor) {
          const { data: pastTxns } = await supabase
            .from('transactions')
            .select('amount, date, category_primary, merchant_name, logo_url')
            .eq('user_id', user_id)
            .or(`merchant_name.ilike.%${inv.vendor.substring(0, 10)}%,name.ilike.%${inv.vendor.substring(0, 10)}%`)
            .order('date', { ascending: false })
            .limit(1);

          if (pastTxns && pastTxns.length > 0) {
            lastPaidAmount = Math.abs(Number(pastTxns[0].amount));
            lastPaidDate = pastTxns[0].date;
            runwaveCategory = mapPlaidToRunwaveCategory(pastTxns[0].category_primary, pastTxns[0].merchant_name);
          }
        }

        const amount = Number(inv.amount);

        return {
          id: inv.id,
          recurringId: inv.id,
          merchantName: inv.vendor || 'Unknown',
          merchantLogoUrl: undefined,
          runwaveCategory,
          expectedAmount: amount,
          expectedAmountMax: Math.round(amount * 1.1 * 100) / 100,
          expectedDate: inv.due_date,
          lastPaidAmount,
          lastPaidDate,
          status: 'pending' as const,
          createdAt: inv.created_at,
        };
      }),
    );

    return NextResponse.json({ approvals });
  } catch (error: unknown) {
    console.error('Invoices failed:', error);
    const message = error instanceof Error ? error.message : 'Invoices failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
