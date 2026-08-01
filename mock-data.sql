-- Mock data for the relational schema (speakers, prompts, recordings).
-- Run this in the Supabase SQL editor after supabase.sql to populate the
-- app with sample data for UI / fetching tests.

-- Speakers ---------------------------------------------------------------
-- Identified by name + favorite Iranian food instead of a password.
insert into public.speakers (name, favorite_food) values
  ('Lukas', 'Fesenjan'),
  ('Sara',  'Tahchin'),
  ('Mina',  'Ghormeh Sabzi');

-- Prompts ------------------------------------------------------------------
-- Persian minimal pairs, sequence 1-10.
insert into public.prompts (language, word_or_phrase, sequence_order) values
  ('Persian', 'خر',   1),
  ('Persian', 'خار',  2),
  ('Persian', 'باد',  3),
  ('Persian', 'بات',  4),
  ('Persian', 'روز',  5),
  ('Persian', 'روس',  6),
  ('Persian', 'ساز',  7),
  ('Persian', 'ساس',  8),
  ('Persian', 'کارد', 9),
  ('Persian', 'کارت', 10);

-- German minimal pairs, sequence 1-10.
insert into public.prompts (language, word_or_phrase, sequence_order) values
  ('German', 'Bahn',   1),
  ('German', 'Bann',   2),
  ('German', 'Miete',  3),
  ('German', 'Mitte',  4),
  ('German', 'Höhle',  5),
  ('German', 'Hölle',  6),
  ('German', 'Beet',   7),
  ('German', 'Bett',   8),
  ('German', 'Rate',   9),
  ('German', 'Ratte',  10);

-- Farsi minimal pairs, sequence 1-10 (separate language key from "Persian"
-- since routing matches the URL segment literally, e.g. /Farsi vs /Persian).
insert into public.prompts (language, word_or_phrase, sequence_order) values
  ('Farsi', 'شیر', 1),
  ('Farsi', 'شور', 2),
  ('Farsi', 'دار', 3),
  ('Farsi', 'دور', 4),
  ('Farsi', 'پر',  5),
  ('Farsi', 'پل',  6),
  ('Farsi', 'تیر', 7),
  ('Farsi', 'تیز', 8),
  ('Farsi', 'کور', 9),
  ('Farsi', 'کوه', 10);
