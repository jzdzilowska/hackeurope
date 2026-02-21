import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { mapAccountType, getInstitutionColor } from '@/lib/dashboard/categories';

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch accounts with institution info
    const { data: dbAccounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, name, official_name, type, subtype, balance_available, balance_current, balance_limit, iso_currency_code, plaid_item_id, updated_at')
      .eq('user_id', user_id);

    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    // Get institution names from plaid_items
    const itemIds = Array.from(new Set((dbAccounts || []).map((a) => a.plaid_item_id)));
    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('item_id, institution_name')
      .in('item_id', itemIds);

    const institutionMap = new Map(
      (plaidItems || []).map((p) => [p.item_id, p.institution_name]),
    );

    const accounts = (dbAccounts || []).map((a) => {
      const institution = institutionMap.get(a.plaid_item_id) || 'Unknown Bank';
      return {
        id: a.id,
        plaidItemId: a.plaid_item_id,
        name: a.name,
        officialName: a.official_name || a.name,
        institution,
        institutionColor: getInstitutionColor(institution),
        type: mapAccountType(a.type, a.subtype),
        currency: a.iso_currency_code || 'USD',
        currentBalance: Number(a.balance_current) || 0,
        availableBalance: Number(a.balance_available) || 0,
        lastSynced: a.updated_at || new Date().toISOString(),
      };
    });

    // --- KPI calculations ---

    // Total cash position
    const totalCashPosition = (dbAccounts || []).reduce((sum, a) => {
      if (a.type === 'depository') return sum + (Number(a.balance_current) || 0);
      if (a.type === 'credit') return sum - (Number(a.balance_current) || 0);
      return sum;
    }, 0);

    // Monthly burn from last 4 months of transactions
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, date, category_primary')
      .eq('user_id', user_id)
      .eq('pending', false)
      .gte('date', fourMonthsAgo.toISOString().split('T')[0]);

    const monthlyBurns = new Map<string, number>();
    (txns || []).forEach((t) => {
      if (t.amount <= 0) return; // skip income
      if (t.category_primary === 'INCOME' || t.category_primary === 'TRANSFER_IN') return;
      const month = t.date.substring(0, 7);
      monthlyBurns.set(month, (monthlyBurns.get(month) || 0) + Number(t.amount));
    });

    const sortedMonths = Array.from(monthlyBurns.keys()).sort();
    const recentBurns = sortedMonths.slice(-3).map((m) => monthlyBurns.get(m)!);

    const monthlyBurn = recentBurns.length > 0
      ? recentBurns.reduce((a, b) => a + b, 0) / recentBurns.length
      : 0;

    const burnTrend = recentBurns.length >= 2
      ? ((recentBurns[recentBurns.length - 1] - recentBurns[recentBurns.length - 2]) / recentBurns[recentBurns.length - 2]) * 100
      : 0;

    const runway = monthlyBurn > 0 ? totalCashPosition / monthlyBurn : 99;

    // Due soon — pending invoices within 14 days
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    const { data: dueInvoices } = await supabase
      .from('invoices')
      .select('amount')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .lte('due_date', twoWeeksOut.toISOString().split('T')[0]);

    const dueSoon = (dueInvoices || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const dueSoonCount = (dueInvoices || []).length;

    // Health score
    let healthScore = 50;
    if (runway > 6) healthScore += 20;
    else if (runway > 3) healthScore += 10;
    else healthScore -= 10;

    if (burnTrend < 0) healthScore += 15;
    else if (burnTrend > 10) healthScore -= 10;

    if (dueSoonCount === 0) healthScore += 10;

    const creditBalance = (dbAccounts || []).reduce((s, a) =>
      a.type === 'credit' ? s + (Number(a.balance_current) || 0) : s, 0);
    if (totalCashPosition > 0 && creditBalance < totalCashPosition * 0.2) healthScore += 5;

    healthScore = Math.max(0, Math.min(100, healthScore));

    const kpis = {
      totalCashPosition: Math.round(totalCashPosition * 100) / 100,
      runway: Math.round(runway * 10) / 10,
      monthlyBurn: Math.round(monthlyBurn * 100) / 100,
      burnTrend: Math.round(burnTrend * 10) / 10,
      dueSoon: Math.round(dueSoon * 100) / 100,
      dueSoonCount,
      financialHealthScore: Math.round(healthScore),
    };

    return NextResponse.json({ accounts, kpis });
  } catch (error: unknown) {
    console.error('Dashboard overview failed:', error);
    const message = error instanceof Error ? error.message : 'Overview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
