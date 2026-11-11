-- Run in the Supabase SQL Editor to enable the public appointment request form.
-- This table stores contact details only; do not use it for medical records.

create table if not exists public.patient_intakes (
  id uuid primary key default gen_random_uuid(),
  full_name text not null
    check (char_length(trim(full_name)) between 2 and 120),
  email text not null
    check (char_length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null
    check (char_length(trim(phone)) between 7 and 30),
  preferred_date date,
  consent_to_contact boolean not null default false
    check (consent_to_contact = true),
  created_at timestamptz not null default now()
);

alter table public.patient_intakes enable row level security;

drop policy if exists "Anyone can submit a patient intake" on public.patient_intakes;
create policy "Anyone can submit a patient intake"
  on public.patient_intakes
  for insert
  to anon, authenticated
  with check (consent_to_contact = true);

-- Submissions are write-only from the public browser client.
revoke all on public.patient_intakes from public, anon, authenticated;
grant insert on public.patient_intakes to anon, authenticated;
