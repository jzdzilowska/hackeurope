import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc';

// Categories that would realistically produce invoices for an SME
const INVOICE_CATEGORIES = [
  'RENT_AND_UTILITIES',
  'GENERAL_SERVICES',
  'LOAN_PAYMENTS',
];

// GENERAL_MERCHANDISE only if amount > $100
const MERCH_MIN_AMOUNT = 100;

// Friendly category names for parsed_data
const CATEGORY_LABELS: Record<string, string> = {
  RENT_AND_UTILITIES: 'Rent & Utilities',
  GENERAL_SERVICES: 'Professional Services',
  LOAN_PAYMENTS: 'Loan Payment',
  GENERAL_MERCHANDISE: 'Office & Equipment',
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function generateInvoiceNumber(vendor: string, date: string): string {
  const suffix = randomInt(1000, 9999);
  const prefix = vendor.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  return `INV-${prefix}-${date.replace(/-/g, '')}-${suffix}`;
}

interface Transaction {
  id: string;
  amount: number;
  date: string;
  name: string | null;
  merchant_name: string | null;
  category_primary: string | null;
  category_detailed: string | null;
  payment_channel: string | null;
}

async function seedInvoices() {
  console.log('Fetching transactions for test user...');

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, amount, date, name, merchant_name, category_primary, category_detailed, payment_channel')
    .eq('user_id', TEST_USER_ID)
    .eq('pending', false)
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to fetch transactions:', error.message);
    process.exit(1);
  }

  if (!transactions || transactions.length === 0) {
    console.error('No transactions found for test user');
    process.exit(1);
  }

  console.log(`Found ${transactions.length} settled transactions`);

  // Filter for invoice-worthy transactions
  const qualifying = (transactions as Transaction[]).filter((txn) => {
    const cat = txn.category_primary;
    if (!cat) return false;

    if (INVOICE_CATEGORIES.includes(cat)) return true;

    // General merchandise only if > $100
    if (cat === 'GENERAL_MERCHANDISE' && Math.abs(txn.amount) > MERCH_MIN_AMOUNT) {
      return true;
    }

    return false;
  });

  console.log(`${qualifying.length} transactions qualify for invoices`);

  // Build paid invoices from qualifying transactions
  const paidInvoices = qualifying.map((txn) => {
    const vendor = txn.merchant_name || txn.name || 'Unknown Vendor';
    const amount = Math.abs(txn.amount);
    const dueDateOffset = randomInt(3, 7);
    const due_date = daysAgo(txn.date, dueDateOffset);
    const invoice_date = daysAgo(due_date, randomInt(7, 14));

    return {
      user_id: TEST_USER_ID,
      vendor,
      amount,
      due_date,
      status: 'paid',
      source: 'seed',
      transaction_id: txn.id,
      parsed_data: {
        invoice_number: generateInvoiceNumber(vendor, txn.date),
        invoice_date,
        line_items: [
          {
            description: CATEGORY_LABELS[txn.category_primary!] || txn.category_detailed || 'Service',
            amount,
          },
        ],
        category: txn.category_primary,
        category_detailed: txn.category_detailed,
        payment_channel: txn.payment_channel,
        payment_date: txn.date,
      },
    };
  });

  console.log(`Generated ${paidInvoices.length} paid invoices`);

  // Find recurring vendors for future invoices
  const vendorAmounts = new Map<string, number[]>();
  for (const txn of qualifying) {
    const vendor = txn.merchant_name || txn.name;
    if (!vendor) continue;
    if (!vendorAmounts.has(vendor)) vendorAmounts.set(vendor, []);
    vendorAmounts.get(vendor)!.push(Math.abs(txn.amount));
  }

  // Pick vendors that appear 2+ times (likely recurring)
  const recurringVendors = [...vendorAmounts.entries()]
    .filter(([, amounts]) => amounts.length >= 2)
    .map(([vendor, amounts]) => ({
      vendor,
      avgAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
    }));

  // Generate 5-8 future pending invoices
  const numFuture = Math.min(randomInt(5, 8), Math.max(recurringVendors.length, 5));

  // If not enough recurring vendors, add some realistic fake ones
  const fallbackVendors = [
    { vendor: 'Amazon Web Services', avgAmount: 847.32 },
    { vendor: 'Slack Technologies', avgAmount: 125.00 },
    { vendor: 'Adobe Inc.', avgAmount: 599.88 },
    { vendor: 'WeWork', avgAmount: 2400.00 },
    { vendor: 'Gusto Payroll', avgAmount: 3200.00 },
    { vendor: 'HubSpot', avgAmount: 450.00 },
    { vendor: 'Cloudflare', avgAmount: 220.00 },
    { vendor: 'Zoom Communications', avgAmount: 149.90 },
  ];

  const futureVendorPool = recurringVendors.length >= 5
    ? recurringVendors
    : [...recurringVendors, ...fallbackVendors].slice(0, 10);

  const futureInvoices = [];
  const usedVendors = new Set<string>();

  for (let i = 0; i < numFuture; i++) {
    const vendorInfo = futureVendorPool[i % futureVendorPool.length];
    if (usedVendors.has(vendorInfo.vendor)) continue;
    usedVendors.add(vendorInfo.vendor);

    // Vary amount by ±10%
    const variance = 1 + (Math.random() * 0.2 - 0.1);
    const amount = Math.round(vendorInfo.avgAmount * variance * 100) / 100;

    const dueDays = randomInt(3, 21);
    const due_date = daysFromNow(dueDays);
    const invoice_date = daysAgo(due_date, randomInt(7, 14));

    futureInvoices.push({
      user_id: TEST_USER_ID,
      vendor: vendorInfo.vendor,
      amount,
      due_date,
      status: 'pending',
      source: 'seed',
      transaction_id: null,
      parsed_data: {
        invoice_number: generateInvoiceNumber(vendorInfo.vendor, due_date),
        invoice_date,
        line_items: [
          {
            description: 'Monthly service',
            amount,
          },
        ],
      },
    });
  }

  console.log(`Generated ${futureInvoices.length} future pending invoices`);

  // Batch insert all invoices
  const allInvoices = [...paidInvoices, ...futureInvoices];

  if (allInvoices.length === 0) {
    console.log('No invoices to insert');
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('invoices')
    .insert(allInvoices)
    .select('id, status');

  if (insertError) {
    console.error('Failed to insert invoices:', insertError.message);
    process.exit(1);
  }

  const paidCount = inserted!.filter((i) => i.status === 'paid').length;
  const pendingCount = inserted!.filter((i) => i.status === 'pending').length;

  console.log(`\nDone! Inserted ${inserted!.length} invoices:`);
  console.log(`  - ${paidCount} paid (linked to transactions)`);
  console.log(`  - ${pendingCount} pending (upcoming)`);
}

seedInvoices()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
