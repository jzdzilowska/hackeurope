import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export interface MonthlySnapshot {
  month: string;
  snapshotDate: string;
  cashOnDate: number;
  inflows30d: number;
  outflows30d: number;
  restock30d: number;
  surplus: number;
  type: 'historical' | 'upcoming';
}

export interface SurplusResponse {
  months: MonthlySnapshot[];
  summary: {
    monthsAnalysed: number;
    avgSurplus: number;
    minSurplus: number;
    maxSurplus: number;
    consistentFloor: number;
    negativeMonths: number;
    interpretation: string;
  };
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumInRange(map: Map<string, number>, from: string, to: string): number {
  let total = 0;
  for (const [date, val] of map) {
    if (date >= from && date <= to) total += val;
  }
  return total;
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

    const currentCash = (accounts ?? []).reduce((s, a) => {
      if (a.type === 'depository') return s + (Number(a.balance_current) || 0);
      if (a.type === 'credit') return s - (Number(a.balance_current) || 0);
      return s;
    }, 0);

    // 2. Transactions — 13-month window
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayISO = toISO(today);

    const windowStart = new Date(today);
    windowStart.setMonth(windowStart.getMonth() - 13);

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, date, category_primary, merchant_name, name')
      .eq('user_id', user_id)
      .eq('pending', false)
      .gte('date', toISO(windowStart));

    // 3. All invoices
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('vendor, amount, due_date, status, parsed_data')
      .eq('user_id', user_id)
      .not('due_date', 'is', null);

    // 4. Supplier keywords
    const supplierKeywords = new Set<string>();
    for (const inv of allInvoices ?? []) {
      if (inv.parsed_data?.type === 'payable' && inv.vendor) {
        const kw = inv.vendor.toLowerCase().trim().substring(0, 8);
        if (kw.length >= 5) supplierKeywords.add(kw);
      }
    }

    const isSupplierMatch = (name: string) =>
      [...supplierKeywords].some((kw) => name.toLowerCase().includes(kw));

    // 5. Classify transactions into per-day maps
    const txnInflowByDate = new Map<string, number>();
    const txnRestockByDate = new Map<string, number>();
    const txnOutflowByDate = new Map<string, number>();
    const txnNetByDate = new Map<string, number>();

    for (const t of txns ?? []) {
      const amt = Number(t.amount);
      const date = t.date;

      txnNetByDate.set(date, (txnNetByDate.get(date) ?? 0) - amt);

      if (amt < 0 && t.category_primary === 'INCOME') {
        txnInflowByDate.set(date, (txnInflowByDate.get(date) ?? 0) + Math.abs(amt));
        continue;
      }

      if (amt > 0 && t.category_primary !== 'TRANSFER_OUT') {
        const txnName = `${t.merchant_name ?? ''} ${t.name ?? ''}`;
        if (isSupplierMatch(txnName)) {
          txnRestockByDate.set(date, (txnRestockByDate.get(date) ?? 0) + amt);
        } else {
          txnOutflowByDate.set(date, (txnOutflowByDate.get(date) ?? 0) + amt);
        }
      }
    }

    // 6. Backward-cumulative net for cash reconstruction
    const allHistoricalDates: string[] = [];
    for (const d = new Date(windowStart); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      allHistoricalDates.push(toISO(new Date(d)));
    }

    let cumulativeSum = 0;
    const cumulativeToToday = new Map<string, number>();
    for (let i = allHistoricalDates.length - 1; i >= 0; i--) {
      cumulativeSum += txnNetByDate.get(allHistoricalDates[i]) ?? 0;
      cumulativeToToday.set(allHistoricalDates[i], cumulativeSum);
    }

    // 7. COGS rate + average monthly restock fallback
    const totalSales = [...txnInflowByDate.values()].reduce((a, b) => a + b, 0);
    const totalRestock = [...txnRestockByDate.values()].reduce((a, b) => a + b, 0);
    void (totalSales > 0 ? totalRestock / totalSales : 0); // cogsRate (available if needed)

    const histMonthCount = Math.max(1, allHistoricalDates.length / 30.44);
    const avgMonthlyRestock = round2(totalRestock / histMonthCount);

    // 8. Pending-invoice maps for upcoming projection
    const invReceivableByDate = new Map<string, number>();
    const invPayableRestockByDate = new Map<string, number>();
    const invPayableOtherByDate = new Map<string, number>();

    for (const inv of allInvoices ?? []) {
      if (!['pending', 'overdue'].includes(inv.status)) continue;
      const date = inv.due_date as string;
      const amount = Math.abs(Number(inv.amount));
      const type: string = inv.parsed_data?.type ?? 'payable';
      const vendorName = inv.vendor ?? '';

      if (type === 'receivable') {
        invReceivableByDate.set(date, (invReceivableByDate.get(date) ?? 0) + amount);
      } else if (isSupplierMatch(vendorName)) {
        invPayableRestockByDate.set(date, (invPayableRestockByDate.get(date) ?? 0) + amount);
      } else {
        invPayableOtherByDate.set(date, (invPayableOtherByDate.get(date) ?? 0) + amount);
      }
    }

    function projectedCashOn(targetISO: string): number {
      let net = 0;
      for (const [d, a] of invReceivableByDate) {
        if (d > todayISO && d < targetISO) net += a;
      }
      for (const [d, a] of invPayableRestockByDate) {
        if (d > todayISO && d < targetISO) net -= a;
      }
      for (const [d, a] of invPayableOtherByDate) {
        if (d > todayISO && d < targetISO) net -= a;
      }
      return currentCash + net;
    }

    // 9. Monthly snapshots — past 12 months + upcoming month, always on the 2nd
    const snapshots: MonthlySnapshot[] = [];

    for (let offset = -12; offset <= 1; offset++) {
      const snapDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 2),
      );
      const snapISO = toISO(snapDate);
      const windowEndISO = toISO(addDays(snapDate, 30));
      const month = snapISO.substring(0, 7);
      const isHistorical = snapISO <= todayISO;

      if (isHistorical) {
        const cum = cumulativeToToday.get(snapISO) ?? 0;
        const cashOnDate = currentCash - cum;
        const inflows30d = sumInRange(txnInflowByDate, snapISO, windowEndISO);
        const restock30d = sumInRange(txnRestockByDate, snapISO, windowEndISO);
        const outflows30d = sumInRange(txnOutflowByDate, snapISO, windowEndISO);

        snapshots.push({
          month,
          snapshotDate: snapISO,
          cashOnDate: round2(cashOnDate),
          inflows30d: round2(inflows30d),
          outflows30d: round2(outflows30d),
          restock30d: round2(restock30d),
          surplus: round2(cashOnDate + inflows30d - outflows30d - restock30d),
          type: 'historical',
        });
      } else {
        const cashOnDate = projectedCashOn(snapISO);
        const inflows30d = sumInRange(invReceivableByDate, snapISO, windowEndISO);
        const payableRestock = sumInRange(invPayableRestockByDate, snapISO, windowEndISO);
        const outflows30d = sumInRange(invPayableOtherByDate, snapISO, windowEndISO);
        const restock30d = payableRestock > 0 ? payableRestock : avgMonthlyRestock;

        snapshots.push({
          month,
          snapshotDate: snapISO,
          cashOnDate: round2(cashOnDate),
          inflows30d: round2(inflows30d),
          outflows30d: round2(outflows30d),
          restock30d: round2(restock30d),
          surplus: round2(cashOnDate + inflows30d - outflows30d - restock30d),
          type: 'upcoming',
        });
      }
    }

    // 10. Summary statistics
    const historical = snapshots.filter(
      (s) =>
        s.type === 'historical' &&
        (s.inflows30d > 0 || s.outflows30d > 0 || s.restock30d > 0),
    );

    const monthsAnalysed = historical.length;
    const surpluses = historical.map((s) => s.surplus);
    const avgSurplus =
      monthsAnalysed > 0
        ? round2(surpluses.reduce((a, b) => a + b, 0) / monthsAnalysed)
        : 0;
    const minSurplus = monthsAnalysed > 0 ? round2(Math.min(...surpluses)) : 0;
    const maxSurplus = monthsAnalysed > 0 ? round2(Math.max(...surpluses)) : 0;
    const negativeMonths = surpluses.filter((s) => s < 0).length;
    const consistentFloor = round2(Math.max(0, minSurplus * 0.8));

    let interpretation: string;
    if (monthsAnalysed === 0) {
      interpretation =
        'Insufficient transaction history to compute a reliable surplus floor.';
    } else if (negativeMonths > monthsAnalysed / 2) {
      interpretation =
        `Surplus was negative in ${negativeMonths} of ${monthsAnalysed} months analysed. ` +
        `Cash position is structurally tight — do not deploy capital until inflow consistency improves.`;
    } else if (negativeMonths > 0) {
      interpretation =
        `Surplus was negative in ${negativeMonths} of ${monthsAnalysed} months. ` +
        `Average surplus was $${Math.round(avgSurplus).toLocaleString()}, but the presence of negative months ` +
        `means a conservative floor of $0 is warranted until the pattern is understood.`;
    } else {
      interpretation =
        `Over ${monthsAnalysed} month${monthsAnalysed > 1 ? 's' : ''} with activity, ` +
        `surplus on the 2nd averaged $${Math.round(avgSurplus).toLocaleString()} ` +
        `(range: $${Math.round(minSurplus).toLocaleString()} – $${Math.round(maxSurplus).toLocaleString()}). ` +
        `A conservative safe-to-invest floor (worst month × 80%) is ` +
        `$${Math.round(consistentFloor).toLocaleString()}/month.`;
    }

    return NextResponse.json({
      months: snapshots,
      summary: {
        monthsAnalysed,
        avgSurplus,
        minSurplus,
        maxSurplus,
        consistentFloor,
        negativeMonths,
        interpretation,
      },
    } satisfies SurplusResponse);
  } catch (error: unknown) {
    console.error('Surplus calculation failed:', error);
    const message = error instanceof Error ? error.message : 'Surplus calculation failed';
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
 * Answer "how much cash is safely deployable each month?" by computing a
 * 30-day forward liquidity surplus at a fixed, comparable point in every month:
 * the 2nd. The 2nd is chosen because the prior month's inventory purchase
 * orders have already been placed by that date, so the cash picture reflects
 * the true working-capital position rather than a pre-commitment peak.
 *
 * Core formula (repeated for each monthly snapshot S = YYYY-MM-02):
 *
 *   surplus(S) = cash_on_S
 *              + customer_inflows( S → S+30 )
 *              − committed_outflows( S → S+30 )   [excl. restock]
 *              − restock_spend( S → S+30 )
 *
 * The endpoint returns 12 historical snapshots (reconstructed from Plaid
 * transaction data) plus 1 upcoming snapshot (projected from open invoices),
 * along with a summary of the consistent surplus floor.
 *
 *
 * ── STEP 1: CURRENT CASH ────────────────────────────────────────────────────
 *
 * Summed from Plaid `accounts`:
 *   +balance_current  for depository accounts (checking, savings)
 *   −balance_current  for credit accounts (outstanding balance = liability)
 *
 *
 * ── STEP 2: CLASSIFY TRANSACTIONS ───────────────────────────────────────────
 *
 * 13 months of settled (non-pending) Plaid transactions are fetched and split
 * into three per-day maps:
 *
 * txnInflowByDate
 *   category_primary = 'INCOME' AND amount < 0 (Plaid: negative = money in).
 *   Stored as a positive number. Represents customer receipts — wholesale POs,
 *   retail orders, design-studio billings.
 *
 * txnRestockByDate
 *   amount > 0 AND merchant/name fuzzy-matches a known supplier keyword.
 *   Supplier keywords are extracted from payable invoices (parsed_data.type =
 *   'payable'): first 8 characters of each vendor name, minimum 5 chars.
 *   E.g. "Pacific Hardwoods Inc" → keyword "pacific h".
 *   This separates inventory capital spend from overhead.
 *
 * txnOutflowByDate
 *   All remaining positive-amount transactions excluding TRANSFER_OUT.
 *   Captures committed overhead: rent, utilities, payroll, insurance, SaaS,
 *   marketing, loan repayments, and variable ops spend.
 *
 * A fourth map, txnNetByDate = −Σ(txn.amount), accumulates the net daily
 * balance effect and is used exclusively for cash reconstruction (step 3).
 *
 *
 * ── STEP 3: CASH RECONSTRUCTION (HISTORICAL) ────────────────────────────────
 *
 * To know the cash balance on any past date S, we work backwards from the
 * current known balance:
 *
 *   cashOnDate(S) = currentCash − cumulativeToToday(S)
 *
 * where cumulativeToToday(S) = Σ( txnNetByDate[d] for d in [S, today] ).
 *
 * Built by iterating the full historical date array in reverse (today → S)
 * and accumulating a running sum. If net flows from S to today were positive
 * (more money came in than went out), we had less cash at S — subtracting
 * that cumulative sum rolls the balance back correctly.
 *
 *
 * ── STEP 4: COGS RATE + MONTHLY RESTOCK FALLBACK ───────────────────────────
 *
 * avgMonthlyRestock = totalRestockHistory / monthsCovered
 * Used as a fallback for the upcoming month when no supplier invoices are on
 * file for the 30-day window.
 *
 *
 * ── STEP 5: UPCOMING MONTH PROJECTION ───────────────────────────────────────
 *
 * For the one future snapshot (next month's 2nd), all four components come
 * from open invoices (status = 'pending' or 'overdue'):
 *
 * cashOnDate (projected):
 *   currentCash + Σ(receivable invoices due in (today, S))
 *               − Σ(payable invoices due in (today, S))
 *   Rolls current cash forward to the 2nd using all known open invoices
 *   as a cash bridge — mirrors the /cashflow projection logic.
 *
 * inflows30d:
 *   Σ(receivable invoice amounts due in [S, S+30])
 *
 * outflows30d:
 *   Σ(non-supplier payable invoice amounts due in [S, S+30])
 *
 * restock30d:
 *   Σ(supplier payable invoice amounts due in [S, S+30]) if any exist,
 *   otherwise avgMonthlyRestock from transaction history.
 *
 *
 * ── STEP 6: SUMMARY STATISTICS ──────────────────────────────────────────────
 *
 * Only historical months with at least one non-zero flow component are counted.
 *
 * consistentFloor = max(0, minSurplus × 0.80)
 *   The worst recorded monthly surplus, discounted by 20% as a safety buffer.
 *   This is the most conservative estimate of capital that can be deployed
 *   every month without risking a liquidity shortfall.
 *
 * negativeMonths
 *   Months where surplus < 0: cash + inflows could not cover all 30-day
 *   obligations. If this is > half of monthsAnalysed, the interpretation
 *   flags a structural cash problem rather than an outlier.
 *
 * interpretation
 *   A pre-built plain-English string summarising the findings, ready to
 *   render directly as an insight card body on the dashboard.
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW TO BUILD THE CHART ("Monthly Surplus Waterfall")
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * RECOMMENDED CHART TYPE
 * ──────────────────────
 * A stacked bar chart per month with a net surplus line overlay.
 * One entry per month from `months` array (13 total: 12 historical + 1 upcoming).
 *
 *
 * DATA MAPPING
 * ────────────
 * Each MonthlySnapshot provides:
 *
 *   cashOnDate   → starting cash level on the 2nd (reference dot / annotation)
 *   inflows30d   → positive stack segment (money expected in)
 *   outflows30d  → negative stack segment (committed overhead out)
 *   restock30d   → negative stack segment (inventory spend out)
 *   surplus      → net line value = cashOnDate + inflows30d - outflows30d - restock30d
 *   type         → 'historical' | 'upcoming' (controls styling)
 *
 *
 * RENDERING APPROACH
 * ──────────────────
 * 1. X-axis: month labels from `months[i].month` (e.g. "Feb 2025").
 *    Format with a short month name: new Date(month + '-01').toLocaleDateString('en', {month:'short', year:'2-digit'})
 *
 * 2. Positive stacked bars (above zero baseline):
 *    Segment A — inflows30d     → blue   "Customer receipts"
 *
 * 3. Negative stacked bars (below zero baseline):
 *    Segment B — outflows30d    → slate/grey  "Overhead & ops"
 *    Segment C — restock30d     → amber        "Inventory restock"
 *
 * 4. Net surplus line overlay:
 *    Plot `surplus` as a <Line> on top of the bars.
 *    Colour the line green if surplus ≥ 0, red if surplus < 0.
 *    Use dots at each data point; tooltip shows the exact surplus value.
 *
 * 5. Reference lines:
 *    Horizontal dashed line at `summary.consistentFloor`
 *      → label: "Safe floor ($X/mo)"
 *    Horizontal dashed line at y = 0 (zero baseline)
 *    Vertical marker between the last historical bar and the upcoming bar
 *      → label: "Today"
 *
 * 6. Upcoming month styling:
 *    Render the last bar (type = 'upcoming') with dashed bar borders and
 *    reduced opacity (e.g. 0.5) to distinguish projection from actuals.
 *    Add a tooltip note: "Projected — based on open invoices".
 *
 *
 * EXAMPLE LAYOUT (ASCII)
 * ──────────────────────
 *
 *  $k
 *  200 ┤  ██        ██  ██  ██  ██  ██  ░░
 *  150 ┤  ██  ██  ██  ██  ██  ██  ██  ██  ░░   ← inflows (blue)
 *  100 ┤──●───●───●───●───●───●───●───●───●──  ← surplus line
 *   50 ┤
 *    0 ┼──────────────────────────────────────
 *  -50 ┤  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ░░      ← overhead (slate)
 * -100 ┤  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░      ← restock (amber)
 *       Feb Mar Apr May Jun Jul Aug Sep Oct  ← x-axis
 *            historical months          ↑ upcoming
 *       ─────────────── safe floor ──────────  ← dashed ref line
 *
 *
 * RECHARTS SNIPPET
 * ────────────────
 * import { ComposedChart, Bar, Line, ReferenceLine, Cell } from 'recharts';
 *
 * const data = months.map(m => ({
 *   month:     m.month,
 *   inflows:   m.inflows30d,
 *   overhead: -m.outflows30d,
 *   restock:  -m.restock30d,
 *   surplus:   m.surplus,
 *   projected: m.type === 'upcoming',
 * }));
 *
 * <ComposedChart data={data}>
 *   <Bar dataKey="inflows"  stackId="a" fill="#3b82f6" />
 *   <Bar dataKey="overhead" stackId="b" fill="#64748b">
 *     {data.map((d, i) => <Cell key={i} opacity={d.projected ? 0.45 : 1} />)}
 *   </Bar>
 *   <Bar dataKey="restock"  stackId="b" fill="#f59e0b">
 *     {data.map((d, i) => <Cell key={i} opacity={d.projected ? 0.45 : 1} />)}
 *   </Bar>
 *   <Line dataKey="surplus" dot stroke="#22c55e" strokeWidth={2} />
 *   <ReferenceLine y={0}                     stroke="#94a3b8" strokeDasharray="3 3" />
 *   <ReferenceLine y={summary.consistentFloor} stroke="#22c55e" strokeDasharray="5 3"
 *                  label={{ value: 'Safe floor', position: 'insideTopLeft' }} />
 * </ComposedChart>
 */
