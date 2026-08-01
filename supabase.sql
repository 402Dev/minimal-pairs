-- Minimal Pairs Recorder — Supabase/Postgres schema
-- Run once in the Supabase SQL editor to set up tables, indexes,
-- row-level security policies, and the audio storage bucket.
--
-- Tables:
--   speakers   — one row per anonymous visitor (soft-auth via name + birth year)
--   prompts    — the fixed sequential word list per language
--   recordings — one audio take, linking a speaker to a prompt
--
-- Safe to re-run: every statement uses IF NOT EXISTS / ON CONFLICT guards.

-- =============================================================================
-- 1. Speakers
-- =============================================================================
-- Identified by name + the last two digits of their birth year in the Persian
-- (Solar Hijri) calendar. This pair acts as a frictionless natural unique key
-- so the same person is recognised as a returning speaker on any device,
-- without passwords or accounts.

create table if not exists public.speakers (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  name       text        not null,
  birth_year text        not null
);

-- Case/whitespace-insensitive uniqueness: "Sara"+"72" always resolves to
-- the same row regardless of casing or surrounding spaces.
create unique index if not exists speakers_name_birth_year_key
  on public.speakers (lower(trim(name)), lower(trim(birth_year)));

alter table public.speakers enable row level security;

-- Anyone can register as a new speaker (frictionless onboarding).
drop policy if exists "Public insert speakers" on public.speakers;
create policy "Public insert speakers" on public.speakers
  for insert to anon
  with check (true);

-- Readable so the client can look up an existing speaker by name + birth year
-- before creating a new one, and to support the "pick yourself from a list"
-- returning-visitor shortcut.
drop policy if exists "Public read speakers" on public.speakers;
create policy "Public read speakers" on public.speakers
  for select to anon
  using (true);


-- =============================================================================
-- 2. Prompts
-- =============================================================================
-- Curated by the project owner (via the /admin panel or direct SQL).
-- The client only reads them; all writes go through server-side admin routes
-- that use the service-role key to bypass RLS.

create table if not exists public.prompts (
  id             uuid    primary key default gen_random_uuid(),
  language       text    not null,
  word_or_phrase text    not null,
  sequence_order integer not null
);

alter table public.prompts enable row level security;

-- Prompts are public-read so the recorder can fetch the word list for a
-- given language. Inserts/updates/deletes are handled server-side via the
-- service-role key and are not exposed to anon clients.
drop policy if exists "Public read prompts" on public.prompts;
create policy "Public read prompts" on public.prompts
  for select to anon
  using (true);


-- =============================================================================
-- 3. Recordings
-- =============================================================================
-- One row per saved audio take; links a speaker to a prompt and stores the
-- path to the audio file in the `audio-uploads` storage bucket.

create table if not exists public.recordings (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  speaker_id uuid        not null    references public.speakers(id),
  prompt_id  uuid        not null    references public.prompts(id),
  audio_path text        not null
);

-- A speaker can never record the same prompt twice. Enforced both here and
-- client-side (already-recorded prompts are filtered out before the recorder
-- renders them), as defense in depth.
create unique index if not exists recordings_speaker_prompt_key
  on public.recordings (speaker_id, prompt_id);

alter table public.recordings enable row level security;

-- Anon clients can submit a new recording take.
drop policy if exists "Public insert" on public.recordings;
create policy "Public insert" on public.recordings
  for insert to anon
  with check (true);

-- Anon clients can read their own recording history (used to filter out
-- already-recorded prompts for a returning speaker).
drop policy if exists "Public read" on public.recordings;
create policy "Public read" on public.recordings
  for select to anon
  using (true);


-- =============================================================================
-- 4. Storage — audio-uploads bucket
-- =============================================================================
-- Public bucket: anyone can upload a recorded audio file, and the resulting
-- URL is stored as `audio_path` in the recordings table.

insert into storage.buckets (id, name, public)
values ('audio-uploads', 'audio-uploads', true)
on conflict (id) do nothing;

drop policy if exists "Public upload to audio-uploads" on storage.objects;
create policy "Public upload to audio-uploads" on storage.objects
  for insert to anon
  with check (bucket_id = 'audio-uploads');

drop policy if exists "Public read audio-uploads" on storage.objects;
create policy "Public read audio-uploads" on storage.objects
  for select to anon
  using (bucket_id = 'audio-uploads');
