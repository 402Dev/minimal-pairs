-- =============================================================================
-- Minimal Pairs Recorder — Complete Schema Reset
-- =============================================================================

-- Clean Slate: Drop existing tables and custom rules (Order matters for Foreign Keys)
drop table if exists public.recordings cascade;
drop table if exists public.prompts cascade;
drop table if exists public.speakers cascade;

-- =============================================================================
-- 1. Speakers
-- =============================================================================
create table public.speakers (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  name       text        not null,
  birth_year text        not null
);

-- Natural key uniqueness: "Sara" + "72" resolves to the same row regardless of casing/spacing
create unique index speakers_name_birth_year_key
  on public.speakers (lower(trim(name)), lower(trim(birth_year)));

alter table public.speakers enable row level security;

create policy "Public insert speakers" on public.speakers
  for insert to anon
  with check (true);

create policy "Public read speakers" on public.speakers
  for select to anon
  using (true);


-- =============================================================================
-- 2. Prompts (Updated with optional Image Path)
-- =============================================================================
create table public.prompts (
  id             uuid    primary key default gen_random_uuid(),
  language       text    not null,
  word_or_phrase text    not null,
  sequence_order integer not null,
  image_path     text    -- Optional: Stores bucket path or full URL (e.g. 'cat.png')
);

alter table public.prompts enable row level security;

create policy "Public read prompts" on public.prompts
  for select to anon
  using (true);


-- =============================================================================
-- 3. Recordings
-- =============================================================================
create table public.recordings (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  speaker_id uuid        not null    references public.speakers(id) on delete cascade,
  prompt_id  uuid        not null    references public.prompts(id) on delete cascade,
  audio_path text        not null
);

-- Enforce one take per prompt per speaker
create unique index recordings_speaker_prompt_key
  on public.recordings (speaker_id, prompt_id);

alter table public.recordings enable row level security;

create policy "Public insert recordings" on public.recordings
  for insert to anon
  with check (true);

create policy "Public read recordings" on public.recordings
  for select to anon
  using (true);


-- =============================================================================
-- 4. Storage — Buckets & RLS Policies
-- =============================================================================

-- A. Audio Uploads Bucket (User recordings)
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

-- B. Prompt Images Bucket (Visual aids for prompts)
insert into storage.buckets (id, name, public)
values ('prompt-images', 'prompt-images', true)
on conflict (id) do nothing;

-- Public read access so the webapp can display image hints to the speaker
drop policy if exists "Public read prompt-images" on storage.objects;
create policy "Public read prompt-images" on storage.objects
  for select to anon
  using (bucket_id = 'prompt-images');
