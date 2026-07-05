
CREATE TABLE IF NOT EXISTS preset_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE preset_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_preset_avatars" ON preset_avatars
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_preset_avatars" ON preset_avatars
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "update_preset_avatars" ON preset_avatars
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "delete_preset_avatars" ON preset_avatars
  FOR DELETE TO authenticated USING (is_admin());

INSERT INTO storage.buckets (id, name, public) VALUES ('preset-avatars', 'preset-avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_preset_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'preset-avatars');

CREATE POLICY "admin_insert_preset_avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'preset-avatars' AND is_admin());

CREATE POLICY "admin_delete_preset_avatars" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'preset-avatars' AND is_admin());
