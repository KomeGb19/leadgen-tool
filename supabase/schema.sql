-- Run this whole file in the Supabase SQL editor once, on a fresh project.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto; -- for gen_random_uuid()

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dba text,
  address text,
  city text default 'Seattle',
  state text default 'WA',
  zip text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  source text not null default 'manual', -- fmcsa | google_places | manual | hauler_registry
  category text not null default 'both', -- septic | grease_trap | both
  years_in_business int,
  review_count int,
  rating numeric(2,1),
  created_at timestamptz default now(),
  unique (name, address)
);
create index companies_name_trgm on companies using gin (name gin_trgm_ops);

create table fmcsa_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade unique,
  usdot_number text,
  mc_number text,
  power_units int,
  drivers int,
  operating_status text,
  cargo_types text[],
  mcs150_date date,
  fetched_at timestamptz default now()
);

create table imagery (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade unique,
  image_url text,
  captured_date date,
  source text default 'google_static', -- google_static | skyfi | manual
  truck_count_estimate int,
  created_at timestamptz default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade unique,
  score numeric default 0,
  status text default 'new', -- new | contacted | qualified | won | lost
  updated_at timestamptz default now()
);

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  body text not null,
  author text default 'You',
  created_at timestamptz default now()
);

-- RBAC Tables
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

create table user_state_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- references auth.users(id)
  role_id uuid not null references user_roles(id),
  state_code text, -- NULL indicates access to all states (super user)
  created_at timestamptz default now(),
  unique(user_id, state_code) -- prevent duplicate permissions
);

-- Insert default roles
insert into user_roles (name, description) values
  ('super_user', 'Can access data from all states'),
  ('state_user', 'Can access data from specific states only');

-- Optional but recommended: enable RLS and open read access for the anon key,
-- restrict writes to the service role (used server-side only by API routes).
alter table companies enable row level security;
alter table fmcsa_records enable row level security;
alter table imagery enable row level security;
alter table leads enable row level security;
alter table lead_notes enable row level security;
alter table user_roles enable row level security;
alter table user_state_permissions enable row level security;

-- RLS Policies for Companies
create policy "companies_select_super_user" on companies
  for select
  using (
    EXISTS (
      SELECT 1 FROM user_state_permissions usp
      JOIN user_roles ur ON usp.role_id = ur.id
      WHERE usp.user_id = auth.uid()
        AND ur.name = 'super_user'
    )
  );

create policy "companies_select_state_user" on companies
  for select
  using (
    EXISTS (
      SELECT 1 FROM user_state_permissions usp
      JOIN user_roles ur ON usp.role_id = ur.id
      WHERE usp.user_id = auth.uid()
        AND (usp.state_code IS NULL OR companies.state = usp.state_code)
        AND ur.name = 'state_user'
    )
  );

-- RLS Policies for user_roles (read-only for authenticated users)
create policy "user_roles_select" on user_roles
  for select
  using (auth.role() = 'authenticated');

-- RLS Policies for user_state_permissions (users can only see their own permissions)
create policy "user_state_permissions_select_own" on user_state_permissions
  for select
  using (user_id = auth.uid());

-- RLS Policies for other tables (maintain existing permissive policies for now)
create policy "public read fmcsa" on fmcsa_records for select using (true);
create policy "public read imagery" on imagery for select using (true);
create policy "public read leads" on leads for select using (true);
create policy "public read notes" on lead_notes for select using (true);
-- No insert/update/delete policies for the anon key — all writes go through
-- API routes using the service role key, which bypasses RLS by design.
