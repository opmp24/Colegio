-- Restringir SELECT en events: solo eventos de cursos asignados al usuario (o admin)
DROP POLICY IF EXISTS select_events ON "Colegio".events;
CREATE POLICY select_events ON "Colegio".events
  FOR SELECT USING (
    "Colegio".is_admin()
    OR EXISTS (
      SELECT 1 FROM "Colegio".course_members
      WHERE course_id = events.course_id AND user_id = auth.uid()
    )
  );
