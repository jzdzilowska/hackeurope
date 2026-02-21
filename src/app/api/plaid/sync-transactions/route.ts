import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createServiceClient } from '@/lib/supabase/server';
import { Transaction, RemovedTransaction } from 'plaid';

export async function POST(req: NextRequest) {
  try {
    const { user_id, item_id } = await req.json();

    if (!user_id || !item_id) {
      return NextResponse.json({ error: 'user_id and item_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get the plaid item with its cursor
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('access_token, cursor')
      .eq('item_id', item_id)
      .eq('user_id', user_id)
      .single();

    if (itemError || !plaidItem) {
      return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 });
    }

    // Paginate through all transaction updates using transactionsSync
    let cursor = plaidItem.cursor || undefined;
    let added: Transaction[] = [];
    let modified: Transaction[] = [];
    let removed: RemovedTransaction[] = [];
    let hasMore = true;

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: plaidItem.access_token,
        cursor,
        count: 500,
      });

      added = added.concat(response.data.added);
      modified = modified.concat(response.data.modified);
      removed = removed.concat(response.data.removed);
      hasMore = response.data.has_more;
      cursor = response.data.next_cursor;
    }

    // Map Plaid transactions to our DB schema
    const mapTransaction = (txn: Transaction) => ({
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
    });

    let addedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;

    // Upsert added transactions
    if (added.length > 0) {
      const rows = added.map(mapTransaction);
      const { error } = await supabase.from('transactions').upsert(rows, {
        onConflict: 'plaid_transaction_id',
      });
      if (error) {
        console.error('Failed to upsert added transactions:', error);
      } else {
        addedCount = rows.length;
      }
    }

    // Upsert modified transactions
    if (modified.length > 0) {
      const rows = modified.map(mapTransaction);
      const { error } = await supabase.from('transactions').upsert(rows, {
        onConflict: 'plaid_transaction_id',
      });
      if (error) {
        console.error('Failed to upsert modified transactions:', error);
      } else {
        modifiedCount = rows.length;
      }
    }

    // Delete removed transactions
    if (removed.length > 0) {
      const removedIds = removed
        .map((t) => t.transaction_id)
        .filter((id): id is string => id !== undefined);
      if (removedIds.length > 0) {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .in('plaid_transaction_id', removedIds);
        if (error) {
          console.error('Failed to delete removed transactions:', error);
        } else {
          removedCount = removedIds.length;
        }
      }
    }

    // Also resolve account_id FK for transactions that don't have it yet
    const { error: resolveError } = await supabase.rpc('resolve_transaction_accounts');
    if (resolveError) {
      // Non-fatal — the FK just won't be set yet
      console.warn('Could not resolve transaction account FKs:', resolveError.message);
    }

    // Update cursor for next sync
    const { error: cursorError } = await supabase
      .from('plaid_items')
      .update({ cursor, updated_at: new Date().toISOString() })
      .eq('item_id', item_id);

    if (cursorError) {
      console.error('Failed to update cursor:', cursorError);
    }

    return NextResponse.json({
      added: addedCount,
      modified: modifiedCount,
      removed: removedCount,
      cursor,
    });
  } catch (error: unknown) {
    console.error('Transaction sync failed:', error);
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
