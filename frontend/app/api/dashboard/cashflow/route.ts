import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface CashflowWeek {
  weekStart: string;
  balance: number;
  inflow: number;
  outflow: number;
  type: 'historical' | 'projection';
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMondayOf(d: Date): Date {
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Current cash
    const { data: accounts } = await supabase
      .from('accounts')
      .select('type, balance_current')
      .eq('user_id', user_id);

    const currentCash = (accounts || []).reduce((s, a) => {
      if (a.type === 'depository') return s + (Number(a.balance_current) || 0);
      if (a.type === 'credit') return s - (Number(a.balance_current) || 0);
      return s;
    }, 0);

    // 2. Settled transactions — past 3 months
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, date')
      .eq('user_id', user_id)
      .eq('pending', false)
      .gte('date', toISO(threeMonthsAgo))
      .lte('date', toISO(today));

    // 3. Pending/overdue invoices — up to 4 weeks out
    const fourWeeksOut = addDays(today, 28);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, due_date, parsed_data')
      .eq('user_id', user_id)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', toISO(fourWeeksOut));

    // 4. Per-day delta maps
    const txnDayDelta = new Map<string, number>();
    for (const t of txns ?? []) {
      txnDayDelta.set(t.date, (txnDayDelta.get(t.date) ?? 0) - Number(t.amount));
    }

    const invoiceDayDelta = new Map<string, { inflow: number; outflow: number }>();
    for (const inv of invoices ?? []) {
      const date = inv.due_date;
      if (!date) continue;
      const type: string = inv.parsed_data?.type ?? 'payable';
      const amount = Math.abs(Number(inv.amount));
      if (!invoiceDayDelta.has(date)) invoiceDayDelta.set(date, { inflow: 0, outflow: 0 });
      const entry = invoiceDayDelta.get(date)!;
      if (type === 'receivable') entry.inflow += amount;
      else entry.outflow += amount;
    }

    // 5. Backward-cumulative txn delta for historical balance reconstruction
    const allHistoricalDates: string[] = [];
    for (const d = new Date(threeMonthsAgo); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      allHistoricalDates.push(toISO(new Date(d)));
    }

    let runningSum = 0;
    const cumulativeToToday = new Map<string, number>();
    for (let i = allHistoricalDates.length - 1; i >= 0; i--) {
      runningSum += txnDayDelta.get(allHistoricalDates[i]) ?? 0;
      cumulativeToToday.set(allHistoricalDates[i], runningSum);
    }

    // 6. Forward-cumulative invoice net for projected balance
    const tomorrow = addDays(today, 1);
    const allFutureDates: string[] = [];
    for (const d = new Date(tomorrow); d <= fourWeeksOut; d.setUTCDate(d.getUTCDate() + 1)) {
      allFutureDates.push(toISO(new Date(d)));
    }

    let futureRunning = 0;
    const cumulativeInvoiceNet = new Map<string, number>();
    for (const date of allFutureDates) {
      const entry = invoiceDayDelta.get(date);
      futureRunning += entry ? entry.inflow - entry.outflow : 0;
      cumulativeInvoiceNet.set(date, futureRunning);
    }

    // 7. Generate all Mondays in range
    const startMonday = getMondayOf(threeMonthsAgo);
    const todayMonday = getMondayOf(today);
    const endMonday = getMondayOf(fourWeeksOut);

    const mondays: Date[] = [];
    for (
      const m = new Date(startMonday);
      m <= endMonday;
      m.setUTCDate(m.getUTCDate() + 7)
    ) {
      mondays.push(new Date(m));
    }

    // 8. Compute per-week values
    const weeks: CashflowWeek[] = mondays.map((monday) => {
      const mondayISO = toISO(monday);
      const isHistorical = monday <= todayMonday;

      if (isHistorical) {
        const cum = cumulativeToToday.get(mondayISO) ?? 0;
        const balance = currentCash - cum;

        let inflow = 0;
        let outflow = 0;
        for (let d = 0; d < 7; d++) {
          const delta = txnDayDelta.get(toISO(addDays(monday, d))) ?? 0;
          if (delta > 0) inflow += delta;
          else outflow += Math.abs(delta);
        }

        return {
          weekStart: mondayISO,
          balance: Math.round(balance * 100) / 100,
          inflow: Math.round(inflow * 100) / 100,
          outflow: Math.round(outflow * 100) / 100,
          type: 'historical',
        };
      } else {
        const dayBefore = toISO(addDays(monday, -1));
        const cum = cumulativeInvoiceNet.get(dayBefore) ?? 0;
        const balance = currentCash + cum;

        let inflow = 0;
        let outflow = 0;
        for (let d = 0; d < 7; d++) {
          const entry = invoiceDayDelta.get(toISO(addDays(monday, d)));
          if (entry) {
            inflow += entry.inflow;
            outflow += entry.outflow;
          }
        }

        return {
          weekStart: mondayISO,
          balance: Math.round(balance * 100) / 100,
          inflow: Math.round(inflow * 100) / 100,
          outflow: Math.round(outflow * 100) / 100,
          type: 'projection',
        };
      }
    });

    return NextResponse.json({
      currentCash: Math.round(currentCash * 100) / 100,
      weeks,
    });
  } catch (error: unknown) {
    console.error('Cashflow projection failed:', error);
    const message = error instanceof Error ? error.message : 'Cashflow failed';
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
 * Produce a week-by-week cash balance time series anchored to today's known
 * Plaid balance. Historical weeks are reconstructed backwards from actual
 * transactions; future weeks are projected forwards using open invoices.
 * The result covers the trailing 3 months and the next 4 weeks in a single
 * unified array, ready to feed a continuous line chart.
 *
 *
 * ── STEP 1: CURRENT CASH ────────────────────────────────────────────────────
 *
 * The anchor for all balance calculations. Summed from Plaid `accounts`:
 *   +balance_current  for depository accounts (checking, savings)
 *   −balance_current  for credit accounts (outstanding = liability)
 *
 * This value is the only real-time balance we have. Everything else is
 * derived from it by adding or subtracting transaction / invoice flows.
 *
 *
 * ── STEP 2: PER-DAY DELTA MAPS ──────────────────────────────────────────────
 *
 * txnDayDelta[date]
 *   Built from 3 months of settled (non-pending) Plaid transactions.
 *   Plaid convention: positive amount = outflow, negative = inflow.
 *   The sign is flipped on storage: txnDayDelta = −Σ(txn.amount),
 *   so positive values mean a net gain day, negative means a net loss day.
 *
 * invoiceDayDelta[date] = { inflow, outflow }
 *   Built from pending and overdue invoices due within the next 4 weeks.
 *   Invoice direction comes from parsed_data.type:
 *     'receivable' → inflow  (customer will pay you)
 *     'payable'    → outflow (you will pay the vendor)
 *   Amounts are stored as absolute values.
 *
 *
 * ── STEP 3: HISTORICAL BALANCE RECONSTRUCTION ───────────────────────────────
 *
 * cumulativeToToday[date] = Σ( txnDayDelta[d] for d in [date, today] )
 *
 * Built by iterating the historical date array in reverse (today → start)
 * and keeping a running sum. This gives the cumulative net flow from any
 * past date up to and including today.
 *
 * Opening balance on historical Monday m:
 *   balance[m] = currentCash − cumulativeToToday[m]
 *
 * Intuition: if net flows from m to today were +$50,000 (we received more
 * than we spent), then we had $50,000 less at m than we have now. Subtracting
 * that cumulative sum rolls the balance back correctly.
 *
 * The balance represents the opening position at the start of Monday m,
 * before that week's transactions have settled.
 *
 *
 * ── STEP 4: PROJECTED BALANCE ───────────────────────────────────────────────
 *
 * cumulativeInvoiceNet[date] = Σ( (inflow − outflow) for invoices due in [tomorrow, date] )
 *
 * Built by iterating future dates forward from tomorrow, accumulating
 * receivable inflows and payable outflows from the invoiceDayDelta map.
 *
 * Opening balance on future Monday m:
 *   balance[m] = currentCash + cumulativeInvoiceNet[ m − 1 day ]
 *
 * The "day before" lookup ensures we only include invoices that settled
 * before Monday begins — the opening balance does not include flows due
 * on Monday itself (those appear in that week's inflow/outflow).
 *
 *
 * ── STEP 5: WEEKLY AGGREGATION ──────────────────────────────────────────────
 *
 * All Mondays from (3 months ago) to (4 weeks ahead) are generated.
 * For each Monday, the 7-day window [Monday, Sunday] is iterated:
 *
 * Historical weeks:
 *   inflow  = Σ( max(0, txnDayDelta[d]) for d in week )    net gain days
 *   outflow = Σ( max(0, −txnDayDelta[d]) for d in week )   net loss days
 *
 * Projection weeks:
 *   inflow  = Σ( invoiceDayDelta[d].inflow  for d in week )
 *   outflow = Σ( invoiceDayDelta[d].outflow for d in week )
 *
 * The split between historical (≤ this week's Monday) and projection
 * (> this week's Monday) is determined by comparing each Monday date
 * against todayMonday = getMondayOf(today).
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW TO BUILD THE CHART ("Cash Position — 3 Months + 4-Week Forecast")
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * RECOMMENDED CHART TYPE
 * ──────────────────────
 * A ComposedChart with:
 *   - Area or Line for the running cash balance
 *   - Bar pair (inflow / outflow) shown below or alongside the balance line
 *   - A vertical "Today" reference line splitting history from projection
 *
 *
 * DATA MAPPING
 * ────────────
 * Each CashflowWeek provides:
 *
 *   weekStart  → x-axis label (ISO Monday date)
 *   balance    → opening cash for that week (the main line / area value)
 *   inflow     → weekly receipts (positive bar)
 *   outflow    → weekly payments (negative bar, negate for display)
 *   type       → 'historical' | 'projection' (controls line style and bar opacity)
 *
 * currentCash from the top-level response is the actual balance today,
 * useful as a reference dot or annotation on the chart.
 *
 *
 * RENDERING APPROACH
 * ──────────────────
 * 1. X-axis: weekStart dates, formatted as short labels.
 *      new Date(weekStart).toLocaleDateString('en', { month: 'short', day: 'numeric' })
 *    Historical and projection weeks share the same continuous x-axis.
 *
 * 2. Balance area / line:
 *    Plot `balance` as an <Area> or <Line>.
 *    Historical segment → solid, filled (e.g. indigo/blue).
 *    Projection segment → dashed stroke, lighter fill or no fill.
 *    Transition point: the week where type switches from 'historical' to
 *    'projection'. Split into two series or use a custom dot/stroke renderer.
 *
 * 3. Inflow / outflow bars (optional secondary axis or grouped below):
 *    inflow  → positive bar, green
 *    outflow → negative bar (store as −outflow), red/rose
 *    Projection bars → reduced opacity (0.5) with dashed border.
 *
 * 4. Reference lines:
 *    Vertical dashed line at the "today" week's x-position.
 *      → label: "Today"
 *    Horizontal line at y = 0 (zero-cash warning zone).
 *    Optional: horizontal line at currentCash (current snapshot marker).
 *
 * 5. Tooltip:
 *    Show weekStart, balance, inflow, outflow, and type ('Actual' / 'Projected').
 *
 *
 * EXAMPLE LAYOUT (ASCII)
 * ──────────────────────
 *
 *  $k
 *  150 ┤          ╭───────────────╮·····················
 *  120 ┤    ╭─────╯               ╰──────╮··············  ← balance line
 *   90 ┤────╯                            ╰····          (solid = historical,
 *   60 ┤                                      ·····      dotted = projection)
 *   30 ┤
 *    0 ┼──────────────────────────┬──────────────────────
 *  -30 ┤  ▌▌  ▌▌  ▌▌  ▌▌  ▌▌  ▌▌│ ░░  ░░  ░░  ░░  ░░  ← outflow bars
 *       Nov Dec Jan Feb ← historical  Today → Mar      ← x-axis
 *              ─────── inflow bars (green, above) ────
 *
 *
 * RECHARTS SNIPPET
 * ────────────────
 * import { ComposedChart, Area, Bar, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
 *
 * const data = weeks.map(w => ({
 *   week:       new Date(w.weekStart).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
 *   balance:    w.balance,
 *   inflow:     w.inflow,
 *   outflow:   -w.outflow,    // negate for below-zero display
 *   projected:  w.type === 'projection',
 * }));
 *
 * // Split into two series for solid vs dashed styling
 * const historical  = data.map(d => ({ ...d, balance: d.projected ? null : d.balance }));
 * const projection  = data.map(d => ({ ...d, balance: d.projected ? d.balance : null }));
 *
 * const todayLabel = data.find((_, i) => weeks[i].type === 'projection')?.week;
 *
 * <ComposedChart data={data}>
 *   <XAxis dataKey="week" />
 *   <YAxis />
 *   <Tooltip formatter={(v, name) => [`$${v.toLocaleString()}`, name]} />
 *
 *   <Area dataKey="balance" data={historical} fill="#6366f1" stroke="#6366f1"
 *         fillOpacity={0.15} connectNulls={false} />
 *   <Area dataKey="balance" data={projection} fill="#6366f1" stroke="#6366f1"
 *         strokeDasharray="6 3" fillOpacity={0.05} connectNulls={false} />
 *
 *   <Bar dataKey="inflow"  fill="#22c55e" opacity={d => d.projected ? 0.45 : 1} />
 *   <Bar dataKey="outflow" fill="#f43f5e" opacity={d => d.projected ? 0.45 : 1} />
 *
 *   <ReferenceLine x={todayLabel} stroke="#94a3b8" strokeDasharray="4 2"
 *                  label={{ value: 'Today', position: 'top' }} />
 *   <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
 * </ComposedChart>
 *
 * Note: Recharts does not natively support per-bar opacity callbacks via the
 * `opacity` prop on <Bar>. Use a custom <Cell> renderer instead:
 *
 *   <Bar dataKey="inflow" fill="#22c55e">
 *     {data.map((d, i) => <Cell key={i} fillOpacity={d.projected ? 0.45 : 1} />)}
 *   </Bar>
 */
