-- SME Financial Dashboard — Supabase Schema
-- Run this in Supabase SQL Editor to set up all tables

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  company_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- PLAID ITEMS (bank connections)
-- ============================================
create table plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  access_token text not null,
  item_id text unique not null,
  institution_id text,
  institution_name text,
  cursor text,  -- transactionsSync pagination cursor
  error jsonb,  -- Plaid error state if item is broken
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_plaid_items_user on plaid_items(user_id);

-- ============================================
-- ACCOUNTS (from Plaid)
-- ============================================
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  plaid_account_id text unique not null,
  plaid_item_id text references plaid_items(item_id) on delete cascade not null,
  name text not null,
  official_name text,
  type text not null,         -- depository, credit, loan, investment, other
  subtype text,               -- checking, savings, credit card, mortgage, etc.
  mask text,                  -- last 2-4 digits
  balance_available numeric(12,2),
  balance_current numeric(12,2),
  balance_limit numeric(12,2),
  iso_currency_code text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_accounts_user on accounts(user_id);
create index idx_accounts_plaid_item on accounts(plaid_item_id);

-- ============================================
-- TRANSACTIONS (from Plaid transactionsSync)
-- ============================================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references accounts(id) on delete cascade,
  plaid_transaction_id text unique not null,
  plaid_account_id text not null,

  -- Core fields
  amount numeric(12,2) not null,   -- Plaid convention: positive = money out, negative = money in
  date date not null,
  authorized_date date,
  name text,
  merchant_name text,
  merchant_entity_id text,
  original_description text,

  -- Status
  pending boolean default false,
  pending_transaction_id text,

  -- Categorization
  category_primary text,           -- personal_finance_category.primary (e.g. FOOD_AND_DRINK)
  category_detailed text,          -- personal_finance_category.detailed (e.g. FOOD_AND_DRINK_GROCERIES)
  category_confidence text,        -- VERY_HIGH, HIGH, MEDIUM, LOW, UNKNOWN
  ai_category text,                -- AI-refined category from WS3

  -- Payment info
  payment_channel text,            -- online, in store, other
  iso_currency_code text default 'USD',

  -- Enrichment
  logo_url text,
  website text,

  -- Location (nullable, in-store transactions)
  location_city text,
  location_region text,
  location_country text,

  created_at timestamptz default now()
);

create index idx_transactions_user_date on transactions(user_id, date desc);
create index idx_transactions_category on transactions(user_id, category_primary);
create index idx_transactions_merchant on transactions(user_id, merchant_name);
create index idx_transactions_pending on transactions(user_id, pending) where pending = true;
create index idx_transactions_account on transactions(account_id);

-- ============================================
-- INVOICES (from Gemini parsing / email scan)
-- ============================================
create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  vendor text,
  amount numeric(12,2),
  due_date date,
  status text default 'pending',  -- pending, paid, overdue
  parsed_data jsonb,              -- full Gemini extraction
  source text,                    -- upload, email
  stripe_payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_invoices_user_due on invoices(user_id, due_date);
create index idx_invoices_status on invoices(user_id, status);

-- ============================================
-- AI INSIGHTS (cached analysis from Claude)
-- ============================================
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  type text not null,  -- cost_breakdown, revenue_trend, forecast, suggestion
  data jsonb not null,
  valid_until timestamptz,
  created_at timestamptz default now()
);

create index idx_insights_user_type on ai_insights(user_id, type);

-- ============================================
-- CHAT MESSAGES (consulting agent history)
-- ============================================
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  role text not null,     -- user, assistant
  content text not null,
  created_at timestamptz default now()
);

create index idx_chat_user on chat_messages(user_id, created_at);

-- ============================================
-- RLS POLICIES (disabled for hackathon speed, enable later)
-- Per PIT-02: RLS returns empty arrays, not errors.
-- Start with policies that just check user_id match.
-- ============================================

alter table profiles enable row level security;
alter table plaid_items enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table invoices enable row level security;
alter table ai_insights enable row level security;
alter table chat_messages enable row level security;

-- Simple user-owns-their-data policies
create policy "Users manage own profile" on profiles for all using (auth.uid() = id);
create policy "Users manage own plaid items" on plaid_items for all using (auth.uid() = user_id);
create policy "Users manage own accounts" on accounts for all using (auth.uid() = user_id);
create policy "Users manage own transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users manage own invoices" on invoices for all using (auth.uid() = user_id);
create policy "Users manage own insights" on ai_insights for all using (auth.uid() = user_id);
create policy "Users manage own chat" on chat_messages for all using (auth.uid() = user_id);

-- Service role bypasses RLS, so ingestion scripts using SUPABASE_SERVICE_ROLE_KEY
-- can write data for any user without issues.

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Resolve account_id FK on transactions using plaid_account_id
create or replace function resolve_transaction_accounts()
returns void as $$
begin
  update transactions t
  set account_id = a.id
  from accounts a
  where t.plaid_account_id = a.plaid_account_id
    and t.account_id is null;
end;
$$ language plpgsql security definer;
