import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc';

// ─── Helpers ──────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function pickRandom<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function randomDateBetween(start: Date, end: Date): Date {
  const s = start.getTime();
  const e = end.getTime();
  return new Date(s + Math.random() * (e - s));
}

// ─── Business Data ────────────────────────────────────────────────────

// REVENUE — customers who buy from us (negative amounts in Plaid = money IN)
const WHOLESALE_CUSTOMERS = [
  { name: 'Pottery Barn - PO #', merchant: 'Pottery Barn', range: [8000, 35000] },
  { name: 'Crate & Barrel Order', merchant: 'Crate & Barrel', range: [5000, 25000] },
  { name: 'West Elm Wholesale', merchant: 'West Elm', range: [6000, 20000] },
  { name: 'Restoration Hardware', merchant: 'Restoration Hardware', range: [12000, 45000] },
  { name: 'Ethan Allen Order', merchant: 'Ethan Allen', range: [4000, 18000] },
  { name: 'Arhaus Furniture Co', merchant: 'Arhaus', range: [7000, 28000] },
  { name: 'Wayfair Wholesale', merchant: 'Wayfair', range: [3000, 15000] },
  { name: 'Room & Board Order', merchant: 'Room & Board', range: [5000, 22000] },
  { name: 'Studio McGee Design', merchant: 'Studio McGee', range: [2000, 12000] },
  { name: 'Amber Lewis Interiors', merchant: 'Amber Interiors', range: [3000, 10000] },
  { name: 'Kelly Wearstler Studio', merchant: 'Kelly Wearstler', range: [8000, 30000] },
  { name: 'Toll Brothers Builders', merchant: 'Toll Brothers', range: [15000, 50000] },
  { name: 'Lennar Homes Furnishing', merchant: 'Lennar Homes', range: [10000, 40000] },
  { name: 'KB Home Model Units', merchant: 'KB Home', range: [6000, 25000] },
];

// RAW MATERIALS — lumber, fabric, hardware, upholstery (expenses, positive amounts)
const MATERIAL_SUPPLIERS = [
  { name: 'Carolina Lumber Supply', merchant: 'Carolina Lumber', range: [2000, 12000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Pacific Hardwoods Inc', merchant: 'Pacific Hardwoods', range: [3000, 15000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Mahogany Import Co', merchant: 'Mahogany Import Co', range: [4000, 18000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Appalachian Wood Products', merchant: 'Appalachian Wood', range: [1500, 8000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Kravet Fabrics Wholesale', merchant: 'Kravet Fabrics', range: [1000, 6000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Sunbrella Wholesale', merchant: 'Sunbrella', range: [800, 4000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Robert Allen Textiles', merchant: 'Robert Allen', range: [1200, 5000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Valdese Weavers', merchant: 'Valdese Weavers', range: [600, 3500], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Rockler Woodworking Supply', merchant: 'Rockler', range: [200, 2000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: "McFeely's Hardware", merchant: "McFeely's", range: [150, 1500], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Blum Hardware Inc', merchant: 'Blum Inc', range: [300, 2500], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Hafele America', merchant: 'Hafele', range: [400, 3000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Foam Factory Inc', merchant: 'Foam Factory', range: [500, 3000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
  { name: 'Leggett & Platt Springs', merchant: 'Leggett & Platt', range: [800, 4000], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
];

// SHIPPING & LOGISTICS (variable cost)
const SHIPPING_VENDORS = [
  { name: 'FedEx Freight', merchant: 'FedEx', range: [500, 4000], cat: 'TRANSPORTATION', catDetail: 'TRANSPORTATION_SHIPPING' },
  { name: 'XPO Logistics', merchant: 'XPO Logistics', range: [800, 5000], cat: 'TRANSPORTATION', catDetail: 'TRANSPORTATION_SHIPPING' },
  { name: 'Old Dominion Freight Line', merchant: 'Old Dominion', range: [600, 3500], cat: 'TRANSPORTATION', catDetail: 'TRANSPORTATION_SHIPPING' },
  { name: 'Estes Express Lines', merchant: 'Estes Express', range: [400, 3000], cat: 'TRANSPORTATION', catDetail: 'TRANSPORTATION_SHIPPING' },
  { name: 'UPS Freight', merchant: 'UPS', range: [300, 2500], cat: 'TRANSPORTATION', catDetail: 'TRANSPORTATION_SHIPPING' },
  { name: 'Uline Packaging', merchant: 'Uline', range: [200, 1500], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OTHER' },
];

// RENT & UTILITIES (fixed cost, monthly recurring)
const RENT_UTILITIES = [
  { name: 'Warehouse Lease - Industrial Blvd', merchant: 'Prologis Warehouse', amount: 8500, cat: 'RENT_AND_UTILITIES', catDetail: 'RENT_AND_UTILITIES_RENT' },
  { name: 'Showroom Lease - Design District', merchant: 'CBRE Commercial', amount: 4200, cat: 'RENT_AND_UTILITIES', catDetail: 'RENT_AND_UTILITIES_RENT' },
  { name: 'Duke Energy - Warehouse', merchant: 'Duke Energy', amount: 950, cat: 'RENT_AND_UTILITIES', catDetail: 'RENT_AND_UTILITIES_ELECTRIC' },
  { name: 'Duke Energy - Showroom', merchant: 'Duke Energy', amount: 420, cat: 'RENT_AND_UTILITIES', catDetail: 'RENT_AND_UTILITIES_ELECTRIC' },
  { name: 'City Water & Sewer', merchant: 'City Water', amount: 185, cat: 'RENT_AND_UTILITIES', catDetail: 'RENT_AND_UTILITIES_WATER' },
  { name: 'Comcast Business Internet', merchant: 'Comcast', amount: 299, cat: 'RENT_AND_UTILITIES', catDetail: 'RENT_AND_UTILITIES_INTERNET_AND_CABLE' },
  { name: 'Waste Management', merchant: 'Waste Management', amount: 275, cat: 'RENT_AND_UTILITIES', catDetail: 'RENT_AND_UTILITIES_SEWAGE_AND_WASTE' },
];

// PAYROLL (fixed cost, bi-weekly — detected by vendor name in categories.ts)
const PAYROLL = [
  { name: 'Gusto Payroll - Bi-weekly', merchant: 'Gusto', amount: 24500, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Gusto Benefits & Taxes', merchant: 'Gusto', amount: 6800, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
];

// INSURANCE & LOANS (fixed cost, monthly)
const INSURANCE_LOANS = [
  { name: 'Hartford Business Insurance', merchant: 'Hartford', amount: 1850, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_INSURANCE' },
  { name: 'Nationwide Commercial Policy', merchant: 'Nationwide', amount: 920, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_INSURANCE' },
  { name: 'Wells Fargo Equipment Loan', merchant: 'Wells Fargo', amount: 3200, cat: 'LOAN_PAYMENTS', catDetail: 'LOAN_PAYMENTS_LOAN_PAYMENT' },
  { name: 'SBA Loan Payment', merchant: 'SBA', amount: 1450, cat: 'LOAN_PAYMENTS', catDetail: 'LOAN_PAYMENTS_LOAN_PAYMENT' },
];

// SAAS & TOOLS (fixed cost, monthly — detected by vendor name in categories.ts)
const SAAS_TOOLS = [
  { name: 'QuickBooks Online', merchant: 'QuickBooks', amount: 80, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Shopify Plus', merchant: 'Shopify', amount: 399, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Adobe Creative Cloud', merchant: 'Adobe', amount: 89.99, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Slack Business+', merchant: 'Slack', amount: 62.50, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Google Workspace', merchant: 'Google Workspace', amount: 144, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'HubSpot CRM', merchant: 'HubSpot', amount: 450, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'ShipStation Pro', merchant: 'ShipStation', amount: 159, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Canva Pro', merchant: 'Canva', amount: 30, cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
];

// MARKETING (variable cost)
const MARKETING = [
  { name: 'Google Ads - Furniture', merchant: 'Google Ads', range: [800, 3000], cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Meta Ads - Instagram', merchant: 'Meta Ads', range: [500, 2000], cat: 'GENERAL_SERVICES', catDetail: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
  { name: 'Trade Show Booth - High Point Market', merchant: 'High Point Market', range: [2000, 5000], cat: 'ENTERTAINMENT', catDetail: 'ENTERTAINMENT_OTHER_ENTERTAINMENT' },
];

// TRAVEL (variable cost — trade shows, client visits)
const TRAVEL = [
  { name: 'Delta Airlines', merchant: 'Delta Air Lines', range: [250, 800], cat: 'TRAVEL', catDetail: 'TRAVEL_FLIGHTS' },
  { name: 'Hilton Hotels', merchant: 'Hilton', range: [150, 400], cat: 'TRAVEL', catDetail: 'TRAVEL_LODGING' },
  { name: 'Enterprise Rent-A-Car', merchant: 'Enterprise', range: [80, 200], cat: 'TRAVEL', catDetail: 'TRAVEL_CAR_RENTAL' },
  { name: 'Uber Business', merchant: 'Uber', range: [15, 60], cat: 'TRANSPORTATION', catDetail: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES' },
];

// BANK FEES (fixed cost)
const BANK_FEES = [
  { name: 'Chase Business Checking Fee', merchant: 'Chase', amount: 25, cat: 'BANK_FEES', catDetail: 'BANK_FEES_OTHER_BANK_FEES' },
  { name: 'Wire Transfer Fee', merchant: 'Chase', amount: 30, cat: 'BANK_FEES', catDetail: 'BANK_FEES_OTHER_BANK_FEES' },
];

// OFFICE & MISC (variable cost)
const OFFICE_MISC = [
  { name: 'Staples Business Advantage', merchant: 'Staples', range: [50, 300], cat: 'GENERAL_MERCHANDISE', catDetail: 'GENERAL_MERCHANDISE_OFFICE_SUPPLIES' },
  { name: 'Home Depot Pro', merchant: 'Home Depot', range: [100, 500], cat: 'HOME_IMPROVEMENT', catDetail: 'HOME_IMPROVEMENT_HARDWARE' },
  { name: 'Client Lunch - Business Development', merchant: null, range: [40, 150], cat: 'FOOD_AND_DRINK', catDetail: 'FOOD_AND_DRINK_RESTAURANT' },
];

// ─── Account Setup ────────────────────────────────────────────────────

const BUSINESS_ACCOUNTS = [
  { name: 'Artisan Home - Business Checking', official: 'Chase Business Complete Checking', type: 'depository', subtype: 'checking', balCurrent: 187432.50, balAvail: 187432.50 },
  { name: 'Artisan Home - Operating Reserve', official: 'Chase Business Savings', type: 'depository', subtype: 'savings', balCurrent: 95000.00, balAvail: 95000.00 },
  { name: 'Artisan Home - Business Credit', official: 'Chase Ink Business Preferred', type: 'credit', subtype: 'credit card', balCurrent: 12847.33, balAvail: null, balLimit: 50000 },
];

// ─── Transaction Generation ───────────────────────────────────────────

interface TxnRow {
  user_id: string;
  account_id: string | null;
  plaid_transaction_id: string;
  plaid_account_id: string;
  amount: number;
  date: string;
  authorized_date: string | null;
  name: string;
  merchant_name: string | null;
  merchant_entity_id: string | null;
  original_description: string | null;
  pending: boolean;
  category_primary: string;
  category_detailed: string;
  category_confidence: string;
  payment_channel: string;
  iso_currency_code: string;
  created_at: string;
}

async function main() {
  console.log('=== Artisan Home Furnishings — Wholesale Data Seed ===\n');

  // ── Step 1: Fetch existing accounts ──
  console.log('Fetching existing accounts...');
  const { data: existingAccounts, error: accErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (accErr) {
    console.error('Failed to fetch accounts:', accErr.message);
    process.exit(1);
  }

  console.log(`Found ${existingAccounts?.length || 0} existing accounts`);

  // ── Step 2: Delete existing transactions + invoices ──
  console.log('\nClearing existing data...');

  const { error: delInv } = await supabase
    .from('invoices')
    .delete()
    .eq('user_id', TEST_USER_ID);
  if (delInv) console.error('  invoices delete error:', delInv.message);
  else console.log('  ✓ Deleted existing invoices');

  const { error: delTxn } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', TEST_USER_ID);
  if (delTxn) console.error('  transactions delete error:', delTxn.message);
  else console.log('  ✓ Deleted existing transactions');

  // ── Step 3: Pick/update 3 accounts to use ──
  // We'll use the first 3 accounts and update their names
  const accts = existingAccounts!.slice(0, 3);
  const checkingAcct = accts[0];
  const savingsAcct = accts.length > 1 ? accts[1] : accts[0];
  const creditAcct = accts.length > 2 ? accts[2] : accts[0];

  for (let i = 0; i < Math.min(3, accts.length); i++) {
    const ba = BUSINESS_ACCOUNTS[i];
    const { error: updErr } = await supabase
      .from('accounts')
      .update({
        name: ba.name,
        official_name: ba.official,
        type: ba.type,
        subtype: ba.subtype,
        balance_current: ba.balCurrent,
        balance_available: ba.balAvail,
        balance_limit: ba.balLimit ?? null,
      })
      .eq('id', accts[i].id);
    if (updErr) console.error(`  account update error (${i}):`, updErr.message);
    else console.log(`  ✓ Updated account: ${ba.name}`);
  }

  // ── Step 4: Generate transactions ──
  console.log('\nGenerating transactions...');

  const startDate = monthsAgo(6);
  const endDate = new Date(); // today
  const transactions: TxnRow[] = [];

  function makeTxn(
    date: Date,
    amount: number, // positive = money out, negative = money in
    name: string,
    merchant: string | null,
    catPrimary: string,
    catDetailed: string,
    channel: string = 'online',
    accountId: string = checkingAcct.id,
    plaidAccountId: string = checkingAcct.plaid_account_id,
  ): TxnRow {
    return {
      user_id: TEST_USER_ID,
      account_id: accountId,
      plaid_transaction_id: `wholesale-${uuid()}`,
      plaid_account_id: plaidAccountId,
      amount,
      date: dateStr(date),
      authorized_date: dateStr(addDays(date, -randomInt(0, 2))),
      name,
      merchant_name: merchant,
      merchant_entity_id: null,
      original_description: name,
      pending: false,
      category_primary: catPrimary,
      category_detailed: catDetailed,
      category_confidence: 'VERY_HIGH',
      payment_channel: channel,
      iso_currency_code: 'USD',
      created_at: new Date(date.getTime() + randomInt(0, 86400000)).toISOString(),
    };
  }

  // --- Revenue transactions (INCOME, negative = money in) ---
  // ~3-5 wholesale orders per week = roughly 100 over 6 months
  let revCount = 0;
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    // 3-5 orders per week, so ~0.5-0.7 per day
    if (Math.random() < 0.55) {
      const cust = pickRandom(WHOLESALE_CUSTOMERS);
      const amount = -randomFloat(cust.range[0], cust.range[1]); // negative = money in
      const suffix = randomInt(1000, 9999);
      transactions.push(makeTxn(
        d, amount,
        `${cust.name}${cust.name.includes('#') ? suffix : ''}`,
        cust.merchant,
        'INCOME', 'INCOME_DIVIDENDS_AND_INTEREST', // closest Plaid category
        'online',
      ));
      revCount++;
    }
  }
  console.log(`  Revenue: ${revCount} transactions`);

  // --- Raw material purchases (GENERAL_MERCHANDISE, variable cost) ---
  // ~4-5 per week
  let matCount = 0;
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    if (Math.random() < 0.65) {
      const sup = pickRandom(MATERIAL_SUPPLIERS);
      const amount = randomFloat(sup.range[0], sup.range[1]);
      transactions.push(makeTxn(
        d, amount, sup.name, sup.merchant,
        sup.cat, sup.catDetail, 'online',
      ));
      matCount++;
    }
  }
  console.log(`  Raw Materials: ${matCount} transactions`);

  // --- Shipping & logistics (TRANSPORTATION, variable cost) ---
  // ~2-3 per week
  let shipCount = 0;
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    if (Math.random() < 0.35) {
      const v = pickRandom(SHIPPING_VENDORS);
      const amount = randomFloat(v.range[0], v.range[1]);
      transactions.push(makeTxn(
        d, amount, v.name, v.merchant, v.cat, v.catDetail, 'online',
      ));
      shipCount++;
    }
  }
  console.log(`  Shipping: ${shipCount} transactions`);

  // --- Rent & Utilities (RENT_AND_UTILITIES, fixed cost, monthly) ---
  let rentCount = 0;
  for (let m = 0; m < 6; m++) {
    const monthDate = addDays(monthsAgo(6 - m), randomInt(1, 5)); // early in month
    for (const ru of RENT_UTILITIES) {
      const variance = 1 + (Math.random() * 0.06 - 0.03); // ±3% for utilities
      const amount = ru.name.includes('Lease') ? ru.amount : parseFloat((ru.amount * variance).toFixed(2));
      transactions.push(makeTxn(
        monthDate, amount, ru.name, ru.merchant, ru.cat, ru.catDetail, 'online',
      ));
      rentCount++;
    }
  }
  console.log(`  Rent & Utilities: ${rentCount} transactions`);

  // --- Payroll (bi-weekly, fixed cost) ---
  let payCount = 0;
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 14)) {
    for (const p of PAYROLL) {
      const variance = 1 + (Math.random() * 0.04 - 0.02); // ±2%
      const amount = parseFloat((p.amount * variance).toFixed(2));
      transactions.push(makeTxn(
        d, amount, p.name, p.merchant, p.cat, p.catDetail, 'online',
      ));
      payCount++;
    }
  }
  console.log(`  Payroll: ${payCount} transactions`);

  // --- Insurance & Loans (monthly, fixed cost) ---
  let insCount = 0;
  for (let m = 0; m < 6; m++) {
    const monthDate = addDays(monthsAgo(6 - m), randomInt(10, 15));
    for (const il of INSURANCE_LOANS) {
      transactions.push(makeTxn(
        monthDate, il.amount, il.name, il.merchant, il.cat, il.catDetail, 'online',
      ));
      insCount++;
    }
  }
  console.log(`  Insurance & Loans: ${insCount} transactions`);

  // --- SaaS subscriptions (monthly, fixed cost) ---
  let saasCount = 0;
  for (let m = 0; m < 6; m++) {
    const monthBase = monthsAgo(6 - m);
    for (const s of SAAS_TOOLS) {
      const day = addDays(monthBase, randomInt(1, 28));
      transactions.push(makeTxn(
        day, s.amount, s.name, s.merchant, s.cat, s.catDetail,
        'online', creditAcct.id, creditAcct.plaid_account_id,
      ));
      saasCount++;
    }
  }
  console.log(`  SaaS & Tools: ${saasCount} transactions`);

  // --- Marketing (variable, ~2 per month) ---
  let mktCount = 0;
  for (let m = 0; m < 6; m++) {
    const n = randomInt(2, 3);
    for (let i = 0; i < n; i++) {
      const day = randomDateBetween(monthsAgo(6 - m), monthsAgo(5 - m));
      const v = pickRandom(MARKETING);
      const amount = randomFloat(v.range[0], v.range[1]);
      transactions.push(makeTxn(
        day, amount, v.name, v.merchant, v.cat, v.catDetail,
        'online', creditAcct.id, creditAcct.plaid_account_id,
      ));
      mktCount++;
    }
  }
  console.log(`  Marketing: ${mktCount} transactions`);

  // --- Travel (variable, ~1-2 per month) ---
  let travelCount = 0;
  for (let m = 0; m < 6; m++) {
    const n = randomInt(1, 3);
    for (let i = 0; i < n; i++) {
      const day = randomDateBetween(monthsAgo(6 - m), monthsAgo(5 - m));
      const v = pickRandom(TRAVEL);
      const amount = randomFloat(v.range[0], v.range[1]);
      transactions.push(makeTxn(
        day, amount, v.name, v.merchant, v.cat, v.catDetail,
        v.catDetail.includes('RIDE') ? 'in store' : 'online',
        creditAcct.id, creditAcct.plaid_account_id,
      ));
      travelCount++;
    }
  }
  console.log(`  Travel: ${travelCount} transactions`);

  // --- Bank fees (monthly, fixed) ---
  let feeCount = 0;
  for (let m = 0; m < 6; m++) {
    const monthDate = addDays(monthsAgo(6 - m), 28);
    for (const bf of BANK_FEES) {
      transactions.push(makeTxn(
        monthDate, bf.amount, bf.name, bf.merchant, bf.cat, bf.catDetail, 'other',
      ));
      feeCount++;
    }
  }
  console.log(`  Bank Fees: ${feeCount} transactions`);

  // --- Office & Misc (variable, ~3-4 per month) ---
  let miscCount = 0;
  for (let m = 0; m < 6; m++) {
    const n = randomInt(3, 5);
    for (let i = 0; i < n; i++) {
      const day = randomDateBetween(monthsAgo(6 - m), monthsAgo(5 - m));
      const v = pickRandom(OFFICE_MISC);
      const amount = randomFloat(v.range[0], v.range[1]);
      transactions.push(makeTxn(
        day, amount, v.name, v.merchant, v.cat, v.catDetail,
        'in store', creditAcct.id, creditAcct.plaid_account_id,
      ));
      miscCount++;
    }
  }
  console.log(`  Office & Misc: ${miscCount} transactions`);

  // --- Savings transfers (monthly, move to reserves) ---
  let xferCount = 0;
  for (let m = 0; m < 6; m++) {
    const day = addDays(monthsAgo(6 - m), 15);
    transactions.push(makeTxn(
      day, 5000, 'Transfer to Operating Reserve', null,
      'TRANSFER_OUT', 'TRANSFER_OUT_SAVINGS',
      'other',
    ));
    xferCount++;
  }
  console.log(`  Savings Transfers: ${xferCount} transactions`);

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\nTotal transactions: ${transactions.length}`);

  // ── Step 5: Insert transactions in batches ──
  console.log('\nInserting transactions...');
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < transactions.length; i += BATCH) {
    const batch = transactions.slice(i, i + BATCH);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) {
      console.error(`  Batch ${i / BATCH + 1} error:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${transactions.length}\r`);
  }
  console.log(`  ✓ Inserted ${inserted} transactions`);

  // ── Step 6: Generate invoices ──
  // Every invoice has parsed_data.type = 'payable' | 'receivable'
  //   payable  = bills WE owe to suppliers (outgoing money)
  //   receivable = invoices WE sent to customers (incoming money)
  console.log('\nGenerating invoices...');

  // Fetch inserted transactions to get IDs for linking
  const { data: insertedTxns, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, amount, date, name, merchant_name, category_primary, category_detailed')
    .eq('user_id', TEST_USER_ID)
    .order('date', { ascending: false });

  if (fetchErr) {
    console.error('Failed to fetch transactions:', fetchErr.message);
    process.exit(1);
  }

  const invoices: any[] = [];

  // ────────────────────────────────────────────────
  // PAYABLE invoices (we owe suppliers)
  // ────────────────────────────────────────────────

  // --- Paid payables: linked to material supplier transactions ---
  const materialTxns = insertedTxns!.filter(t =>
    t.category_primary === 'GENERAL_MERCHANDISE' && t.amount > 500
  );
  const paidMaterialTxns = materialTxns.slice(0, 30);
  for (const txn of paidMaterialTxns) {
    const vendor = txn.merchant_name || txn.name || 'Unknown';
    const amount = Math.abs(txn.amount);
    const due_date = dateStr(addDays(new Date(txn.date), -randomInt(3, 7)));
    const invoice_date = dateStr(addDays(new Date(due_date), -randomInt(14, 30)));

    invoices.push({
      user_id: TEST_USER_ID,
      vendor,
      amount,
      due_date,
      status: 'paid',
      source: 'seed',
      transaction_id: txn.id,
      parsed_data: {
        type: 'payable',
        invoice_number: `INV-${vendor.slice(0, 3).toUpperCase()}-${randomInt(10000, 99999)}`,
        invoice_date,
        line_items: [{ description: `${txn.category_detailed?.replace(/_/g, ' ') || 'Materials'}`, amount }],
        payment_date: txn.date,
      },
    });
  }
  console.log(`  Paid payables (materials): ${paidMaterialTxns.length}`);

  // --- Paid payables: linked to service/rent/loan transactions ---
  const serviceTxns = insertedTxns!.filter(t =>
    ['GENERAL_SERVICES', 'LOAN_PAYMENTS', 'RENT_AND_UTILITIES'].includes(t.category_primary) && t.amount > 500
  );
  const paidServiceTxns = serviceTxns.slice(0, 10);
  for (const txn of paidServiceTxns) {
    const vendor = txn.merchant_name || txn.name || 'Unknown';
    const amount = Math.abs(txn.amount);
    const due_date = dateStr(addDays(new Date(txn.date), -randomInt(3, 7)));
    const invoice_date = dateStr(addDays(new Date(due_date), -randomInt(7, 14)));

    invoices.push({
      user_id: TEST_USER_ID,
      vendor,
      amount,
      due_date,
      status: 'paid',
      source: 'seed',
      transaction_id: txn.id,
      parsed_data: {
        type: 'payable',
        invoice_number: `INV-${vendor.slice(0, 3).toUpperCase()}-${randomInt(10000, 99999)}`,
        invoice_date,
        line_items: [{ description: 'Monthly Service / Rent', amount }],
        payment_date: txn.date,
      },
    });
  }
  console.log(`  Paid payables (services): ${paidServiceTxns.length}`);

  // --- Pending payables (upcoming supplier bills) ---
  const pendingPayables = [
    { vendor: 'Carolina Lumber Supply', amount: 8450.00, dueDays: 5, desc: 'White oak planks — PO #4821' },
    { vendor: 'Pacific Hardwoods Inc', amount: 11200.00, dueDays: 10, desc: 'Walnut & cherry lumber shipment' },
    { vendor: 'Kravet Fabrics Wholesale', amount: 3800.00, dueDays: 3, desc: 'Performance fabric — 200 yards' },
    { vendor: 'FedEx Freight', amount: 2100.00, dueDays: 7, desc: 'LTL shipment to West Elm distribution' },
    { vendor: 'Prologis Warehouse', amount: 8500.00, dueDays: 12, desc: 'March warehouse lease' },
    { vendor: 'CBRE Commercial', amount: 4200.00, dueDays: 12, desc: 'March showroom lease' },
    { vendor: 'Duke Energy', amount: 1370.00, dueDays: 15, desc: 'Warehouse + showroom electricity' },
    { vendor: 'Hartford Business Insurance', amount: 1850.00, dueDays: 20, desc: 'Quarterly commercial policy' },
    { vendor: 'Uline Packaging', amount: 890.00, dueDays: 8, desc: 'Furniture blankets & corner protectors' },
    { vendor: 'Hafele America', amount: 1650.00, dueDays: 14, desc: 'Drawer slides & hinges — bulk' },
  ];

  for (const p of pendingPayables) {
    const due_date = dateStr(addDays(new Date(), p.dueDays));
    const invoice_date = dateStr(addDays(new Date(), p.dueDays - randomInt(14, 30)));
    invoices.push({
      user_id: TEST_USER_ID,
      vendor: p.vendor,
      amount: p.amount,
      due_date,
      status: 'pending',
      source: 'seed',
      transaction_id: null,
      parsed_data: {
        type: 'payable',
        invoice_number: `INV-${p.vendor.slice(0, 3).toUpperCase()}-${randomInt(10000, 99999)}`,
        invoice_date,
        line_items: [{ description: p.desc, amount: p.amount }],
      },
    });
  }
  console.log(`  Pending payables: ${pendingPayables.length}`);

  // --- Overdue payables ---
  const overduePayables = [
    { vendor: 'XPO Logistics', amount: 3200.00, overdueDays: 8, desc: 'Freight — Restoration Hardware delivery' },
    { vendor: 'Sunbrella Wholesale', amount: 2750.00, overdueDays: 15, desc: 'Outdoor fabric order #OF-2290' },
    { vendor: 'Mahogany Import Co', amount: 6100.00, overdueDays: 5, desc: 'Imported mahogany — container 40ft' },
    { vendor: 'Leggett & Platt Springs', amount: 1900.00, overdueDays: 12, desc: 'Innerspring units — 150ct' },
    { vendor: 'Robert Allen Textiles', amount: 3400.00, overdueDays: 3, desc: 'Linen upholstery yardage' },
  ];

  for (const o of overduePayables) {
    const due_date = dateStr(addDays(new Date(), -o.overdueDays));
    const invoice_date = dateStr(addDays(new Date(due_date), -randomInt(14, 30)));
    invoices.push({
      user_id: TEST_USER_ID,
      vendor: o.vendor,
      amount: o.amount,
      due_date,
      status: 'overdue',
      source: 'seed',
      transaction_id: null,
      parsed_data: {
        type: 'payable',
        invoice_number: `INV-${o.vendor.slice(0, 3).toUpperCase()}-${randomInt(10000, 99999)}`,
        invoice_date,
        line_items: [{ description: o.desc, amount: o.amount }],
      },
    });
  }
  console.log(`  Overdue payables: ${overduePayables.length}`);

  // ────────────────────────────────────────────────
  // RECEIVABLE invoices (customers owe US)
  // ────────────────────────────────────────────────

  // --- Paid receivables: linked to revenue transactions that already came in ---
  const revenueTxns = insertedTxns!.filter(t =>
    t.category_primary === 'INCOME' && t.amount < -2000
  );
  const paidRevenueTxns = revenueTxns.slice(0, 20);
  for (const txn of paidRevenueTxns) {
    const customer = txn.merchant_name || txn.name || 'Unknown Customer';
    const amount = Math.abs(txn.amount);
    const invoice_date = dateStr(addDays(new Date(txn.date), -randomInt(20, 40)));
    const due_date = dateStr(addDays(new Date(invoice_date), 30)); // Net 30

    invoices.push({
      user_id: TEST_USER_ID,
      vendor: customer,
      amount,
      due_date,
      status: 'paid',
      source: 'seed',
      transaction_id: txn.id,
      parsed_data: {
        type: 'receivable',
        invoice_number: `AR-${customer.slice(0, 3).toUpperCase()}-${randomInt(10000, 99999)}`,
        invoice_date,
        customer,
        line_items: [{ description: `Wholesale furniture order — ${pickRandom([
          'dining collection', 'bedroom set', 'living room package',
          'accent pieces', 'custom upholstery', 'office furniture',
          'outdoor collection', 'modular sofa set',
        ])}`, amount }],
        payment_date: txn.date,
        terms: 'Net 30',
      },
    });
  }
  console.log(`  Paid receivables (collected): ${paidRevenueTxns.length}`);

  // --- Pending receivables: customers who owe us (outstanding AR) ---
  const pendingReceivables = [
    { customer: 'Pottery Barn', amount: 28500.00, dueDays: 18, desc: 'Custom dining set — 24 units' },
    { customer: 'Crate & Barrel', amount: 15200.00, dueDays: 8, desc: 'Upholstered sofa collection — 12 units' },
    { customer: 'Restoration Hardware', amount: 42000.00, dueDays: 25, desc: 'Hardwood bedroom set — 30 units' },
    { customer: 'West Elm', amount: 11800.00, dueDays: 5, desc: 'Mid-century coffee tables — 40 units' },
    { customer: 'Studio McGee', amount: 8900.00, dueDays: 12, desc: 'Custom accent chairs — 15 units' },
    { customer: 'Toll Brothers', amount: 67000.00, dueDays: 30, desc: 'Model home furnishing package — 4 homes' },
    { customer: 'Arhaus', amount: 19500.00, dueDays: 15, desc: 'Rustic farmhouse collection — 20 units' },
    { customer: 'KB Home', amount: 31000.00, dueDays: 22, desc: 'Builder-grade furniture package — 6 units' },
    { customer: 'Lennar Homes', amount: 52000.00, dueDays: 35, desc: 'New development furnishing contract' },
    { customer: 'Kelly Wearstler', amount: 24000.00, dueDays: 10, desc: 'Luxury custom pieces — 8 units' },
  ];

  for (const r of pendingReceivables) {
    const invoice_date = dateStr(addDays(new Date(), r.dueDays - 30)); // issued 30 days before due
    const due_date = dateStr(addDays(new Date(), r.dueDays));
    invoices.push({
      user_id: TEST_USER_ID,
      vendor: r.customer,
      amount: r.amount,
      due_date,
      status: 'pending',
      source: 'seed',
      transaction_id: null,
      parsed_data: {
        type: 'receivable',
        invoice_number: `AR-${r.customer.slice(0, 3).toUpperCase()}-${randomInt(10000, 99999)}`,
        invoice_date,
        customer: r.customer,
        line_items: [{ description: r.desc, amount: r.amount }],
        terms: 'Net 30',
      },
    });
  }
  console.log(`  Pending receivables (outstanding AR): ${pendingReceivables.length}`);

  // --- Overdue receivables: customers late on payment ---
  const overdueReceivables = [
    { customer: 'Amber Interiors', amount: 9200.00, overdueDays: 10, desc: 'Living room staging package — 6 units' },
    { customer: 'Room & Board', amount: 18500.00, overdueDays: 7, desc: 'Hardwood dining tables — 15 units' },
    { customer: 'Wayfair', amount: 7400.00, overdueDays: 20, desc: 'Budget bedroom collection — 25 units' },
  ];

  for (const r of overdueReceivables) {
    const due_date = dateStr(addDays(new Date(), -r.overdueDays));
    const invoice_date = dateStr(addDays(new Date(due_date), -30));
    invoices.push({
      user_id: TEST_USER_ID,
      vendor: r.customer,
      amount: r.amount,
      due_date,
      status: 'overdue',
      source: 'seed',
      transaction_id: null,
      parsed_data: {
        type: 'receivable',
        invoice_number: `AR-${r.customer.slice(0, 3).toUpperCase()}-${randomInt(10000, 99999)}`,
        invoice_date,
        customer: r.customer,
        line_items: [{ description: r.desc, amount: r.amount }],
        terms: 'Net 30',
      },
    });
  }
  console.log(`  Overdue receivables (late AR): ${overdueReceivables.length}`);

  console.log(`\nTotal invoices: ${invoices.length}`);

  // ── Step 7: Insert invoices ──
  console.log('\nInserting invoices...');
  const { data: insResult, error: insErr } = await supabase
    .from('invoices')
    .insert(invoices)
    .select('id, status, parsed_data');

  if (insErr) {
    console.error('Invoice insert error:', insErr.message);
    process.exit(1);
  }

  const payableInvs = insResult!.filter(i => i.parsed_data?.type === 'payable');
  const receivableInvs = insResult!.filter(i => i.parsed_data?.type === 'receivable');

  console.log(`  ✓ Inserted ${insResult!.length} invoices:`);
  console.log(`    PAYABLE (we owe suppliers): ${payableInvs.length}`);
  console.log(`      - paid: ${payableInvs.filter(i => i.status === 'paid').length}`);
  console.log(`      - pending: ${payableInvs.filter(i => i.status === 'pending').length}`);
  console.log(`      - overdue: ${payableInvs.filter(i => i.status === 'overdue').length}`);
  console.log(`    RECEIVABLE (customers owe us): ${receivableInvs.length}`);
  console.log(`      - paid: ${receivableInvs.filter(i => i.status === 'paid').length}`);
  console.log(`      - pending: ${receivableInvs.filter(i => i.status === 'pending').length}`);
  console.log(`      - overdue: ${receivableInvs.filter(i => i.status === 'overdue').length}`);

  // ── Summary ──
  console.log('\n=== Seed Complete ===');
  console.log(`Transactions: ${inserted}`);
  console.log(`Invoices: ${insResult!.length} (${payableInvs.length} payable, ${receivableInvs.length} receivable)`);
  console.log(`\nBusiness: Artisan Home Furnishings (furniture wholesaler)`);
  console.log(`Period: ${dateStr(startDate)} to ${dateStr(endDate)}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
