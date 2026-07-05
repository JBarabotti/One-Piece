-- Add content_blocks to characters for block editor
ALTER TABLE characters ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT '[]';

-- Add image_url to character_categories
ALTER TABLE character_categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create image storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('categories', 'categories', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('subcategories', 'subcategories', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for categories bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read categories') THEN
    CREATE POLICY "Public read categories" ON storage.objects FOR SELECT TO public USING (bucket_id = 'categories');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert categories') THEN
    CREATE POLICY "Admin insert categories" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'categories' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin delete categories') THEN
    CREATE POLICY "Admin delete categories" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'categories' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
  END IF;

  -- Storage RLS policies for subcategories bucket
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read subcategories') THEN
    CREATE POLICY "Public read subcategories" ON storage.objects FOR SELECT TO public USING (bucket_id = 'subcategories');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert subcategories') THEN
    CREATE POLICY "Admin insert subcategories" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'subcategories' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin delete subcategories') THEN
    CREATE POLICY "Admin delete subcategories" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'subcategories' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
  END IF;

  -- Storage RLS policies for characters bucket (if not already created)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read characters') THEN
    CREATE POLICY "Public read characters" ON storage.objects FOR SELECT TO public USING (bucket_id = 'characters');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert characters') THEN
    CREATE POLICY "Admin insert characters" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'characters' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin delete characters') THEN
    CREATE POLICY "Admin delete characters" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'characters' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;
