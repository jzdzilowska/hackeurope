import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface InvoiceInput {
  vendor_name: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: string;
  total_amount: number;
  line_items?: { description: string; quantity?: number; unit_price?: number; total?: number }[];
  payment_status?: string; // paid | unpaid | unknown
  source_email_id?: string;
}

function mapPaymentStatus(status?: string): string {
  if (status === 'paid') return 'paid';
  return 'pending';
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, invoices } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json({ error: 'invoices array required (non-empty)' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const rows = (invoices as InvoiceInput[]).map((inv) => ({
      user_id,
      vendor: inv.vendor_name,
      amount: inv.total_amount,
      due_date: inv.due_date || null,
      status: mapPaymentStatus(inv.payment_status),
      source: 'email',
      parsed_data: {
        invoice_number: inv.invoice_number || null,
        invoice_date: inv.invoice_date || null,
        currency: inv.currency || 'USD',
        line_items: inv.line_items || [],
        source_email_id: inv.source_email_id || null,
      },
    }));

    const { data, error } = await supabase
      .from('invoices')
      .insert(rows)
      .select('id, vendor, amount, status');

    if (error) {
      console.error('Failed to insert invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      inserted: data.length,
      invoices: data,
    });
  } catch (error: unknown) {
    console.error('Invoice ingest failed:', error);
    const message = error instanceof Error ? error.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
