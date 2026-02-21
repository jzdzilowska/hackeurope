import { NextRequest, NextResponse } from 'next/server';
import { Products } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import { createServiceClient } from '@/lib/supabase/server';

// DEV ONLY: Creates a sandbox public token, exchanges it, and syncs transactions
// in one call. Skips the Plaid Link UI entirely.
// Uses user_small_business persona for realistic SME test data.
export async function POST(req: NextRequest) {
  if (process.env.PLAID_ENV !== 'sandbox') {
    return NextResponse.json({ error: 'Sandbox only' }, { status: 403 });
  }

  try {
    const { user_id, institution_id = 'ins_109508', username = 'user_small_business' } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    // 1. Create sandbox public token (skips Link UI)
    const sandboxResponse = await plaidClient.sandboxPublicTokenCreate({
      institution_id,
      initial_products: [Products.Transactions],
      options: {
        override_username: username,
      },
    });

    const public_token = sandboxResponse.data.public_token;

    // 2. Exchange for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeResponse.data;

    // 3. Get institution info
    let institution_name = 'First Platypus Bank';
    try {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id,
        country_codes: ['US' as never],
      });
      institution_name = instResponse.data.institution.name;
    } catch {
      // Non-fatal, use default name
    }

    const supabase = createServiceClient();

    // 4. Store plaid item
    const { error: itemError } = await supabase.from('plaid_items').upsert({
      user_id,
      access_token,
      item_id,
      institution_id,
      institution_name,
    }, { onConflict: 'item_id' });

    if (itemError) {
      console.error('Failed to store plaid item:', itemError);
      return NextResponse.json({ error: 'Failed to store bank connection' }, { status: 500 });
    }

    // 5. Fetch and store accounts
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts.map((account) => ({
      user_id,
      plaid_account_id: account.account_id,
      plaid_item_id: item_id,
      name: account.name,
      official_name: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balance_available: account.balances.available,
      balance_current: account.balances.current,
      balance_limit: account.balances.limit,
      iso_currency_code: account.balances.iso_currency_code || 'USD',
    }));

    const { error: accountsError } = await supabase.from('accounts').upsert(accounts, {
      onConflict: 'plaid_account_id',
    });

    if (accountsError) {
      console.error('Failed to store accounts:', accountsError);
    }

    // 6. Sync transactions (cursor-based pagination)
    let cursor: string | undefined;
    let totalAdded = 0;
    let hasMore = true;

    while (hasMore) {
      const syncResponse = await plaidClient.transactionsSync({
        access_token,
        cursor,
        count: 500,
      });

      const { added, has_more, next_cursor } = syncResponse.data;

      if (added.length > 0) {
        const rows = added.map((txn) => ({
          user_id,
          plaid_transaction_id: txn.transaction_id,
          plaid_account_id: txn.account_id,
          amount: txn.amount,
          date: txn.date,
          authorized_date: txn.authorized_date || null,
          name: txn.name,
          merchant_name: txn.merchant_name || null,
          merchant_entity_id: txn.merchant_entity_id || null,
          original_description: txn.original_description || null,
          pending: txn.pending,
          pending_transaction_id: txn.pending_transaction_id || null,
          category_primary: txn.personal_finance_category?.primary || null,
          category_detailed: txn.personal_finance_category?.detailed || null,
          category_confidence: txn.personal_finance_category?.confidence_level || null,
          payment_channel: txn.payment_channel || null,
          iso_currency_code: txn.iso_currency_code || 'USD',
          logo_url: txn.logo_url || null,
          website: txn.website || null,
          location_city: txn.location?.city || null,
          location_region: txn.location?.region || null,
          location_country: txn.location?.country || null,
        }));

        const { error } = await supabase.from('transactions').upsert(rows, {
          onConflict: 'plaid_transaction_id',
        });

        if (error) {
          console.error('Failed to upsert transactions:', error);
        } else {
          totalAdded += rows.length;
        }
      }

      hasMore = has_more;
      cursor = next_cursor;
    }

    // 7. Resolve account FK and save cursor
    try { await supabase.rpc('resolve_transaction_accounts'); } catch { /* non-fatal */ }
    await supabase
      .from('plaid_items')
      .update({ cursor, updated_at: new Date().toISOString() })
      .eq('item_id', item_id);

    return NextResponse.json({
      item_id,
      institution_name,
      accounts: accounts.length,
      transactions: totalAdded,
    });
  } catch (error: unknown) {
    console.error('Sandbox create-and-sync failed:', error);
    const message = error instanceof Error ? error.message : 'Sandbox sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
