/*
# Character Management System

## Summary
Adds a full character management system to the One Piece platform, enabling admins
to create, edit, and delete characters organized by category.

## New Tables

### character_categories
Organizes characters into logical groups (pirates, marines, etc.).
- id: UUID PK
- name: display name
- slug: unique URL-friendly identifier
- description: optional text description
- sort_order: integer for display ordering
- created_at

### characters
Individual One Piece characters with rich metadata.
- id: UUID PK
- category_id: FK → character_categories (cascade delete)
- name: character name
- image_url: public URL for character image
- description: biographical/story description
- faction: pirate | marine | revolutionnaire | other
- role: role/title (e.g. "Capitaine", "Amiral")
- bounty: bounty amount as text (e.g. "3 000 000 000 Berrys")
- devil_fruit: devil fruit name if applicable
- status: alive | dead | unknown
- sort_order: display ordering within category
- created_at, updated_at

## Security
- Both tables: RLS enabled
- SELECT: public (anon + authenticated) — characters are encyclopedia content
- INSERT / UPDATE / DELETE: admin only (via is_admin() function)

## Storage
- Creates 'characters' bucket (public) for character images

## Seed Data
- 6 default categories seeded
*/

-- ─── character_categories ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE character_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cats_select" ON character_categories;
CREATE POLICY "cats_select" ON character_categories FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "cats_insert" ON character_categories;
CREATE POLICY "cats_insert" ON character_categories FOR INSERT
TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "cats_update" ON character_categories;
CREATE POLICY "cats_update" ON character_categories FOR UPDATE
TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "cats_delete" ON character_categories;
CREATE POLICY "cats_delete" ON character_categories FOR DELETE
TO authenticated USING (is_admin());

-- ─── characters ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES character_categories(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  image_url   TEXT,
  description TEXT,
  faction     TEXT,
  role        TEXT,
  bounty      TEXT,
  devil_fruit TEXT,
  status      TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'dead', 'unknown')),
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chars_select" ON characters;
CREATE POLICY "chars_select" ON characters FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "chars_insert" ON characters;
CREATE POLICY "chars_insert" ON characters FOR INSERT
TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "chars_update" ON characters;
CREATE POLICY "chars_update" ON characters FOR UPDATE
TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "chars_delete" ON characters;
CREATE POLICY "chars_delete" ON characters FOR DELETE
TO authenticated USING (is_admin());

-- ─── Storage: characters bucket ───────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('characters', 'characters', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chars_storage_select" ON storage.objects;
CREATE POLICY "chars_storage_select" ON storage.objects FOR SELECT
TO public USING (bucket_id = 'characters');

DROP POLICY IF EXISTS "chars_storage_insert" ON storage.objects;
CREATE POLICY "chars_storage_insert" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'characters');

DROP POLICY IF EXISTS "chars_storage_update" ON storage.objects;
CREATE POLICY "chars_storage_update" ON storage.objects FOR UPDATE
TO authenticated USING (bucket_id = 'characters');

DROP POLICY IF EXISTS "chars_storage_delete" ON storage.objects;
CREATE POLICY "chars_storage_delete" ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'characters');

-- ─── Seed default categories ──────────────────────────────────
INSERT INTO character_categories (name, slug, description, sort_order) VALUES
  ('Équipage du Chapeau de Paille', 'straw-hat', 'Les membres de l''équipage de Monkey D. Luffy', 1),
  ('Empereurs (Yonko)', 'yonko', 'Les quatre Grands Pirates régnant sur Grand Line', 2),
  ('Marine', 'marine', 'Les forces navales du Gouvernement Mondial', 3),
  ('Révolutionnaires', 'revolutionnaires', 'L''armée révolutionnaire de Dragon', 4),
  ('Supernovas', 'supernovas', 'Les pirates de la pire génération', 5),
  ('Antagonistes', 'antagonistes', 'Les principaux antagonistes de la série', 6)
ON CONFLICT (slug) DO NOTHING;
