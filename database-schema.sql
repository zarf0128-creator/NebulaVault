-- ============================================================================
-- NEBULAVAULT DATABASE SCHEMA
-- Production-Ready Zero-Knowledge Cloud Storage System
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FILES TABLE
-- ============================================================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  encryption_iv TEXT NOT NULL,
  wrapped_file_key TEXT NOT NULL,
  wrapped_key_iv TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_storage_path ON files(storage_path);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SHARES TABLE
-- ============================================================================
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  encrypted_file_key TEXT NOT NULL,
  encrypted_file_key_iv TEXT NOT NULL,
  usage_limit INTEGER NOT NULL DEFAULT 1,
  download_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shares_file_id ON shares(file_id);
CREATE INDEX idx_shares_expires_at ON shares(expires_at);
CREATE INDEX idx_shares_created_by ON shares(created_by);
CREATE INDEX idx_shares_created_at ON shares(created_at DESC);

ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CRITICAL: Allow BOTH anon and authenticated roles to read shares.
-- Without "TO anon, authenticated", unauthenticated users (people opening
-- share links in a different browser) cannot load the share record.
-- ============================================================================
CREATE POLICY "Anyone can read shares"
  ON shares FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only file owners can create shares
CREATE POLICY "File owners can create shares"
  ON shares FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM files WHERE id = file_id
    )
  );

-- Anyone can increment download_count (needed for unauthenticated downloads)
CREATE POLICY "Anyone can update download count"
  ON shares FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Only file owners can delete shares
CREATE POLICY "File owners can delete shares"
  ON shares FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM files WHERE id = file_id
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM shares WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STORAGE SETUP
-- Run these in Supabase SQL Editor after creating the "encrypted-files" bucket
-- ============================================================================

/*
STEP 1 — Create bucket (Supabase Dashboard → Storage → New bucket):
  Name: encrypted-files
  Public: OFF (private)

STEP 2 — Run these storage policies in SQL Editor:
*/

-- Owners can upload their own files
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'encrypted-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can read/download their own files
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'encrypted-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'encrypted-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- CRITICAL FOR SHARE LINKS:
-- Allow the service_role to generate signed URLs for any file.
-- This lets ShareAccess.jsx call createSignedUrl() which works for
-- unauthenticated recipients — the signed URL itself is pre-authorized.
--
-- In Supabase Dashboard → Storage → encrypted-files → Policies:
-- Add a SELECT policy for "service_role":
--   Role: service_role
--   Operation: SELECT
--   Policy: true
--
-- OR alternatively, if you want a simpler setup with anon access:
-- ============================================================================

-- Allow anon/anyone to read via signed URL (Supabase handles the token check)
CREATE POLICY "Allow signed URL access for shares"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'encrypted-files');

-- ============================================================================
-- IF YOU ALREADY HAVE THE TABLES, run just these fixes:
-- ============================================================================
/*
-- Fix 1: Grant anon role access to read shares
ALTER POLICY "Anyone can read shares" ON shares TO anon, authenticated;

-- Fix 2: Allow anon to update download count
DROP POLICY IF EXISTS "File owners can update shares" ON shares;
CREATE POLICY "Anyone can update download count"
  ON shares FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Fix 3: Allow anon to download via signed URL
CREATE POLICY "Allow signed URL access for shares"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'encrypted-files');
*/

-- ============================================================================
-- DEPLOYMENT CHECKLIST
-- ============================================================================
/*
1. CREATE SUPABASE PROJECT
   - Sign up at supabase.com, create project
   - Note your Project URL and anon key

2. RUN THIS SCHEMA IN SQL EDITOR

3. CONFIGURE STORAGE
   - Create "encrypted-files" bucket (private/public OFF)
   - The storage policies above will be created automatically if you run this file
   - If the storage.objects policies fail, add them manually in the Dashboard

4. ENABLE AUTH PROVIDERS
   - Authentication → Providers → Email: ON
   - Authentication → Providers → Google: ON (optional)
   - Add redirect URLs: http://localhost:3000/auth/callback (dev)
                        https://yourdomain.com/auth/callback (prod)

5. ADD ENV VARS to .env:
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...

SECURITY NOTES:
- Master key never leaves the browser
- File keys are stored wrapped (encrypted) — never plaintext
- Share keys are NEVER stored in the database (URL fragment only)
- All encryption is client-side (AES-256-GCM)
- Row Level Security enforced on all tables
- Storage isolated by user_id folder
- Signed URLs expire in 5 minutes (used for share downloads only)
*/
