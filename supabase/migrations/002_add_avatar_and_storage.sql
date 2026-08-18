-- Add avatar_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure unique constraint on user_id for upsert support
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Create storage bucket for avatars
-- Run this in the Supabase Dashboard > Storage > New Bucket:
--   Name: avatars
--   Public: true
--   File size limit: 2 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Storage RLS policies (if using SQL):
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow public read access to all avatars
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Allow users to update/delete their own avatars
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
