import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { mapPlaidToRunwaveCategory, type RunwaveCategory } from '@/lib/dashboard/categories';

export const dynamic = 'force-dynamic';

interface InsightCard {
  id: string;
  type: 'anomaly' | 'saving' | 'runway' | 'subscription' | 'margin';
  headline: string;
  body: string;
  actionLabel?: string;
  dismissed: boolean;
  generatedAt: string;
  urgency: 'low' | 'medium' | 'high';
}

// Detects bills that recur at roughly the same time each month.
// Returns each recurring vendor's average monthly cost and the total fixed-cost sum.
function detectFixedCosts(
  txns: Array<{
    amount: number;
    date: string;
    category_primary: string;
    merchant_name: string | null;
    name: string | null;
  }>
): { recurringVendors: Array<{ vendor: string; avgAmount: number }>; totalFixed: number } {
  const expenseTxns = txns.filter(
    (t) =>
      t.amount > 0 &&
      t.category_primary !== 'INCOME' &&
      t.category_primary !== 'TRANSFER_IN' &&
      t.category_primary !== 'TRANSFER_OUT'
  );

  const vendorTxns = new Map<
    string,
    Array<{ amount: number; dayOfMonth: number; month: string }>
  >();

  for (const t of expenseTxns) {
    const vendor = t.merchant_name || t.name;
    if (!vendor) continue;
    const d = new Date(t.date + 'T00:00:00Z');
    const month = t.date.substring(0, 7);
    const dayOfMonth = d.getUTCDate();
    if (!vendorTxns.has(vendor)) vendorTxns.set(vendor, []);
    vendorTxns.get(vendor)!.push({ amount: Number(t.amount), dayOfMonth, month });
  }

  const recurringVendors: Array<{ vendor: string; avgAmount: number }> = [];

  for (const [vendor, entries] of vendorTxns) {
    // Must appear in at least 2 distinct calendar months
    const months = new Set(entries.map((e) => e.month));
    if (months.size < 2) continue;

    // Day-of-month must be consistent (std dev ≤ 7 days)
    const days = entries.map((e) => e.dayOfMonth);
    const meanDay = days.reduce((a, b) => a + b, 0) / days.length;
    const dayStdDev = Math.sqrt(
      days.reduce((sum, d) => sum + (d - meanDay) ** 2, 0) / days.length
    );
    if (dayStdDev > 7) continue;

    // Amount must be consistent (coefficient of variation ≤ 25%)
    const amounts = entries.map((e) => e.amount);
    const meanAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (meanAmount === 0) continue;
    const amountStdDev = Math.sqrt(
      amounts.reduce((sum, a) => sum + (a - meanAmount) ** 2, 0) / amounts.length
    );
    if (amountStdDev / meanAmount > 0.25) continue;

    recurringVendors.push({ vendor, avgAmount: meanAmount });
  }

  recurringVendors.sort((a, b) => b.avgAmount - a.avgAmount);
  const totalFixed = recurringVendors.reduce((s, v) => s + v.avgAmount, 0);
  return { recurringVendors, totalFixed };
}

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const insights: InsightCard[] = [];
    const now = new Date().toISOString();

    // Accounts for cash position
    const { data: accounts } = await supabase
      .from('accounts')
      .select('type, balance_current')
      .eq('user_id', user_id);

    const totalCash = (accounts || []).reduce((s, a) => {
      if (a.type === 'depository') return s + (Number(a.balance_current) || 0);
      if (a.type === 'credit') return s - (Number(a.balance_current) || 0);
      return s;
    }, 0);

    // Last 3 months of expenses
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, date, category_primary, merchant_name, name')
      .eq('user_id', user_id)
      .eq('pending', false)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

    // Monthly burn
    const monthlyBurns = new Map<string, number>();
    (txns || []).forEach((t) => {
      if (t.amount <= 0 || t.category_primary === 'INCOME' || t.category_primary === 'TRANSFER_IN') return;
      const month = t.date.substring(0, 7);
      monthlyBurns.set(month, (monthlyBurns.get(month) || 0) + Number(t.amount));
    });

    const sortedMonths = [...monthlyBurns.keys()].sort();
    const recentBurns = sortedMonths.slice(-3).map((m) => monthlyBurns.get(m)!);
    const avgBurn = recentBurns.length > 0
      ? recentBurns.reduce((a, b) => a + b, 0) / recentBurns.length
      : 0;

    // 1. Runway warning
    const runway = avgBurn > 0 ? totalCash / avgBurn : 99;
    if (runway < 6) {
      insights.push({
        id: 'ins_runway',
        type: 'runway',
        headline: `Cash runway is ${runway.toFixed(1)} months`,
        body: runway < 3
          ? `At your current burn rate of $${Math.round(avgBurn).toLocaleString()}/month, your cash reserves will run out in under 3 months. Consider reducing expenses or accelerating revenue.`
          : `Your burn rate of $${Math.round(avgBurn).toLocaleString()}/month gives you about ${runway.toFixed(1)} months of runway. Not critical yet, but worth monitoring.`,
        actionLabel: 'Review expenses',
        dismissed: false,
        generatedAt: now,
        urgency: runway < 3 ? 'high' : 'medium',
      });
    }

    // 2. Burn trend
    if (recentBurns.length >= 2) {
      const prev = recentBurns[recentBurns.length - 2];
      const curr = recentBurns[recentBurns.length - 1];
      const trend = ((curr - prev) / prev) * 100;

      if (trend > 10) {
        insights.push({
          id: 'ins_burn_trend',
          type: 'anomaly',
          headline: `Spending up ${Math.round(trend)}% vs last month`,
          body: `Monthly expenses increased from $${Math.round(prev).toLocaleString()} to $${Math.round(curr).toLocaleString()}. Review recent transactions to identify the cause.`,
          actionLabel: 'Review transactions',
          dismissed: false,
          generatedAt: now,
          urgency: trend > 25 ? 'high' : 'medium',
        });
      } else if (trend < -10) {
        insights.push({
          id: 'ins_burn_down',
          type: 'saving',
          headline: `Spending down ${Math.abs(Math.round(trend))}% vs last month`,
          body: `Monthly expenses decreased from $${Math.round(prev).toLocaleString()} to $${Math.round(curr).toLocaleString()}. Great cost discipline!`,
          dismissed: false,
          generatedAt: now,
          urgency: 'low',
        });
      }
    }

    // 3. Top spending category
    const categoryTotals = new Map<RunwaveCategory, number>();
    (txns || []).forEach((t) => {
      if (t.amount <= 0 || t.category_primary === 'INCOME' || t.category_primary === 'TRANSFER_IN') return;
      const cat = mapPlaidToRunwaveCategory(t.category_primary, t.merchant_name);
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Number(t.amount));
    });

    const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      const totalExpenses = [...categoryTotals.values()].reduce((a, b) => a + b, 0);
      const pct = Math.round((topCategory[1] / totalExpenses) * 100);
      if (pct > 30) {
        insights.push({
          id: 'ins_top_category',
          type: 'margin',
          headline: `${topCategory[0]} is ${pct}% of total spend`,
          body: `Over the last 3 months, ${topCategory[0]} accounts for $${Math.round(topCategory[1]).toLocaleString()} — the largest category. Consider whether there are optimization opportunities.`,
          actionLabel: 'View breakdown',
          dismissed: false,
          generatedAt: now,
          urgency: pct > 50 ? 'medium' : 'low',
        });
      }
    }

    // 4. Upcoming invoices
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    const { data: dueInvoices } = await supabase
      .from('invoices')
      .select('vendor, amount, due_date')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .lte('due_date', twoWeeksOut.toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(5);

    if (dueInvoices && dueInvoices.length > 0) {
      const totalDue = dueInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const vendorList = dueInvoices.map((i) => i.vendor).join(', ');
      insights.push({
        id: 'ins_invoices_due',
        type: 'subscription',
        headline: `$${Math.round(totalDue).toLocaleString()} in invoices due within 2 weeks`,
        body: `${dueInvoices.length} pending invoice${dueInvoices.length > 1 ? 's' : ''} from ${vendorList}. Review and approve payments to avoid late fees.`,
        actionLabel: 'Review invoices',
        dismissed: false,
        generatedAt: now,
        urgency: totalDue > avgBurn * 0.3 ? 'high' : 'medium',
      });
    }

    // 5. Large transaction anomaly
    const categoryAvgs = new Map<string, { total: number; count: number }>();
    (txns || []).forEach((t) => {
      if (t.amount <= 0) return;
      const cat = t.category_primary || 'OTHER';
      const entry = categoryAvgs.get(cat) || { total: 0, count: 0 };
      entry.total += Number(t.amount);
      entry.count += 1;
      categoryAvgs.set(cat, entry);
    });

    const recentTxns = (txns || [])
      .filter((t) => t.amount > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);

    for (const t of recentTxns) {
      const cat = t.category_primary || 'OTHER';
      const avg = categoryAvgs.get(cat);
      if (avg && avg.count >= 3 && Number(t.amount) > (avg.total / avg.count) * 2.5) {
        insights.push({
          id: `ins_anomaly_${t.date}`,
          type: 'anomaly',
          headline: `Unusually large ${t.merchant_name || 'transaction'} charge`,
          body: `$${Number(t.amount).toLocaleString()} on ${t.date} is significantly above the average for this category. Worth verifying this was expected.`,
          actionLabel: 'View transaction',
          dismissed: false,
          generatedAt: now,
          urgency: 'medium',
        });
        break;
      }
    }

    // 6. Fixed costs — recurring bills at the same time each month
    const { recurringVendors, totalFixed } = detectFixedCosts(txns || []);
    if (recurringVendors.length > 0) {
      const topVendors = recurringVendors
        .slice(0, 3)
        .map((v) => `${v.vendor} ($${Math.round(v.avgAmount).toLocaleString()})`)
        .join(', ');
      const remaining = recurringVendors.length - 3;
      const vendorSummary =
        remaining > 0 ? `${topVendors}, and ${remaining} more` : topVendors;
      insights.push({
        id: 'ins_fixed_costs',
        type: 'subscription',
        headline: `$${Math.round(totalFixed).toLocaleString()}/mo in fixed recurring costs`,
        body: `Detected ${recurringVendors.length} bill${recurringVendors.length > 1 ? 's' : ''} that recur at the same time each month: ${vendorSummary}.`,
        actionLabel: 'View recurring',
        dismissed: false,
        generatedAt: now,
        urgency: totalFixed > avgBurn * 0.5 ? 'medium' : 'low',
      });
    }

    return NextResponse.json({
      insights,
      fixedCosts: {
        totalMonthly: Math.round(totalFixed * 100) / 100,
        topExpenses: recurringVendors.slice(0, 3).map((v) => ({
          vendor: v.vendor,
          avgMonthly: Math.round(v.avgAmount * 100) / 100,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('Insights failed:', error);
    const message = error instanceof Error ? error.message : 'Insights failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
