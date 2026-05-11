-- LeadFlow AI Supabase schema
-- Run this in the Supabase SQL editor for your project

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  title text,
  phone text,
  location text,
  source text,
  linkedin text,
  website text,
  industry text,
  company_size text,
  revenue text,
  status text not null default 'new'
    check (status in ('new','contacted','qualified','proposal','closed_won','closed_lost')),
  score integer check (score >= 0 and score <= 100),
  tags text[] not null default '{}',
  summary text,
  enriched boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute procedure public.set_updated_at();

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  subject text not null,
  body text not null,
  tone text not null default 'professional',
  sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_score_idx on public.leads(score desc);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_email_idx on public.leads(email);
create index if not exists emails_lead_id_idx on public.emails(lead_id);
create index if not exists activity_lead_id_idx on public.activity(lead_id);

alter table public.leads enable row level security;
alter table public.emails enable row level security;
alter table public.activity enable row level security;

drop policy if exists "service role full access leads" on public.leads;
create policy "service role full access leads"
on public.leads
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access emails" on public.emails;
create policy "service role full access emails"
on public.emails
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access activity" on public.activity;
create policy "service role full access activity"
on public.activity
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
