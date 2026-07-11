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
  sequence_step integer not null default 1
    check (sequence_step >= 1 and sequence_step <= 4),
  sequence_label text not null default 'Intro',
  subject text not null,
  body text not null,
  tone text not null default 'professional',
  provider_message_id text,
  sent boolean not null default false,
  sent_at timestamptz,
  scheduled_at timestamptz,
  schedule_status text not null default 'not_scheduled'
    check (schedule_status in ('not_scheduled','scheduled','sent','cancelled')),
  delivered boolean not null default false,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.emails
  add column if not exists sequence_step integer not null default 1
    check (sequence_step >= 1 and sequence_step <= 4),
  add column if not exists sequence_label text not null default 'Intro',
  add column if not exists provider_message_id text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists schedule_status text not null default 'not_scheduled'
    check (schedule_status in ('not_scheduled','scheduled','sent','cancelled')),
  add column if not exists delivered boolean not null default false,
  add column if not exists delivered_at timestamptz;

-- Cleanup old tracking columns from earlier versions. The app now tracks only sent and delivered.
alter table public.emails
  drop column if exists opened,
  drop column if exists opened_at,
  drop column if exists clicked,
  drop column if exists clicked_at,
  drop column if exists replied,
  drop column if exists replied_at,
  drop column if exists bounced,
  drop column if exists bounced_at;

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  task_type text not null default 'follow_up'
    check (task_type in ('follow_up','call','research','proposal','meeting','other')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high')),
  due_at timestamptz,
  notes text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'general',
  description text,
  subject_guidance text,
  body_guidance text not null,
  tone text not null default 'professional',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute procedure public.set_updated_at();

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_score_idx on public.leads(score desc);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_email_idx on public.leads(email);
create index if not exists emails_lead_id_idx on public.emails(lead_id);
create index if not exists emails_sequence_idx on public.emails(lead_id, sequence_step, created_at desc);
create index if not exists emails_provider_message_id_idx on public.emails(provider_message_id);
create index if not exists emails_scheduled_at_idx on public.emails(scheduled_at);
create index if not exists activity_lead_id_idx on public.activity(lead_id);
create index if not exists tasks_lead_id_idx on public.tasks(lead_id);
create index if not exists tasks_due_at_idx on public.tasks(due_at);
create index if not exists tasks_completed_idx on public.tasks(completed);
create index if not exists email_templates_category_idx on public.email_templates(category);

alter table public.leads enable row level security;
alter table public.emails enable row level security;
alter table public.activity enable row level security;
alter table public.tasks enable row level security;
alter table public.email_templates enable row level security;

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

drop policy if exists "service role full access tasks" on public.tasks;
create policy "service role full access tasks"
on public.tasks
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access email_templates" on public.email_templates;
create policy "service role full access email_templates"
on public.email_templates
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into public.email_templates (name, category, description, subject_guidance, body_guidance, tone, tags)
select 'SaaS founder outreach', 'saas', 'For founders and operators at SaaS companies.', 'Mention pipeline, manual prospecting, or CRM workflow without overpromising.', 'Open with a relevant company observation, connect the pain to outbound pipeline or CRM hygiene, then ask for a short conversation.', 'professional', array['saas','founder','outbound']
where not exists (select 1 from public.email_templates where name = 'SaaS founder outreach');

insert into public.email_templates (name, category, description, subject_guidance, body_guidance, tone, tags)
select 'Agency client outreach', 'agency', 'For marketing, design, growth, or consulting agencies.', 'Reference client acquisition or campaign operations.', 'Position LeadFlow AI as a way to organize prospects, enrich accounts, and reduce manual outreach prep for agency growth.', 'professional', array['agency','client acquisition']
where not exists (select 1 from public.email_templates where name = 'Agency client outreach');

insert into public.email_templates (name, category, description, subject_guidance, body_guidance, tone, tags)
select 'Recruiting outreach', 'recruiting', 'For recruiters, hiring teams, and talent partners.', 'Mention candidate or account research workflows.', 'Frame the message around organizing target accounts, preparing personalized outreach, and keeping follow-up work visible.', 'professional', array['recruiting','talent']
where not exists (select 1 from public.email_templates where name = 'Recruiting outreach');

insert into public.email_templates (name, category, description, subject_guidance, body_guidance, tone, tags)
select 'Partnership outreach', 'partnership', 'For business development and partnership conversations.', 'Reference collaboration, channel growth, or shared audiences.', 'Focus on a lightweight partnership conversation, mutual fit, and a specific next step rather than a hard sales pitch.', 'professional', array['partnership','business development']
where not exists (select 1 from public.email_templates where name = 'Partnership outreach');
