-- Restringir SELECT en course_members: solo admin o miembros del mismo curso
DROP POLICY IF EXISTS select_course_members ON "Colegio".course_members;
CREATE POLICY select_course_members ON "Colegio".course_members
  FOR SELECT USING (
    "Colegio".is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "Colegio".course_members cm2
      WHERE cm2.course_id = course_members.course_id
      AND cm2.user_id = auth.uid()
    )
  );
