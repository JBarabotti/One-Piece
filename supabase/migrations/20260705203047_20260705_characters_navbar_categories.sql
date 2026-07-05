/*
# Align character_categories with navbar hierarchy

## Summary
Replaces the 6 generic seed categories with the exact 18 subcategories from the
site's navigation bar, grouped under 3 top-level groups: Pirates, Gouvernement,
Révolutionnaires. Adds a group_name column for hierarchical display in the admin.

## Changes

### character_categories — modified
- ADD COLUMN group_name TEXT: identifies the top-level group ('pirates', 'gouvernement', 'revolutionnaires')
- REPLACE seed rows: delete old 6 generic categories (cascade to characters — safe since no characters exist yet)
- INSERT 18 new categories matching the navbar exactly

### New categories
**Pirates group (7 subcategories):**
  equipages-pirates, yonko, supernovas, organisations-pirates,
  shichibukai, pirates-legendaires, pirates-independants

**Gouvernement group (6 subcategories):**
  marine, cipher-pol, dragons-celestes, haut-commandement,
  unites-speciales, allies-gouvernement

**Révolutionnaires group (5 subcategories):**
  revolutionnaires-dirigeants, revolutionnaires-commandants,
  revolutionnaires-membres, allies-revolutionnaires, anciens-revolutionnaires
*/

-- Add group_name column
ALTER TABLE character_categories ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Remove old seed categories (safe: no characters yet; cascade handles FK)
DELETE FROM character_categories
WHERE slug IN (
  'straw-hat', 'yonko', 'marine', 'revolutionnaires', 'supernovas', 'antagonistes'
);

-- Insert navbar-aligned categories
INSERT INTO character_categories (name, slug, group_name, description, sort_order) VALUES
  -- Pirates
  ('Équipages pirates',                'equipages-pirates',             'pirates',          'Les équipages de pirates de Grand Line',                          1),
  ('Empereurs (Yonko)',                'yonko',                         'pirates',          'Les quatre Grands Pirates régnant sur Grand Line',                 2),
  ('Supernovas / Worst Generation',    'supernovas',                    'pirates',          'Les pirates de la pire génération',                               3),
  ('Organisations pirates',            'organisations-pirates',          'pirates',          'Les grandes organisations et alliances pirates',                   4),
  ('Grands Corsaires (Shichibukai)',   'shichibukai',                   'pirates',          'Les sept grands corsaires du Gouvernement Mondial',                5),
  ('Pirates légendaires / anciens',    'pirates-legendaires',           'pirates',          'Les pirates de légende et ceux d''une ère passée',                 6),
  ('Pirates indépendants / solos',     'pirates-independants',          'pirates',          'Les pirates agissant en dehors de tout équipage ou organisation',  7),
  -- Gouvernement
  ('Marine',                           'marine',                        'gouvernement',     'Les forces navales du Gouvernement Mondial',                       8),
  ('Cipher Pol (CP)',                  'cipher-pol',                    'gouvernement',     'Les agences secrètes du Gouvernement',                            9),
  ('Dragons Célestes',                 'dragons-celestes',              'gouvernement',     'Les Nobles Mondiaux et leur entourage',                           10),
  ('Haut Commandement',                'haut-commandement',             'gouvernement',     'Le haut commandement du Gouvernement et de la Marine',            11),
  ('Unités spéciales',                 'unites-speciales',              'gouvernement',     'Les unités et divisions spéciales',                               12),
  ('Alliés du Gouvernement',           'allies-gouvernement',           'gouvernement',     'Les alliés et partenaires du Gouvernement Mondial',               13),
  -- Révolutionnaires
  ('Dirigeants',                       'revolutionnaires-dirigeants',   'revolutionnaires', 'Les chefs de l''armée révolutionnaire de Dragon',                  14),
  ('Commandants',                      'revolutionnaires-commandants',  'revolutionnaires', 'Les commandants des différentes armées',                           15),
  ('Membres importants',               'revolutionnaires-membres',      'revolutionnaires', 'Les membres notables de l''armée révolutionnaire',                 16),
  ('Alliés des révolutionnaires',      'allies-revolutionnaires',       'revolutionnaires', 'Les alliés et sympathisants révolutionnaires',                     17),
  ('Anciens membres / alliés',         'anciens-revolutionnaires',      'revolutionnaires', 'Les anciens membres et anciens alliés',                            18)
ON CONFLICT (slug) DO UPDATE SET
  name       = EXCLUDED.name,
  group_name = EXCLUDED.group_name,
  description= EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
