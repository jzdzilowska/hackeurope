import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc';

async function verify() {
  console.log('=== Data Verification ===\n');

  // Transaction count by category
  const { data: txns } = await supabase
    .from('transactions')
    .select('category_primary, amount')
    .eq('user_id', TEST_USER_ID);

  const catCounts: Record<string, { count: number; totalAmt: number }> = {};
  let totalRevenue = 0;
  let totalExpense = 0;

  for (const t of txns!) {
    const cat = t.category_primary || 'UNKNOWN';
    if (!catCounts[cat]) catCounts[cat] = { count: 0, totalAmt: 0 };
    catCounts[cat].count++;
    catCounts[cat].totalAmt += t.amount;
    if (t.amount < 0) totalRevenue += Math.abs(t.amount);
    else totalExpense += t.amount;
  }

  console.log(`Total transactions: ${txns!.length}\n`);
  console.log('Category breakdown:');
  for (const [cat, data] of Object.entries(catCounts).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${cat.padEnd(25)} ${String(data.count).padStart(4)} txns  $${data.totalAmt.toFixed(2).padStart(12)}`);
  }

  console.log(`\nTotal Revenue (money in):  $${totalRevenue.toFixed(2)}`);
  console.log(`Total Expenses (money out): $${totalExpense.toFixed(2)}`);
  console.log(`Net:                        $${(totalRevenue - totalExpense).toFixed(2)}`);

  // Invoice breakdown
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status, amount, parsed_data')
    .eq('user_id', TEST_USER_ID);

  const invStatuses: Record<string, { count: number; total: number }> = {};
  let arCount = 0;
  let arTotal = 0;

  for (const inv of invoices!) {
    const s = inv.status || 'unknown';
    if (!invStatuses[s]) invStatuses[s] = { count: 0, total: 0 };
    invStatuses[s].count++;
    invStatuses[s].total += inv.amount;
    if (inv.parsed_data?.type === 'receivable') {
      arCount++;
      arTotal += inv.amount;
    }
  }

  console.log(`\nTotal invoices: ${invoices!.length}`);
  for (const [status, data] of Object.entries(invStatuses)) {
    console.log(`  ${status.padEnd(10)} ${String(data.count).padStart(3)} invoices  $${data.total.toFixed(2).padStart(12)}`);
  }
  console.log(`\nAccounts Receivable: ${arCount} invoices, $${arTotal.toFixed(2)} outstanding`);

  // Accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('name, type, subtype, balance_current, balance_available')
    .eq('user_id', TEST_USER_ID)
    .limit(5);

  console.log('\nAccounts (first 5):');
  for (const a of accounts!) {
    console.log(`  ${(a.name || 'unnamed').padEnd(40)} ${a.type}/${a.subtype}  $${a.balance_current?.toFixed(2) || 'N/A'}`);
  }

  // Sample merchants
  const { data: merchants } = await supabase
    .from('transactions')
    .select('merchant_name')
    .eq('user_id', TEST_USER_ID)
    .not('merchant_name', 'is', null)
    .limit(100);

  const unique = [...new Set(merchants!.map(m => m.merchant_name))].sort();
  console.log(`\nUnique merchants (${unique.length}):`);
  for (const m of unique) {
    console.log(`  ${m}`);
  }
}

verify()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
