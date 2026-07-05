/*
# 2-level character hierarchy + slugs

## Summary
Restructures the character system into a proper 2-level hierarchy:
  - character_categories: 3 top-level groups (Pirates, Gouvernement, Révolutionnaires)
  - character_subcategories: 18 subcategories matching the navbar, each linked to a top-level category
  - characters: gains a subcategory_id FK and a slug field for URL routing

## Changes

### character_categories (modified)
- ADD COLUMN icon TEXT, ADD COLUMN color TEXT
- DELETE existing 18 subcategory-style rows
- UPSERT 3 top-level rows

### character_subcategories (new table)
- id, category_id, name, slug, description, image_url, sort_order
- RLS: public SELECT, admin-only mutations

### characters (modified)
- ADD subcategory_id UUID FK → character_subcategories
- ADD slug TEXT
- category_id made nullable (top-level group reference)
*/

-- 1. Extend character_categories
ALTER TABLE character_categories ADD COLUMN IF NOT EXISTS icon  TEXT DEFAULT 'users';
ALTER TABLE character_categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#F59E0B';

-- 2. Make characters.category_id nullable
ALTER TABLE characters ALTER COLUMN category_id DROP NOT NULL;

-- 3. Add new columns to characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS subcategory_id UUID;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS slug TEXT;

-- 4. Remove subcategory-style rows from previous migration
DELETE FROM character_categories
WHERE slug IN (
  'equipages-pirates','yonko','supernovas','organisations-pirates','shichibukai',
  'pirates-legendaires','pirates-independants','marine','cipher-pol','dragons-celestes',
  'haut-commandement','unites-speciales','allies-gouvernement',
  'revolutionnaires-dirigeants','revolutionnaires-commandants','revolutionnaires-membres',
  'allies-revolutionnaires','anciens-revolutionnaires'
);

-- 5. Upsert 3 top-level categories
INSERT INTO character_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Pirates',          'pirates',          'Les pirates sillonnant les mers du monde',     'skull-crossbones', '#F59E0B', 1),
  ('Gouvernement',     'gouvernement',     'Le Gouvernement Mondial et ses forces',        'anchor',           '#38BDF8', 2),
  ('Révolutionnaires', 'revolutionnaires', 'L''armée révolutionnaire de Monkey D. Dragon', 'fist-raised',      '#EF4444', 3)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  color       = EXCLUDED.color,
  sort_order  = EXCLUDED.sort_order;

-- 6. Create character_subcategories
CREATE TABLE IF NOT EXISTS character_subcategories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES character_categories(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE character_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subcats_select" ON character_subcategories;
CREATE POLICY "subcats_select" ON character_subcategories FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "subcats_insert" ON character_subcategories;
CREATE POLICY "subcats_insert" ON character_subcategories FOR INSERT
TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "subcats_update" ON character_subcategories;
CREATE POLICY "subcats_update" ON character_subcategories FOR UPDATE
TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "subcats_delete" ON character_subcategories;
CREATE POLICY "subcats_delete" ON character_subcategories FOR DELETE
TO authenticated USING (is_admin());

-- 7. Add FK from characters to subcategories (using DO block to avoid IF NOT EXISTS issue)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_characters_subcategory'
      AND table_name = 'characters'
  ) THEN
    ALTER TABLE characters
      ADD CONSTRAINT fk_characters_subcategory
      FOREIGN KEY (subcategory_id) REFERENCES character_subcategories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 8. Seed 18 subcategories
DO $$
DECLARE
  pid UUID;
  gid UUID;
  rid UUID;
BEGIN
  SELECT id INTO pid FROM character_categories WHERE slug = 'pirates';
  SELECT id INTO gid FROM character_categories WHERE slug = 'gouvernement';
  SELECT id INTO rid FROM character_categories WHERE slug = 'revolutionnaires';

  INSERT INTO character_subcategories (category_id, name, slug, description, sort_order) VALUES
    (pid, 'Équipages pirates',              'equipages-pirates',            'Les équipages de pirates de Grand Line',           1),
    (pid, 'Empereurs (Yonko)',              'yonko',                        'Les quatre Grands Pirates de Grand Line',           2),
    (pid, 'Supernovas / Worst Generation',  'supernovas',                   'Les pirates de la pire génération',                3),
    (pid, 'Organisations pirates',          'organisations-pirates',        'Les grandes organisations pirates',                4),
    (pid, 'Grands Corsaires (Shichibukai)', 'shichibukai',                  'Les sept grands corsaires',                        5),
    (pid, 'Pirates légendaires / anciens',  'pirates-legendaires',          'Les pirates de légende',                           6),
    (pid, 'Pirates indépendants / solos',   'pirates-independants',         'Les pirates agissant seuls',                       7),
    (gid, 'Marine',                         'marine',                       'Les forces navales du Gouvernement Mondial',       1),
    (gid, 'Cipher Pol (CP)',                'cipher-pol',                   'Les agences secrètes du Gouvernement',             2),
    (gid, 'Dragons Célestes',               'dragons-celestes',             'Les Nobles Mondiaux',                              3),
    (gid, 'Haut Commandement',              'haut-commandement',            'Le haut commandement du Gouvernement',             4),
    (gid, 'Unités spéciales',               'unites-speciales',             'Les unités spéciales',                             5),
    (gid, 'Alliés du Gouvernement',         'allies-gouvernement',          'Les alliés du Gouvernement Mondial',               6),
    (rid, 'Dirigeants',                     'revolutionnaires-dirigeants',  'Les chefs de l''armée révolutionnaire',            1),
    (rid, 'Commandants',                    'revolutionnaires-commandants', 'Les commandants révolutionnaires',                 2),
    (rid, 'Membres importants',             'revolutionnaires-membres',     'Les membres notables',                             3),
    (rid, 'Alliés des révolutionnaires',    'allies-revolutionnaires',      'Les alliés révolutionnaires',                      4),
    (rid, 'Anciens membres / alliés',       'anciens-revolutionnaires',     'Les anciens membres',                              5)
  ON CONFLICT (slug) DO NOTHING;
END $$;
