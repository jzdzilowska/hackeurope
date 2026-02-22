import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
// Bypasses RLS — use only in API routes / server actions
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
