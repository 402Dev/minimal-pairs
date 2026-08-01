# Developer Guide — Minimal Pairs Recorder

A field-recording tool for collecting native-speaker audio of minimal-pair
words/phrases. Brutalist, single-purpose UI: visitor identifies themselves
once, then works through a fixed sequential list of prompts for a given
language, recording → reviewing → saving each one.

This doc is the "future you" reference: how it's built, where data lives,
and — most importantly — **how to add real prompt data**.

---

## 1. Tech stack

- **Next.js (App Router, TypeScript)** — pages under `src/app/`.
- **Tailwind CSS** — all styling, no component library.
- **Lucide React** — icons only (`Mic`, `Check`, `Play`, `Pause`, `Trash2`, `Loader2`).
- **Supabase** (Postgres + Storage) in production, with a **local fallback**
  (SQLite via `better-sqlite3` + disk storage in `public/uploads`) so the
  app runs with zero external setup in dev.

Whether the app talks to Supabase or the local fallback is decided by one
thing: **whether `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
are set** (see [src/lib/env.ts](src/lib/env.ts)). Every data operation in
this app has two code paths side by side — Supabase when configured, local
fallback otherwise. There is no build-time switch; it's a runtime check.

---

## 2. How the app flows (roadmap)

```
/                       →  a plain "type a language" entry screen (not required, just convenience)
/[language]             →  the actual app, e.g. /Persian, /German, /persian (case-insensitive)
```

1. **`src/app/[language]/page.tsx`** (Server Component) decodes the URL
   segment and calls `getPromptsForLanguage(language)`
   ([src/lib/prompts.ts](src/lib/prompts.ts)), which:
   - Matches the `language` column **case-insensitively** against the
     `prompts` table.
   - Returns the **canonical casing** as stored in the DB (so `/persian`,
     `/PERSIAN`, and `/Persian` all resolve to the same prompts and the
     same displayed "Persian").
   - If nothing matches, falls back to a title-cased version of whatever
     was typed (e.g. `/italian` → "Italian") so the UI never crashes, it
     just shows "no words available".

2. **`LanguageSession.tsx`** (Client Component) is the soft-auth gate. It
   reads a `speaker_id` from `localStorage` (key `mp_speaker_id`, see
   [src/lib/session.ts](src/lib/session.ts)):
   - No `speaker_id` yet → renders `<SpeakerIntakeForm>`.
   - Has one → renders `<RecorderForm>` directly.

3. **`SpeakerIntakeForm.tsx`** — the *only* identification mechanism in
   the app. No passwords, no email, no accounts. It asks for:
   - **Name**
   - **Favorite Iranian food**

   These two strings are used as a **natural composite key**
   (`findOrCreateSpeaker` in [src/lib/speakers.ts](src/lib/speakers.ts)):
   on submit, it looks up an existing `speakers` row with a matching
   name + food (trimmed, case-insensitive) before creating a new one. So
   the *same person* typing the same name+food on a different device/
   browser is recognized as the same speaker — it's not just a
   localStorage flag, it's a real dedup lookup against the DB.
   `speaker_id` is **global**, not scoped per language — a speaker who
   onboards on `/Persian` is already "known" on `/German` in the same
   browser (and via the name+food lookup, on any browser).

4. **`RecorderForm.tsx`** — the sequential recording loop. State machine:

   ```
   idle → recording → review → uploading → success → (back to idle, next prompt)
   ```

   - **idle**: shows the current prompt word (`prompts[currentPromptIndex]`)
     and a record button.
   - **recording**: mic is live, a live monochrome waveform renders
     (Web Audio `AnalyserNode`, see `useAudioRecorder`/`Waveform.tsx`).
   - **review**: recording stopped. Shows a play/pause button for the
     take, a Redo (trash) button that discards it, and a Save (check)
     button. **Nothing is uploaded until Save is tapped.**
   - **uploading**: spinner, calls `submitRecording()`.
   - **success**: brief toast, then `currentPromptIndex` increments and
     the form resets to **idle** with the next prompt.
   - Once `currentPromptIndex >= prompts.length`, shows a localized
     "All done. Thank you." screen instead of the recorder.
   - If the language has zero prompts, shows a localized
     "No words available" screen instead.

5. **Saving a recording** (`submitRecording` in
   [src/lib/submit-recording.ts](src/lib/submit-recording.ts)):
   1. Uploads the audio blob (Supabase Storage bucket `audio-uploads`, or
      local fallback → `POST /api/upload` → saved under `public/uploads/`).
   2. Inserts a row into `recordings` linking `speaker_id` + `prompt_id` +
      the returned audio path (Supabase insert, or local fallback →
      `POST /api/recordings` → SQLite).

6. **Localized UI** ([src/lib/i18n.ts](src/lib/i18n.ts)): every label,
   button, and status message is shown in the *visitor's own language*
   (matched to the URL's language, case-insensitively), not hardcoded
   English. See §6.
7. **Duplicate prevention**: once a speaker records a prompt, that prompt
   is removed from their queue on every future visit — enforced both
   client-side (prompts are pre-filtered before the recorder ever shows
   them) and at the database level (a unique index on
   `recordings(speaker_id, prompt_id)` rejects a second insert outright).

---

## 3. Data model — where everything is stored

Three tables, same shape in both Supabase and the local SQLite fallback:

| Table        | Columns                                                              | Notes |
|--------------|------------------------------------------------------------------------|-------|
| `speakers`   | `id` (uuid), `created_at`, `name`, `favorite_food`                     | Unique index on `lower(trim(name)), lower(trim(favorite_food))` |
| `prompts`    | `id` (uuid), `language`, `word_or_phrase`, `sequence_order`            | **This is the table you edit to add real words** |
| `recordings` | `id` (uuid), `speaker_id` (FK), `prompt_id` (FK), `audio_path`, `created_at` | One row per saved take. Unique index on `(speaker_id, prompt_id)` — a speaker can never record the same prompt twice |

Audio files themselves:
- **Production (Supabase configured)** → Supabase Storage bucket
  `audio-uploads`, public read.
- **Local dev (no Supabase env vars)** → `public/uploads/*.webm` (or
  `.mp4`/`.aac` depending on the recording browser's supported MIME
  type), served as static files by Next.js.

### Where the schema is defined

- **Supabase / production**: [supabase.sql](supabase.sql) — run this in
  the Supabase SQL editor. It's idempotent (safe to re-run) and includes
  `alter table` migration statements for older installs.
- **Local dev / SQLite**: [src/lib/local-db.ts](src/lib/local-db.ts) —
  creates `dev.db` in the project root on first run (via `better-sqlite3`,
  WAL mode, foreign keys on). No manual setup needed.

⚠️ **These two schemas are hand-kept in sync — there's no shared migration
tool.** If you change one, mirror the change in the other.

---

## 4. How to add real prompt data (the main thing you asked)

Prompts are just rows in the `prompts` table: `language`, `word_or_phrase`,
`sequence_order`. There are two ways to add them:

- **The hidden `/admin` panel** (see §9) — the easiest way day-to-day.
  Log in, go to the Prompts tab, type a language + word, hit "Add prompt".
  No SQL needed.
- **Direct SQL** — useful for bulk-loading a whole word list at once.
  Two places, depending on where you're testing/running:

### 4a. Local development (SQLite, no Supabase configured)

Edit the `SEED_PROMPTS` map in
[src/lib/local-db.ts](src/lib/local-db.ts):

```ts
const SEED_PROMPTS: Record<string, string[]> = {
  Persian: ["خر", "خار", "باد", "بات", "روز", "روس", "ساز", "ساس", "کارد", "کارت"],
  Farsi: ["شیر", "شور", "دار", "دور", "پر", "پل", "تیر", "تیز", "کور", "کوه"],
  German: ["Bahn", "Bann", "Miete", "Mitte", "Höhle", "Hölle", "Beet", "Bett", "Rate", "Ratte"],
  // Add a new language + word list here — the array order becomes
  // sequence_order (1, 2, 3, ...).
  Dutch: ["kat", "gat", ...],
};
```

⚠️ **Important:** this seeding function only runs **once**, the first time
`dev.db` is created (it checks `SELECT COUNT(*) FROM prompts` and no-ops if
the table isn't empty). To pick up new/edited prompts during local dev,
delete the local DB and let it reseed:

```bash
rm -f dev.db dev.db-shm dev.db-wal
npm run dev   # reseeds prompts on first request
```

Alternatively, insert directly into the running `dev.db` with the sqlite3
CLI (no restart/reseed needed):

```bash
sqlite3 dev.db "INSERT INTO prompts (id, language, word_or_phrase, sequence_order)
  VALUES (lower(hex(randomblob(16))), 'Dutch', 'kat', 1);"
```
(`better-sqlite3` uses plain TEXT ids, so any unique string works if you're
not on a build with `randomblob`/uuid support — easiest is to generate a
UUID yourself, e.g. `python3 -c "import uuid; print(uuid.uuid4())"`.)

### 4b. Production / Supabase

This is the real, permanent way to add data. Run SQL in the **Supabase SQL
editor** (Project → SQL Editor):

```sql
insert into public.prompts (language, word_or_phrase, sequence_order) values
  ('Dutch', 'kat',  1),
  ('Dutch', 'gat',  2),
  ('Dutch', 'pen',  3);
  -- ...
```

- `language` — must match what you type in the URL (case-insensitively —
  `/Dutch`, `/dutch`, `/DUTCH` all resolve the same, and the *canonical
  casing you inserted here* is what gets displayed).
- `sequence_order` — controls the order prompts are presented; the app
  sorts `ORDER BY sequence_order ASC` and walks through them one at a time.
  Must be unique per language, doesn't need to start at 1, just needs a
  consistent ascending order.
- `word_or_phrase` — displayed as a **massive bold static word** on
  screen. No formatting/markup — just plain text (Persian/Arabic-script
  right-to-left text renders fine as-is).

To add a **new language**, all you need is prompt rows for that language —
there's no separate "register a language" step. The route `/[language]`
works for any string; if there are no matching prompts it just shows a
"no words available" screen instead of erroring.

[mock-data.sql](mock-data.sql) is a ready reference for the exact
insert shape (3 sample speakers + 10 Persian + 10 German + 10 Farsi
prompts) — copy its pattern for new batches.

### 4c. Adding a language's *UI translations* too

Prompt words appear regardless of translation, but if you want a new
language's onboarding/recorder UI text (buttons, statuses, "All done"
etc.) shown natively instead of falling back to English, add an entry to
[src/lib/i18n.ts](src/lib/i18n.ts) (search for `const TRANSLATIONS`) —
copy one of the existing language blocks (`persian`, `german`, `spanish`,
`dutch`) and translate every field. The lookup key is the lowercase
language name, matched against whatever's in the `prompts.language`
column / URL segment.

If you add prompts for a language with no translation entry, the app
still works — it just falls back to **English UI copy** while correctly
displaying the language's own name in the header badge (not "English").

---

## 5. Environment / configuration

[.env.local.example](.env.local.example):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

- **Supabase vars unset (default for local dev)** → app auto-uses SQLite
  (`dev.db`) + disk storage (`public/uploads/`). Nothing else to configure.
- **Supabase vars set** (copy to `.env.local`, fill in real values from
  your Supabase project settings → API) → app talks to Supabase for
  everything: prompts, speakers, recordings, and audio storage.
- **`SUPABASE_SERVICE_ROLE_KEY`** — server-only (no `NEXT_PUBLIC_` prefix,
  never sent to the browser). Only used by `/api/admin/*` routes to bypass
  Row Level Security for admin CRUD. Find it in Supabase dashboard →
  Project Settings → API → `service_role` secret. Not needed for local
  SQLite dev.
- **`ADMIN_PASSWORD`** — the password for the hidden `/admin` panel (§9).
  If unset, `/admin` shows a "not configured" message instead of a login
  form — there's no insecure default password.

Before going live on Supabase, you must:
1. Run [supabase.sql](supabase.sql) once in the SQL editor (creates
   tables, RLS policies, and the `audio-uploads` storage bucket).
2. Optionally run [mock-data.sql](mock-data.sql) for sample data, or
   insert your real prompts as in §4.
3. Set the env vars above (in Vercel/hosting provider's environment
   settings, or `.env.local` for local testing against a real project).

CORS is wide-open (`Access-Control-Allow-Origin: *`) on the local
fallback API routes (`next.config.ts` + each route's own headers), so you
can test on a phone via `ngrok`/a LAN IP against the same dev server.

---

## 6. File map

```
src/app/
  page.tsx                     entry screen (type a language)
  [language]/page.tsx          server component: fetch prompts, render LanguageSession
  admin/page.tsx                hidden admin panel: cookie gate → login form or dashboard
  api/upload/route.ts          local fallback: save audio blob to public/uploads
  api/recordings/route.ts      local fallback: insert a recordings row (GET completed ids, POST new row)
  api/speakers/route.ts        local fallback: find-or-create a speaker (SQLite)
  api/admin/login/route.ts      admin: verify password, set session cookie
  api/admin/logout/route.ts     admin: clear session cookie
  api/admin/prompts/route.ts        admin: list all prompts / add a new one
  api/admin/prompts/[id]/route.ts   admin: edit / delete a prompt (409 if it has recordings)
  api/admin/recordings/route.ts     admin: list all recordings (joined + playable audio URL)
  api/admin/recordings/[id]/route.ts admin: delete a recording + its audio file
  api/admin/speakers/route.ts        admin: list all speakers + recording counts
  api/admin/speakers/[id]/route.ts   admin: delete a speaker (409 if it has recordings)

src/components/
  LanguageSession.tsx           soft-auth gate (intake form vs recorder); also fetches
                                 and filters out already-recorded prompts for this speaker
  SpeakerIntakeForm.tsx         name + favorite Iranian food → speaker_id
  RecorderForm.tsx              the whole recording state machine + all sub-UI
  Waveform.tsx                  canvas waveform, driven by requestAnimationFrame
  admin/AdminLoginForm.tsx       password field, posts to /api/admin/login
  admin/AdminDashboard.tsx       tab shell (Prompts / Recordings / Speakers) + logout
  admin/PromptsPanel.tsx         list + add/edit/delete prompts, grouped by language
  admin/RecordingsPanel.tsx      list all recordings with inline <audio> player + delete
  admin/SpeakersPanel.tsx        list all speakers with recording counts + delete

src/hooks/
  useAudioRecorder.ts            MediaRecorder + AudioContext/AnalyserNode wrapper

src/lib/
  env.ts                        Supabase-configured? check; exposes SUPABASE_SERVICE_ROLE_KEY
  supabase.ts                   Supabase client (anon key) + table/bucket name constants
  supabase-admin.ts             server-only Supabase client (service-role key, bypasses RLS)
  admin-auth.ts                 ADMIN_PASSWORD check + session cookie create/verify
  local-db.ts                   SQLite schema + prompt seeding (dev fallback)
  language.ts                   decode the [language] URL segment
  i18n.ts                       per-language UI copy (translations)
  session.ts                    localStorage speaker_id get/set
  speakers.ts                   findOrCreateSpeaker (Supabase or local API)
  prompts.ts                    getPromptsForLanguage (server-only; case-insensitive)
  recordings-status.ts          getCompletedPromptIds(speakerId) — dedup lookup (Supabase or local API)
  submit-recording.ts           upload blob + insert recording row
  types.ts                      shared Prompt type

supabase.sql                    canonical Postgres schema + RLS + storage policies
mock-data.sql                   sample speakers/prompts insert script
dev.db                          local SQLite file (git-ignored, auto-created)
public/uploads/                 local audio storage (git-ignored, auto-created)
```

---

## 7. Local dev workflow

```bash
npm install
npm run dev            # http://localhost:3000, or pass -p <port>
```

- First run auto-creates `dev.db` and seeds Persian/Farsi/German prompts.
- Recordings get saved to `public/uploads/*.webm` and rows in `dev.db`.
- To fully reset local test data:
  ```bash
  rm -f dev.db dev.db-shm dev.db-wal
  rm -f public/uploads/*.webm public/uploads/*.mp4
  ```
- Useful checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- To inspect local data directly: `sqlite3 dev.db "SELECT * FROM recordings;"`.

---

## 8. Known design tradeoffs (intentional, but worth knowing)

- **`speaker_id` is global, not per-language.** A speaker who onboards on
  `/Persian` is auto-recognized on `/German` too (same browser or same
  name+food pair anywhere). This matches the literal soft-auth spec but
  means one speaker's "favorite food" identity is reused across languages
  they might not natively speak.
- **The admin session is a single shared password, not per-user
  accounts.** `ADMIN_PASSWORD` grants full read/write/delete access to
  everything. Fine for a one-operator internal tool; not intended as a
  scalable multi-admin auth system. The session cookie is a deterministic
  hash of the password (no server-side session store), so there's nothing
  to revoke except by changing the password.
- **Admin recording edits are view/delete only.** You can't currently
  re-assign a recording to a different prompt or speaker from the panel —
  only add/edit/delete prompts, delete recordings, and delete speakers.
- **Stale `speaker_id` recovery.** A visitor's `speaker_id` lives in their
  browser's `localStorage` indefinitely, but the row it points to can
  disappear (an admin deletes the speaker, or a dev database gets
  reset/recreated). Both the local SQLite API (`/api/recordings`, POST) and
  the Supabase path in `submit-recording.ts` detect this — by pre-checking
  the speaker exists before insert (local) or inspecting the Postgres
  foreign-key-violation code `23503` and confirming the speaker is really
  gone (Supabase) — and throw a distinguishable `InvalidSpeakerError`
  instead of letting a raw `500`/FK error reach the user. `RecorderForm`
  catches this and calls `onInvalidSpeaker`, which `LanguageSession` wires
  up to clear the bad id from `localStorage` and fall back to the
  name/favorite-food intake form so the visitor can simply re-onboard and
  keep going.

---

## 9. Admin panel — full control center

A hidden, password-gated dashboard at **`/admin`** (not linked anywhere in
the public app, and marked `noindex`) gives full control over every table:

- **Prompts tab** — add a new prompt to any language (existing or brand
  new — just type the language name), click a word to edit it inline, or
  delete it.
- **Recordings tab** — every recording ever submitted, with the speaker's
  name/food, the prompt's word/language, an inline `<audio>` player, and a
  delete button (also removes the underlying audio file from disk/Storage).
- **Speakers tab** — every speaker with their recording count, and a
  delete button.

### Setup

1. Set `ADMIN_PASSWORD` in your environment (`.env.local` for local dev).
   Pick something long and random — this single password unlocks
   everything. Without it, `/admin` just shows a "not configured" message.
2. **If you're on Supabase**, also set `SUPABASE_SERVICE_ROLE_KEY` (from
   Supabase dashboard → Project Settings → API). The admin panel needs
   this because the public RLS policies only allow insert/select — the
   service-role key lets `/api/admin/*` routes update/delete without
   loosening those public-facing policies. Local SQLite dev doesn't need
   this (the local DB has no RLS to bypass).
3. Visit `/admin`, enter the password, and you're in.

### How it works

- [src/lib/admin-auth.ts](src/lib/admin-auth.ts) checks the password and
  issues an httpOnly session cookie (`sha256` of the password — no
  session store to manage).
- [src/app/admin/page.tsx](src/app/admin/page.tsx) is a Server Component
  that reads the cookie via `next/headers` and renders either
  `AdminLoginForm` or `AdminDashboard`.
- Every `/api/admin/*` route re-checks the same cookie on each request
  (see `isAuthorizedAdminRequest` in `admin-auth.ts`) — the dashboard
  itself has no special privilege beyond that cookie.
- Writes go through [src/lib/supabase-admin.ts](src/lib/supabase-admin.ts)
  (service-role client) when Supabase is configured, or straight to
  `dev.db` otherwise — mirroring the same dual-path pattern used
  everywhere else in the app.
- Deleting a **prompt** or **speaker** that still has recordings attached
  is blocked with a 409 error (both the Postgres foreign key and the
  SQLite one enforce this) — delete the recordings first if you really
  want to remove one.

### Duplicate-recording prevention

A speaker can never record the same prompt twice:

- **Client-side**: [src/components/LanguageSession.tsx](src/components/LanguageSession.tsx)
  fetches the speaker's already-recorded prompt ids
  ([src/lib/recordings-status.ts](src/lib/recordings-status.ts)) once
  their `speaker_id` is known, and filters them out of the prompt list
  before `RecorderForm` ever renders — so a returning visitor is dropped
  straight into their next unrecorded prompt.
- **Database-level**: a unique index on `recordings(speaker_id,
  prompt_id)` (in both `supabase.sql` and `local-db.ts`) rejects a second
  insert outright (`409` from `/api/recordings` locally; a Postgres unique
  violation on Supabase), as a safety net against races or client bugs.
