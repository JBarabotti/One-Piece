/*
# One Piece Platform — Full Schema

## Summary
Creates the complete backend for the One Piece platform: user profiles, internal messaging, and editable current events.

## New Tables

### profiles
Extends Supabase auth.users. Stores username, faction, avatar, and role.
- id: UUID, primary key, foreign key → auth.users
- username: unique display name
- faction: one of 'pirate', 'marine', 'revolutionnaire'
- avatar_url: public URL for profile picture
- role: 'user' or 'admin' (default 'user')
- created_at: timestamp

### messages
Internal messaging between users.
- id: UUID PK
- sender_id / receiver_id: FK → profiles
- content: message text
- read: whether receiver has read the message
- created_at: timestamp

### events
Editable "current events" section for anime and manga, managed by admins.
- id: UUID PK
- type: 'anime' or 'manga'
- arc: current arc name
- episode_chapter: current episode/chapter
- location: current location
- description: description text
- event_date: display date
- updated_by: FK → profiles (who last edited)
- updated_at: timestamp

## Security
- RLS enabled on all three tables
- profiles: all authenticated users can SELECT; own profile INSERT; own or admin UPDATE; admin DELETE
- messages: sender/receiver can SELECT; sender INSERT (auth.uid() = sender_id); receiver UPDATE (mark read); sender or admin DELETE
- events: public SELECT (anon + authenticated); admin-only INSERT/UPDATE/DELETE

## Functions & Triggers
- is_admin(): SECURITY DEFINER helper, checks profiles.role = 'admin' for auth.uid()
- auto_set_admin(): trigger sets role = 'admin' when username = 'GodnameNadroj'

## Storage
- Creates 'avatars' bucket (public) for profile pictures
*/

-- ─── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  faction     TEXT CHECK (faction IN ('pirate', 'marine', 'revolutionnaire')),
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ─── EVENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('anime', 'manga')),
  arc             TEXT DEFAULT 'Arc en cours',
  episode_chapter TEXT DEFAULT 'À venir',
  location        TEXT DEFAULT 'Lieu inconnu',
  description     TEXT DEFAULT 'Informations à venir.',
  event_date      TEXT DEFAULT 'En cours',
  updated_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ─── HELPER FUNCTION: is_admin ───────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ─── TRIGGER: auto-promote GodnameNadroj to admin ────────────
CREATE OR REPLACE FUNCTION auto_set_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.username = 'GodnameNadroj' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_admin ON profiles;
CREATE TRIGGER trg_auto_admin
  BEFORE INSERT OR UPDATE OF username ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_set_admin();

-- ─── RLS: profiles ───────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR is_admin())
WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
TO authenticated USING (is_admin());

-- ─── RLS: messages ───────────────────────────────────────────
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT
TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT
TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE
TO authenticated USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages FOR DELETE
TO authenticated USING (auth.uid() = sender_id OR is_admin());

-- ─── RLS: events ─────────────────────────────────────────────
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT
TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE
TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE
TO authenticated USING (is_admin());

-- ─── SEED: default events ────────────────────────────────────
INSERT INTO events (type, arc, episode_chapter, location, description, event_date)
VALUES
  ('anime', 'Arc en cours', 'Épisode à venir', 'Lieu inconnu', 'Informations à venir.', 'En cours'),
  ('manga', 'Arc en cours', 'Chapitre à venir', 'Lieu inconnu', 'Informations à venir.', 'En cours')
ON CONFLICT DO NOTHING;

-- ─── STORAGE: avatars bucket ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT
TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE
TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'avatars');
