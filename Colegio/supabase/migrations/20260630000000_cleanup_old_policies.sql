-- Limpiar políticas viejas que referencian roles que ya no existen
DROP POLICY IF EXISTS read_only ON "Colegio".events;
DROP POLICY IF EXISTS teacher_select ON "Colegio".events;
DROP POLICY IF EXISTS teacher_insert ON "Colegio".events;
DROP POLICY IF EXISTS teacher_update ON "Colegio".events;
DROP POLICY IF EXISTS admin_all ON "Colegio".events;
DROP POLICY IF EXISTS admin_all ON "Colegio".courses;
DROP POLICY IF EXISTS admin_all ON "Colegio".course_teachers;
DROP POLICY IF EXISTS admin_all ON "Colegio".course_students;
DROP POLICY IF EXISTS admin_all ON "Colegio".profiles;
