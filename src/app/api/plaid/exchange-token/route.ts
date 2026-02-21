import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { public_token, user_id, institution } = await req.json();

    if (!public_token || !user_id) {
      return NextResponse.json({ error: 'public_token and user_id required' }, { status: 400 });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Store in Supabase
    const supabase = createServiceClient();
    const { error: dbError } = await supabase.from('plaid_items').insert({
      user_id,
      access_token,
      item_id,
      institution_id: institution?.institution_id || null,
      institution_name: institution?.name || null,
    });

    if (dbError) {
      console.error('Failed to store plaid item:', dbError);
      return NextResponse.json({ error: 'Failed to store bank connection' }, { status: 500 });
    }

    // Fetch and store accounts
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

    return NextResponse.json({
      item_id,
      accounts: accounts.length,
    });
  } catch (error: unknown) {
    console.error('Failed to exchange token:', error);
    const message = error instanceof Error ? error.message : 'Token exchange failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
