DROP POLICY IF EXISTS select_events ON "Colegio".events;
CREATE POLICY select_events ON "Colegio".events
  FOR SELECT USING (
    "Colegio".is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM "Colegio".course_members
        WHERE course_id = events.course_id AND user_id = auth.uid()
      )
      AND (
        events.visibility = 'all'
        OR (
          events.visibility = 'admin_teacher'
          AND EXISTS (
            SELECT 1 FROM "Colegio".profiles
            WHERE id = auth.uid() AND role = 'profesor'
          )
        )
      )
    )
  );
