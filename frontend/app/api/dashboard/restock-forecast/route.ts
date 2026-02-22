import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface WeeklyPoint {
  weekStart: string;
  amount: number;
}

export interface RestockForecastResponse {
  cogsRate: number;
  lagDays: number;
  lagWeeks: number;
  bestCorrelation: number;
  confidence: 'high' | 'medium' | 'low';
  avgWeeklySales: number;
  avgWeeklyRestock: number;
  dueNextWeek: number;
  dueNextMonth: number;
  impliedRestockFromRecentSales: number;
  impliedRestockDueDate: string;
  sensitivity: {
    salesChangePct: 10;
    weeklyRestockDelta: number;
    monthlyRestockDelta: number;
    lagDays: number;
  };
  chart: {
    salesSeries: WeeklyPoint[];
    restockSeries: WeeklyPoint[];
    lagWeeks: number;
  };
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMondayOf(d: Date): Date {
  const day = d.getUTCDay();
  const m = new Date(d);
  m.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  m.setUTCHours(0, 0, 0, 0);
  return m;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const sdx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const sdy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  if (sdx === 0 || sdy === 0) return 0;
  return cov / (sdx * sdy);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Supplier vendor keywords from all payable invoices
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('vendor, parsed_data')
      .eq('user_id', user_id)
      .not('vendor', 'is', null);

    const supplierKeywords = new Set<string>();
    for (const inv of allInvoices ?? []) {
      if (inv.parsed_data?.type === 'payable' && inv.vendor) {
        const kw = inv.vendor.toLowerCase().trim().substring(0, 8);
        if (kw.length >= 5) supplierKeywords.add(kw);
      }
    }

    // 2. Transactions — past 3 months
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, date, category_primary, merchant_name, name')
      .eq('user_id', user_id)
      .eq('pending', false)
      .gte('date', toISO(threeMonthsAgo))
      .lte('date', toISO(today));

    // 3. Classify into sales inflows and inventory outflows
    const salesByDate = new Map<string, number>();
    const restockByDate = new Map<string, number>();

    for (const t of txns ?? []) {
      const amt = Number(t.amount);
      const date = t.date;

      if (amt < 0 && t.category_primary === 'INCOME') {
        salesByDate.set(date, (salesByDate.get(date) ?? 0) + Math.abs(amt));
        continue;
      }

      if (amt > 0) {
        const txnName = `${t.merchant_name ?? ''} ${t.name ?? ''}`.toLowerCase();
        const isSupplier = [...supplierKeywords].some((kw) => txnName.includes(kw));
        if (isSupplier) {
          restockByDate.set(date, (restockByDate.get(date) ?? 0) + amt);
        }
      }
    }

    // 4. Bucket into weekly totals
    const startMonday = getMondayOf(threeMonthsAgo);

    const mondays: Date[] = [];
    for (const m = new Date(startMonday); m <= today; m.setUTCDate(m.getUTCDate() + 7)) {
      mondays.push(new Date(m));
    }

    const weeklySales: number[] = [];
    const weeklyRestock: number[] = [];

    for (const monday of mondays) {
      let sales = 0;
      let restock = 0;
      for (let d = 0; d < 7; d++) {
        const iso = toISO(addDays(monday, d));
        sales += salesByDate.get(iso) ?? 0;
        restock += restockByDate.get(iso) ?? 0;
      }
      weeklySales.push(sales);
      weeklyRestock.push(restock);
    }

    const numWeeks = mondays.length;

    // 5. COGS rate
    const totalSales = weeklySales.reduce((a, b) => a + b, 0);
    const totalRestock = weeklyRestock.reduce((a, b) => a + b, 0);
    const cogsRate = totalSales > 0 ? totalRestock / totalSales : 0;

    const avgWeeklySales = numWeeks > 0 ? totalSales / numWeeks : 0;
    const avgWeeklyRestock = numWeeks > 0 ? totalRestock / numWeeks : 0;

    // 6. Lag detection via Pearson correlation sweep
    const MAX_LAG_WEEKS = Math.min(8, Math.floor(numWeeks / 2));
    let bestLagWeeks = 1;
    let bestCorr = -Infinity;

    for (let k = 1; k <= MAX_LAG_WEEKS; k++) {
      const xs = weeklySales.slice(0, numWeeks - k);
      const ys = weeklyRestock.slice(k);
      if (xs.length < 3) continue;
      const r = pearson(xs, ys);
      if (r > bestCorr) {
        bestCorr = r;
        bestLagWeeks = k;
      }
    }

    if (bestCorr < 0.1 || numWeeks < 4) {
      bestLagWeeks = 1;
      bestCorr = 0;
    }

    const lagDays = bestLagWeeks * 7;

    const confidence: 'high' | 'medium' | 'low' =
      bestCorr >= 0.6 && numWeeks >= 8
        ? 'high'
        : bestCorr >= 0.3 && numWeeks >= 4
          ? 'medium'
          : 'low';

    // 7. Forecasts
    const dueNextWeek = round2(avgWeeklyRestock);
    const dueNextMonth = round2(avgWeeklyRestock * 4.33);

    const thirtyDaysAgo = toISO(addDays(today, -30));
    let recentSales = 0;
    for (const [date, amt] of salesByDate) {
      if (date >= thirtyDaysAgo) recentSales += amt;
    }
    const impliedRestockFromRecentSales = round2(recentSales * cogsRate);
    const impliedRestockDueDate = toISO(addDays(today, lagDays));

    const weeklyRestockDelta = round2(avgWeeklySales * 0.1 * cogsRate);
    const monthlyRestockDelta = round2(avgWeeklySales * 4.33 * 0.1 * cogsRate);

    // 8. Chart series
    const salesSeries: WeeklyPoint[] = mondays.map((m, i) => ({
      weekStart: toISO(m),
      amount: round2(weeklySales[i]),
    }));

    const restockSeries: WeeklyPoint[] = mondays.map((m, i) => ({
      weekStart: toISO(m),
      amount: round2(weeklyRestock[i]),
    }));

    const response: RestockForecastResponse = {
      cogsRate: round2(cogsRate),
      lagDays,
      lagWeeks: bestLagWeeks,
      bestCorrelation: round2(bestCorr),
      confidence,
      avgWeeklySales: round2(avgWeeklySales),
      avgWeeklyRestock: round2(avgWeeklyRestock),
      dueNextWeek,
      dueNextMonth,
      impliedRestockFromRecentSales,
      impliedRestockDueDate,
      sensitivity: {
        salesChangePct: 10,
        weeklyRestockDelta,
        monthlyRestockDelta,
        lagDays,
      },
      chart: {
        salesSeries,
        restockSeries,
        lagWeeks: bestLagWeeks,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Restock forecast failed:', error);
    const message = error instanceof Error ? error.message : 'Restock forecast failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW THIS ENDPOINT WORKS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GOAL
 * ────
 * Estimate how much money will need to go out on inventory restocking next week
 * and next month, based on actual sales collected and supplier payment history.
 * The core insight is that in a wholesale business, restocking spend lags behind
 * sales collections by a consistent number of weeks — you sell, then reorder.
 *
 *
 * STEP 1 — IDENTIFY SALES INFLOWS
 * ────────────────────────────────
 * Source: Plaid `transactions` table.
 * Filter: `category_primary === 'INCOME'` AND `amount < 0` (Plaid convention:
 * negative = money arriving in the account). This captures all customer
 * payments — wholesale orders, retail POs, design-studio billings, etc.
 * Excluded: internal transfers (TRANSFER_IN), loan drawdowns, and any
 * non-income credits, which would skew the sales figure.
 *
 *
 * STEP 2 — IDENTIFY INVENTORY OUTFLOWS
 * ──────────────────────────────────────
 * Source: same `transactions` table, cross-referenced against the `invoices`
 * table (payable invoices only, i.e., `parsed_data.type === 'payable'`).
 *
 * Each payable invoice vendor name is truncated to its first 8 characters and
 * used as a fuzzy-match keyword (e.g. "Pacific Hardwoods Inc" → "pacific h").
 * A Plaid outflow transaction (`amount > 0`) is counted as an inventory payment
 * if its `merchant_name` or `name` contains any of those keywords.
 *
 * Keywords shorter than 5 characters are dropped to avoid false positives
 * (e.g., "SBA" could match unrelated transactions).
 *
 *
 * STEP 3 — COGS RATE
 * ───────────────────
 * Computed over the trailing 3 months:
 *
 *   cogsRate = total_inventory_outflows / total_sales_inflows
 *
 * This is the historical ratio of "for every $1 collected from customers,
 * how much went out to inventory suppliers." It acts as the COGS proxy.
 * A rate of 0.38 means 38 cents in supplier payments for every dollar of sales.
 *
 *
 * STEP 4 — LAG DETECTION (PEARSON CORRELATION SWEEP)
 * ────────────────────────────────────────────────────
 * Both sales and restock data are grouped into weekly buckets (Monday → Sunday).
 * For each candidate lag k = 1…8 weeks, the Pearson correlation is computed
 * between:
 *
 *   sales[week t]   and   restock[week t + k]
 *
 * The lag with the highest positive correlation is chosen as `lagWeeks`.
 * Interpretation: if lagWeeks = 3, supplier payments tend to land ~3 weeks
 * after the sales that triggered the reorder.
 *
 * Minimum data requirement: at least 3 data-point pairs per lag candidate.
 * If the best correlation is < 0.1 or fewer than 4 weeks of data exist,
 * the lag defaults to 1 week and confidence is set to 'low'.
 *
 * Confidence levels:
 *   high   → Pearson r ≥ 0.60 AND ≥ 8 weeks of history
 *   medium → Pearson r ≥ 0.30 AND ≥ 4 weeks of history
 *   low    → insufficient data or weak correlation (use with caution)
 *
 *
 * STEP 5 — FORECASTS
 * ───────────────────
 * dueNextWeek / dueNextMonth
 *   The trailing average weekly restock spend, scaled to 7 or 30 days.
 *   This answers: "how much should I budget for supplier payments in the
 *   near term, based on recent history?" It does not depend on the lag.
 *
 * impliedRestockFromRecentSales
 *   Sales collected in the last 30 days × cogsRate. This is the restock
 *   spend that has been "triggered" by recent customer orders but has not
 *   yet been paid. It will likely land around impliedRestockDueDate
 *   (= today + lagDays). Use this to anticipate the coming cash outflow.
 *
 *
 * STEP 6 — SENSITIVITY
 * ─────────────────────
 * If weekly sales increase by 10 %:
 *
 *   weeklyRestockDelta  = avgWeeklySales × 0.10 × cogsRate
 *   monthlyRestockDelta = avgWeeklySales × 4.33 × 0.10 × cogsRate
 *
 * These deltas will materialise ~lagDays after the sales period.
 * Display as: "+10% in sales → +$X restock spend in ~Y days."
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW TO BUILD THE CHART ("Sales vs Restock — Lagged")
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The chart shows that inventory spend follows sales with a delay, making the
 * lag relationship visible at a glance.
 *
 * DATA
 * ────
 * chart.salesSeries   — array of { weekStart, amount }, one entry per Monday,
 *                       covering the trailing 3 months. amount = total customer
 *                       payments received that week.
 *
 * chart.restockSeries — same shape. amount = total supplier payments made that
 *                       week. Raw, unshifted — the chart shift is done in the UI.
 *
 * chart.lagWeeks      — integer (1–8). Shift the restock line RIGHT by this
 *                       many slots relative to the sales line.
 *
 * RENDERING APPROACH
 * ───────────────────
 * 1. X-axis: weekStart dates from salesSeries (Monday labels, e.g. "Nov 24").
 *
 * 2. Plot salesSeries as a solid area or bar — e.g. blue.
 *
 * 3. Plot restockSeries shifted right by lagWeeks positions:
 *      restockSeries[i] is plotted at x-position (i + lagWeeks).
 *    This aligns each restock week with the sales week that caused it.
 *    Use a dashed or differently-coloured line — e.g. amber.
 *    The first lagWeeks x-positions will have no restock data (pad with null).
 *
 * 4. Add a vertical "Today" marker at the current week's x-position.
 *
 * 5. Optionally, extend the chart rightward by lagWeeks positions showing the
 *    PROJECTED restock (sales[last_weeks] × cogsRate) as a shaded / dotted area
 *    to visualise the spend that has already been triggered but not yet paid.
 *
 * EXAMPLE (lagWeeks = 2)
 * ──────────────────────
 *
 *   Week index:   0    1    2    3    4    5    6
 *   weekStart:   W0   W1   W2   W3   W4   W5   W6
 *   Sales:       ██   ██   ██   ██   ██   ██   ██   ← solid bars
 *   Restock:          ░░   ░░   ░░   ░░   ░░   ░░   ← shifted 2 right, dashed
 *                ↑ no restock shown for W0–W1 (lag period)
 *
 *   Reading: the restock bar at W3 corresponds to sales collected at W1.
 *            cogsRate tells you how tall the restock bar should be relative
 *            to the sales bar (restockSeries[i] ≈ salesSeries[i] × cogsRate).
 *
 * RECOMMENDED LIBRARY
 * ────────────────────
 * Recharts (already used in the project) with a ComposedChart:
 *   - <Bar dataKey="sales" data={salesSeries} />
 *   - <Line dataKey="restock" data={shiftedRestockSeries} strokeDasharray="4 2" />
 * where shiftedRestockSeries = restockSeries.map((pt, i) => ({
 *   weekStart: salesSeries[i + lagWeeks]?.weekStart ?? null,
 *   amount: pt.amount,
 * }))
 */
