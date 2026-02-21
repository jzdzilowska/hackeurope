import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function check() {
  const { data: all } = await supabase
    .from('invoices')
    .select('id, status, vendor, amount, due_date, transaction_id, source');

  if (!all || all.length === 0) {
    console.log('No invoices found!');
    return;
  }

  const paid = all.filter((i) => i.status === 'paid');
  const pending = all.filter((i) => i.status === 'pending');

  console.log('=== Invoice Counts ===');
  console.log('Total:', all.length);
  console.log('Paid:', paid.length);
  console.log('Pending:', pending.length);

  // Integrity checks
  const paidNoTxn = paid.filter((i) => i.transaction_id === null);
  const pendingWithTxn = pending.filter((i) => i.transaction_id !== null);
  const nonSeed = all.filter((i) => i.source !== 'seed');

  console.log('\n=== Integrity ===');
  console.log('Paid without transaction_id:', paidNoTxn.length, paidNoTxn.length === 0 ? '✓' : '✗');
  console.log('Pending with transaction_id:', pendingWithTxn.length, pendingWithTxn.length === 0 ? '✓' : '✗');
  console.log('Non-seed source:', nonSeed.length, nonSeed.length === 0 ? '✓' : '✗');

  // Verify FK links
  const txnIds = paid.map((i) => i.transaction_id).filter(Boolean);
  const { data: txns } = await supabase.from('transactions').select('id').in('id', txnIds);
  const validFks = txns ? txns.length : 0;
  console.log('Valid transaction FK links:', validFks + '/' + txnIds.length, validFks === txnIds.length ? '✓' : '✗');

  // Sample paid invoices
  console.log('\n=== Sample Paid Invoices ===');
  paid.slice(0, 5).forEach((i) => {
    console.log(`  ${i.vendor} | $${Number(i.amount).toFixed(2)} | due: ${i.due_date} | txn: ${i.transaction_id.slice(0, 8)}...`);
  });

  // All pending invoices
  console.log('\n=== Pending (Future) Invoices ===');
  pending.forEach((i) => {
    console.log(`  ${i.vendor} | $${Number(i.amount).toFixed(2)} | due: ${i.due_date}`);
  });

  // Vendor distribution
  const vendors = new Map<string, number>();
  for (const i of all) {
    vendors.set(i.vendor, (vendors.get(i.vendor) || 0) + 1);
  }
  const sorted = [...vendors.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\n=== Top Vendors (by invoice count) ===');
  sorted.slice(0, 10).forEach(([v, c]) => console.log(`  ${c}x ${v}`));
}

check().catch(console.error);
