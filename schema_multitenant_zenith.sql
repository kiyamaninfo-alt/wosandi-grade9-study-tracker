-- ==============================================================================
-- Zenith O-Level • Smart Study Engine — Multi-Tenant Architecture & Schema Migration
-- Target: Grades 6 to 11 Multi-User Study Platform with Admin Management
-- Compatible with: Supabase PostgreSQL 15 / 16 / 17
-- Safe & Non-Destructive: Preserves all existing Wosandi tables, columns, and rows!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. SAFE MULTI-TENANCY COLUMNS ON EXISTING TABLES
-- Adds 'user_id' to existing tables without breaking legacy records (where user_id is NULL)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tracker_progress 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.unit_papers 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.full_papers 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.spaced_repetition_log 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.study_timer_sessions 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ------------------------------------------------------------------------------
-- 3. USER PROFILES TABLE
-- Stores individual student metadata: Grade (6-11), medium, target exam, role
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT 'Student',
  avatar_url TEXT,
  grade INTEGER DEFAULT 9 CHECK (grade >= 6 AND grade <= 11),
  medium TEXT DEFAULT 'si' CHECK (medium IN ('si', 'en', 'ta')),
  target_exam_date TIMESTAMPTZ,
  target_exam_title TEXT DEFAULT 'G.C.E. O/L Examination',
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically assign admin role to designated admin email
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN LOWER(NEW.email) = 'krishaja@gmail.com' THEN 'admin' ELSE 'student' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    role = CASE WHEN LOWER(EXCLUDED.email) = 'krishaja@gmail.com' THEN 'admin' ELSE public.user_profiles.role END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync auth.users with public.user_profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ------------------------------------------------------------------------------
-- 4. USER CUSTOM SUBJECT CONFIG TABLE (Req 3, 5 & 6)
-- Allows each student to maintain their own active subjects across Grades 6–11
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_subjects_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade INTEGER DEFAULT 9,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_subjects_config_user_id_key UNIQUE (user_id)
);

-- ------------------------------------------------------------------------------
-- 5. USER CUSTOM UNITS / LESSONS OVERRIDES (Req 6)
-- If a student renames, adds, or customizes a unit, it applies strictly to their account
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_custom_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  unit_number NUMERIC NOT NULL,
  unit_name TEXT NOT NULL,
  sub_lesson_code TEXT,
  sub_lesson_title TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_custom_units_unique_unit UNIQUE (user_id, subject, unit_number)
);

-- ------------------------------------------------------------------------------
-- 6. PLATFORM ANNOUNCEMENTS (Admin Broadcasts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'alert', 'celebration')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT DEFAULT 'krishaja@gmail.com',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tracker_progress_user ON public.tracker_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_papers_user ON public.unit_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_full_papers_user ON public.full_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user ON public.study_timer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_custom_units_user ON public.user_custom_units(user_id);

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures user data isolation while granting admin access to krishaja@gmail.com
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current session is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() ->> 'email') = 'krishaja@gmail.com' OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for user_profiles
DROP POLICY IF EXISTS "Users can view and update own profile" ON public.user_profiles;
CREATE POLICY "Users can view and update own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id OR public.is_current_user_admin());

-- Policies for user_subjects_config
DROP POLICY IF EXISTS "Users manage own subject config" ON public.user_subjects_config;
CREATE POLICY "Users manage own subject config" ON public.user_subjects_config
  FOR ALL USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Policies for user_custom_units
DROP POLICY IF EXISTS "Users manage own custom units" ON public.user_custom_units;
CREATE POLICY "Users manage own custom units" ON public.user_custom_units
  FOR ALL USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Policies for announcements
DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.platform_announcements;
CREATE POLICY "Everyone can view active announcements" ON public.platform_announcements
  FOR SELECT USING (is_active = true OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Admin manages announcements" ON public.platform_announcements;
CREATE POLICY "Admin manages announcements" ON public.platform_announcements
  FOR ALL USING (public.is_current_user_admin());

-- ------------------------------------------------------------------------------
-- 9. ADMIN TELEMETRY RPC (Req 12 & 13)
-- Allows krishaja@gmail.com to retrieve high-level statistics across all students
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_portal_overview()
RETURNS JSONB AS $$
DECLARE
  v_total_users BIGINT;
  v_total_sessions BIGINT;
  v_total_study_minutes BIGINT;
  v_total_unit_papers BIGINT;
  v_total_full_papers BIGINT;
  v_recent_users JSONB;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.user_profiles;
  SELECT COUNT(*), COALESCE(SUM(duration_minutes), 0) INTO v_total_sessions, v_total_study_minutes FROM public.study_timer_sessions;
  SELECT COUNT(*) INTO v_total_unit_papers FROM public.unit_papers;
  SELECT COUNT(*) INTO v_total_full_papers FROM public.full_papers;

  SELECT COALESCE(jsonb_agg(u), '[]'::jsonb) INTO v_recent_users FROM (
    SELECT id, email, full_name, grade, role, created_at, updated_at
    FROM public.user_profiles
    ORDER BY created_at DESC
    LIMIT 50
  ) u;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_sessions', v_total_sessions,
    'total_study_minutes', v_total_study_minutes,
    'total_unit_papers', v_total_unit_papers,
    'total_full_papers', v_total_full_papers,
    'recent_users', v_recent_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
