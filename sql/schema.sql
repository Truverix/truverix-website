-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste ->
-- Run. See README.md "Step 2" for exactly where this goes.

create extension if not exists pgcrypto;

create table leads (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,          -- 'demo' or 'contact'
  first_name    text,
  last_name     text,
  email         text not null,
  phone         text,
  company       text,
  company_size  text,
  interest      text,                   -- primary interest / contact subject
  message       text,
  source_page   text,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz default now()
);

create table consent_records (
  id                    uuid primary key default gen_random_uuid(),
  lead_id               uuid references leads(id),
  consent_type          text not null,  -- 'demo_form' | 'contact_form' | 'cookie_analytics' ...
  consent_given         boolean not null,
  consent_text_version  text,           -- which privacy policy wording was shown
  purpose               text,
  ip_address            text,
  user_agent            text,
  given_at              timestamptz default now(),
  withdrawn_at          timestamptz
);

-- Row Level Security, with NO policies defined below, means the anon/public
-- key can't read or write these tables at all. Only the service_role key
-- (used exclusively by the Vercel serverless functions, never the browser)
-- can access them, since it bypasses RLS entirely.
alter table leads enable row level security;
alter table consent_records enable row level security;

-- A joined view makes the admin dashboard and CSV export a single query
-- instead of two, and keeps that join logic in one place.
create view leads_with_consent as
select
  l.id, l.type, l.first_name, l.last_name, l.email, l.phone, l.company,
  l.company_size, l.interest, l.message, l.source_page, l.ip_address, l.created_at,
  c.consent_type, c.consent_given, c.consent_text_version, c.purpose,
  c.given_at, c.withdrawn_at
from leads l
left join consent_records c on c.lead_id = l.id
order by l.created_at desc;
