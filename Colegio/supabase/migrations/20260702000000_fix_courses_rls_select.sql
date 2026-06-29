-- Permitir a usuarios autenticados leer cursos
-- (necesario para que JOINs en useUserCourses y useEvents funcionen)
DROP POLICY IF EXISTS select_courses_authenticated ON "Colegio".courses;
CREATE POLICY select_courses_authenticated ON "Colegio".courses
  FOR SELECT USING (auth.role() = 'authenticated');

-- Ajustar política SELECT en course_members para que usuarios vean solo sus propios registros
DROP POLICY IF EXISTS select_course_members ON "Colegio".course_members;
CREATE POLICY select_course_members ON "Colegio".course_members
  FOR SELECT USING (user_id = auth.uid() OR "Colegio".is_admin());

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
