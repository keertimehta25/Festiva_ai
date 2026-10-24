-- Festiva AI database schema for Supabase (Postgres).
-- Run this whole file once in: Supabase dashboard -> SQL Editor -> New query -> Run.
-- It is safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.
--
-- Security model
--   * Users sign in with Supabase Auth. The Express API verifies their JWT and then queries
--     this database with the service-role key, always filtering by the verified user id.
--   * Row Level Security is ON for every table and NO policies are created, so the public
--     anon/authenticated keys cannot read or write anything directly. This is deliberate
--     defence-in-depth: even if the anon key leaks, the data stays closed.

create extension if not exists "pgcrypto";

create table if not exists public.events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 120),
  event_type         text not null check (event_type in ('wedding','birthday','anniversary','community','college','custom')),
  event_date         date,
  date_is_approximate boolean not null default false,
  city               text not null default '',
  venue_preference   text not null default '',
  total_budget       bigint not null check (total_budget between 0 and 1000000000),
  guest_count        integer not null check (guest_count between 1 and 100000),
  duration_hours     integer not null default 4 check (duration_hours between 1 and 240),
  theme              text not null default '',
  colors             text not null default '',
  food_preference    text not null default 'mixed' check (food_preference in ('vegetarian','non_vegetarian','mixed','vegan','jain')),
  venue_setting      text not null default 'either' check (venue_setting in ('indoor','outdoor','either')),
  cultural_notes     text not null default '',
  priorities         text[] not null default '{}',
  currency           text not null default 'INR',
  allocations        jsonb not null default '{}'::jsonb,
  plan               jsonb,
  plan_generated_at  timestamptz,
  is_sample          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.vendors (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  category        text not null check (category in ('venue','caterer','photographer','decorator','makeup_artist','florist','entertainment','invitation_designer','transportation','other')),
  contact         text not null default '',
  quoted_price    bigint not null default 0 check (quoted_price between 0 and 1000000000),
  advance_amount  bigint not null default 0 check (advance_amount between 0 and 1000000000),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid','advance_paid','paid')),
  booking_status  text not null default 'shortlisted' check (booking_status in ('shortlisted','contacted','quoted','booked','rejected')),
  notes           text not null default '',
  follow_up_date  date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (advance_amount <= quoted_price)
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 140),
  description  text not null default '',
  due_date     date,
  priority     text not null default 'medium' check (priority in ('low','medium','high')),
  status       text not null default 'pending' check (status in ('pending','in_progress','completed')),
  category     text not null default 'planning',
  notes        text not null default '',
  vendor_id    uuid references public.vendors (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.expenses (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 120),
  category          text not null,
  estimated_amount  bigint not null default 0 check (estimated_amount between 0 and 1000000000),
  actual_amount     bigint not null default 0 check (actual_amount between 0 and 1000000000),
  vendor_id         uuid references public.vendors (id) on delete set null,
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists events_user_idx   on public.events   (user_id, created_at desc);
create index if not exists tasks_event_idx    on public.tasks    (event_id, user_id);
create index if not exists expenses_event_idx on public.expenses (event_id, user_id);
create index if not exists vendors_event_idx  on public.vendors  (event_id, user_id);

-- Per-event totals for dashboard cards, computed in one query.
create or replace view public.event_stats with (security_invoker = true) as
select
  e.id as event_id,
  e.user_id,
  (select count(*) from public.tasks t where t.event_id = e.id) as task_total,
  (select count(*) from public.tasks t where t.event_id = e.id and t.status = 'completed') as task_completed,
  (select coalesce(sum(x.actual_amount), 0) from public.expenses x where x.event_id = e.id) as total_actual
from public.events e;

-- Lock everything down: RLS on, no policies, no direct grants to the public roles.
alter table public.events   enable row level security;
alter table public.vendors  enable row level security;
alter table public.tasks    enable row level security;
alter table public.expenses enable row level security;

revoke all on public.events, public.vendors, public.tasks, public.expenses, public.event_stats from anon, authenticated;
grant all on public.events, public.vendors, public.tasks, public.expenses, public.event_stats to service_role;
