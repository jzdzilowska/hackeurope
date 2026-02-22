import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc';

// Plaid sandbox institutions
const INSTITUTIONS = [
  { id: 'ins_109508', name: 'First Platypus Bank' },
  { id: 'ins_109509', name: 'First Gingham Credit Union' },
  { id: 'ins_109510', name: 'Tattersall Federal Credit Union' },
  { id: 'ins_109511', name: 'Tartan Bank' },
];

// Target account layout — 6 accounts across 4 banks
const TARGET_ACCOUNTS = [
  {
    institution: 'First Platypus Bank',
    name: 'Business Checking',
    official: 'First Platypus Business Checking',
    type: 'depository',
    subtype: 'checking',
    balCurrent: 187432.50,
    balAvail: 185200.00,
    currency: 'EUR',
    mask: '4821',
  },
  {
    institution: 'First Platypus Bank',
    name: 'Operating Reserve',
    official: 'First Platypus Business Savings',
    type: 'depository',
    subtype: 'savings',
    balCurrent: 95000.00,
    balAvail: 95000.00,
    currency: 'EUR',
    mask: '7733',
  },
  {
    institution: 'First Gingham Credit Union',
    name: 'Payroll Account',
    official: 'First Gingham Business Checking',
    type: 'depository',
    subtype: 'checking',
    balCurrent: 48650.00,
    balAvail: 48650.00,
    currency: 'EUR',
    mask: '2109',
  },
  {
    institution: 'Tattersall Federal Credit Union',
    name: 'Tax Reserve',
    official: 'Tattersall Business Money Market',
    type: 'depository',
    subtype: 'savings',
    balCurrent: 32000.00,
    balAvail: 32000.00,
    currency: 'EUR',
    mask: '5540',
  },
  {
    institution: 'Tartan Bank',
    name: 'Business Credit Card',
    official: 'Tartan Business Rewards Card',
    type: 'credit',
    subtype: 'credit card',
    balCurrent: 12847.33,
    balAvail: null,
    balLimit: 50000,
    currency: 'EUR',
    mask: '9012',
  },
  {
    institution: 'Tartan Bank',
    name: 'Equipment Line of Credit',
    official: 'Tartan Business Line of Credit',
    type: 'credit',
    subtype: 'credit card',
    balCurrent: 8200.00,
    balAvail: null,
    balLimit: 75000,
    currency: 'EUR',
    mask: '3367',
  },
];

async function main() {
  console.log('=== Diversify Bank Accounts ===\n');

  // ── Step 1: Get existing plaid_items ──
  const { data: existingItems, error: itemErr } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at');

  if (itemErr) {
    console.error('Failed to fetch plaid_items:', itemErr.message);
    process.exit(1);
  }

  console.log(`Found ${existingItems?.length || 0} existing plaid_items:`);
  for (const item of existingItems || []) {
    console.log(`  - item_id=${item.item_id} institution=${item.institution_name} (${item.institution_id})`);
  }

  // ── Step 2: Get existing accounts ──
  const { data: existingAccounts, error: accErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at');

  if (accErr) {
    console.error('Failed to fetch accounts:', accErr.message);
    process.exit(1);
  }

  console.log(`\nFound ${existingAccounts?.length || 0} existing accounts:`);
  for (const acc of existingAccounts || []) {
    console.log(`  - ${acc.name} (${acc.type}/${acc.subtype}) item=${acc.plaid_item_id} balance=${acc.balance_current}`);
  }

  // ── Step 3: Ensure we have 4 plaid_items (one per institution) ──
  // Update existing items and create missing ones
  const itemIds = (existingItems || []).map(i => i.item_id);
  const institutionItemMap = new Map<string, string>(); // institution_name → item_id

  for (let i = 0; i < INSTITUTIONS.length; i++) {
    const inst = INSTITUTIONS[i];

    if (i < (existingItems || []).length) {
      // Update existing item
      const existing = existingItems![i];
      const { error } = await supabase
        .from('plaid_items')
        .update({
          institution_id: inst.id,
          institution_name: inst.name,
        })
        .eq('id', existing.id);

      if (error) {
        console.error(`Failed to update plaid_item ${existing.item_id}:`, error.message);
        process.exit(1);
      }
      institutionItemMap.set(inst.name, existing.item_id);
      console.log(`\n✓ Updated plaid_item ${existing.item_id} → ${inst.name} (${inst.id})`);
    } else {
      // Create new item
      const newItemId = `seed_item_${inst.id}`;
      const { error } = await supabase
        .from('plaid_items')
        .insert({
          user_id: TEST_USER_ID,
          access_token: `access-sandbox-${inst.id}`,
          item_id: newItemId,
          institution_id: inst.id,
          institution_name: inst.name,
        });

      if (error) {
        console.error(`Failed to create plaid_item for ${inst.name}:`, error.message);
        process.exit(1);
      }
      institutionItemMap.set(inst.name, newItemId);
      console.log(`\n✓ Created plaid_item ${newItemId} → ${inst.name} (${inst.id})`);
    }
  }

  // ── Step 4: Remove all transactions' account_id FK references ──
  // (so we can safely delete/reassign accounts without losing transactions)
  console.log('\nUnlinking transactions from accounts...');
  const { error: unlinkErr } = await supabase
    .from('transactions')
    .update({ account_id: null })
    .eq('user_id', TEST_USER_ID);

  if (unlinkErr) {
    console.error('Failed to unlink transactions:', unlinkErr.message);
    process.exit(1);
  }
  console.log('✓ Unlinked all transactions from accounts');

  // ── Step 5: Delete all existing accounts ──
  console.log('\nDeleting existing accounts...');
  const { error: delErr } = await supabase
    .from('accounts')
    .delete()
    .eq('user_id', TEST_USER_ID);

  if (delErr) {
    console.error('Failed to delete accounts:', delErr.message);
    process.exit(1);
  }
  console.log('✓ Deleted all existing accounts');

  // ── Step 6: Insert new diversified accounts ──
  console.log('\nInserting diversified accounts...');

  const newAccounts = TARGET_ACCOUNTS.map((acc, idx) => {
    const itemId = institutionItemMap.get(acc.institution);
    if (!itemId) {
      console.error(`No plaid_item found for institution: ${acc.institution}`);
      process.exit(1);
    }
    return {
      user_id: TEST_USER_ID,
      plaid_account_id: `seed-acct-${idx}-${Date.now()}`,
      plaid_item_id: itemId,
      name: acc.name,
      official_name: acc.official,
      type: acc.type,
      subtype: acc.subtype,
      mask: acc.mask,
      balance_current: acc.balCurrent,
      balance_available: acc.balAvail ?? null,
      balance_limit: (acc as any).balLimit ?? null,
      iso_currency_code: acc.currency,
    };
  });

  const { data: insertedAccounts, error: insErr } = await supabase
    .from('accounts')
    .insert(newAccounts)
    .select('id, name, plaid_item_id, type, balance_current');

  if (insErr) {
    console.error('Failed to insert accounts:', insErr.message);
    process.exit(1);
  }

  console.log(`✓ Inserted ${insertedAccounts!.length} accounts:`);
  for (const acc of insertedAccounts!) {
    const instName = [...institutionItemMap.entries()].find(([, v]) => v === acc.plaid_item_id)?.[0] || '?';
    console.log(`  - ${acc.name} @ ${instName} (${acc.type}) balance=${acc.balance_current}`);
  }

  // ── Step 7: Re-link transactions to new accounts ──
  // Assign transactions to the primary checking account + credit card
  const checkingAcct = insertedAccounts!.find(a => a.name === 'Business Checking');
  const creditAcct = insertedAccounts!.find(a => a.name === 'Business Credit Card');

  if (checkingAcct) {
    // Link most transactions to checking
    const { error: linkErr } = await supabase
      .from('transactions')
      .update({ account_id: checkingAcct.id })
      .eq('user_id', TEST_USER_ID)
      .is('account_id', null);

    if (linkErr) {
      console.error('Failed to re-link transactions:', linkErr.message);
    } else {
      console.log(`\n✓ Linked transactions to ${checkingAcct.name} (${checkingAcct.id})`);
    }
  }

  // Move SaaS/marketing/travel transactions to credit card
  if (creditAcct) {
    const { error: ccLinkErr } = await supabase
      .from('transactions')
      .update({ account_id: creditAcct.id })
      .eq('user_id', TEST_USER_ID)
      .in('category_primary', ['ENTERTAINMENT', 'TRAVEL']);

    if (ccLinkErr) {
      console.error('Failed to re-link credit card transactions:', ccLinkErr.message);
    } else {
      console.log(`✓ Moved travel/entertainment transactions to ${creditAcct.name}`);
    }
  }

  // ── Summary ──
  console.log('\n=== Diversification Complete ===');
  console.log('Accounts are now spread across 4 institutions:');
  for (const inst of INSTITUTIONS) {
    const accts = TARGET_ACCOUNTS.filter(a => a.institution === inst.name);
    if (accts.length > 0) {
      console.log(`  ${inst.name} (${inst.id}):`);
      for (const a of accts) {
        console.log(`    - ${a.name} (${a.type}) €${a.balCurrent.toLocaleString()}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
