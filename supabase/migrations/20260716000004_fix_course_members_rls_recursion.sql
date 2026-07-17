-- Fix: recursión infinita en select_course_members
-- La subquery EXISTS disparaba RLS contra sí misma → loop infinito → HTTP 500

-- 1. Función helper SECURITY DEFINER (bypass RLS) para chequear membresía
CREATE OR REPLACE FUNCTION "Colegio".is_course_member(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Colegio".course_members
    WHERE course_id = p_course_id AND user_id = auth.uid()
  );
$$;

-- 2. Reemplazar política usando la función (evita auto-referencia RLS)
DROP POLICY IF EXISTS select_course_members ON "Colegio".course_members;
CREATE POLICY select_course_members ON "Colegio".course_members
  FOR SELECT USING (
    "Colegio".is_admin()
    OR user_id = auth.uid()
    OR "Colegio".is_course_member(course_id)
  );
