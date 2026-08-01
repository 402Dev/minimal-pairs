-- Run this in the Supabase SQL editor (or via `supabase db`) to set up
-- the schema, storage bucket, and public RLS policies used by this app.
--
-- Schema overview:
--   speakers   — one row per anonymous returning visitor (soft auth).
--   prompts    — the fixed, sequential list of words/phrases per language.
--   recordings — one audio take, linking a speaker to a prompt.
--
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards throughout, and
-- includes migration statements for installs created before speakers/
-- prompts existed (i.e. a prior `recordings.native_language` /
-- `recordings.word_or_phrase` schema), and for installs where speakers
-- used to be identified by `native_language`/`dialect_or_region`.

-- 1. Speakers -----------------------------------------------------------
-- Identified by "name" + the last two digits of their birth year in the
-- Persian (Solar Hijri) calendar instead of a password: a memorable,
-- frictionless pair that doubles as a natural unique key so the same
-- person is recognized as a returning speaker on any device.
create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  birth_year text not null
);

-- Migration for installs created before the name/birth_year schema.
alter table public.speakers add column if not exists name text;
alter table public.speakers add column if not exists birth_year text;
alter table public.speakers drop column if exists native_language;
alter table public.speakers drop column if exists dialect_or_region;
-- Migration for installs created with the older favorite_food column.
alter table public.speakers add column if not exists favorite_food text;
update public.speakers set birth_year = favorite_food
  where birth_year is null and favorite_food is not null;
alter table public.speakers drop column if exists favorite_food;
alter table public.speakers alter column name set not null;
alter table public.speakers alter column birth_year set not null;

-- Case-insensitive uniqueness so "Sara" + "72" always resolves to the
-- same speaker regardless of casing/whitespace typed at intake.
drop index if exists speakers_name_food_key;
create unique index if not exists speakers_name_birth_year_key
  on public.speakers (lower(trim(name)), lower(trim(birth_year)));

alter table public.speakers enable row level security;

-- Anyone can register as a speaker (frictionless soft-auth onboarding).
drop policy if exists "Public insert speakers" on public.speakers;
create policy "Public insert speakers" on public.speakers
  for insert
  to anon
  with check (true);

-- Readable so the client can look up an existing speaker by name +
-- birth year before creating a new one, and so it can list name matches
-- for the "pick yourself from a list" returning-visitor shortcut.
drop policy if exists "Public read speakers" on public.speakers;
create policy "Public read speakers" on public.speakers
  for select
  to anon
  using (true);

-- 2. Prompts --------------------------------------------------------------
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  word_or_phrase text not null,
  sequence_order integer not null
);

alter table public.prompts enable row level security;

-- Prompts are curated (via mock-data.sql / an admin process), not
-- inserted by the client — only readable so the recorder can fetch
-- the sequence for a given language.
drop policy if exists "Public read prompts" on public.prompts;
create policy "Public read prompts" on public.prompts
  for select
  to anon
  using (true);

-- 3. Recordings ----------------------------------------------------------
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  speaker_id uuid not null references public.speakers(id),
  prompt_id uuid not null references public.prompts(id),
  audio_path text not null,
  created_at timestamptz not null default now()
);

-- Migration for installs created before speakers/prompts existed.
alter table public.recordings add column if not exists speaker_id uuid references public.speakers(id);
alter table public.recordings add column if not exists prompt_id uuid references public.prompts(id);
alter table public.recordings drop column if exists native_language;
alter table public.recordings drop column if exists word_or_phrase;

-- A speaker can never record the same prompt twice (defense in depth —
-- the client also filters out already-recorded prompts before showing
-- them, but this guarantees it at the database level too).
create unique index if not exists recordings_speaker_prompt_key
  on public.recordings (speaker_id, prompt_id);

alter table public.recordings enable row level security;

drop policy if exists "Public insert" on public.recordings;
create policy "Public insert" on public.recordings
  for insert
  to anon
  with check (true);

drop policy if exists "Public read" on public.recordings;
create policy "Public read" on public.recordings
  for select
  to anon
  using (true);

-- 4. Storage bucket ------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('audio-uploads', 'audio-uploads', true)
on conflict (id) do nothing;

drop policy if exists "Public upload to audio-uploads" on storage.objects;
create policy "Public upload to audio-uploads" on storage.objects
  for insert
  to anon
  with check (bucket_id = 'audio-uploads');

drop policy if exists "Public read audio-uploads" on storage.objects;
create policy "Public read audio-uploads" on storage.objects
  for select
  to anon
  using (bucket_id = 'audio-uploads');
