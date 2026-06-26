-- Fix RLS recursion: create security definer helper to check admin role
-- This breaks the recursion because SECURITY DEFINER runs with owner privileges

CREATE OR REPLACE FUNCTION "Colegio".is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Colegio".profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop recursive policies on profiles
DROP POLICY IF EXISTS admin_all ON "Colegio".profiles;

-- Profiles: each user can read their own profile, admins can read all
CREATE POLICY select_own_or_admin ON "Colegio".profiles
  FOR SELECT
  USING (id = auth.uid() OR "Colegio".is_admin());

-- Profiles: each user can update their own profile
CREATE POLICY update_own_or_admin ON "Colegio".profiles
  FOR UPDATE
  USING (id = auth.uid() OR "Colegio".is_admin())
  WITH CHECK (id = auth.uid() OR "Colegio".is_admin());

-- Profiles: admin can insert/delete
CREATE POLICY insert_admin ON "Colegio".profiles
  FOR INSERT
  WITH CHECK ("Colegio".is_admin());

CREATE POLICY delete_admin ON "Colegio".profiles
  FOR DELETE
  USING ("Colegio".is_admin());

-- Update other policies to use is_admin() helper
DROP POLICY IF EXISTS admin_all ON "Colegio".courses;
DROP POLICY IF EXISTS admin_all ON "Colegio".events;
DROP POLICY IF EXISTS admin_all ON "Colegio".course_teachers;
DROP POLICY IF EXISTS admin_all ON "Colegio".course_students;

CREATE POLICY admin_all_courses ON "Colegio".courses
  FOR ALL USING ("Colegio".is_admin());

CREATE POLICY admin_all_events ON "Colegio".events
  FOR ALL USING ("Colegio".is_admin());

CREATE POLICY admin_all_course_teachers ON "Colegio".course_teachers
  FOR ALL USING ("Colegio".is_admin());

CREATE POLICY admin_all_course_students ON "Colegio".course_students
  FOR ALL USING ("Colegio".is_admin());
