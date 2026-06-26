-- Crear tabla de asignaturas
CREATE TABLE IF NOT EXISTS "Colegio".subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES "Colegio".courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profesor_name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT '📚',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar subject_id a events
ALTER TABLE "Colegio".events
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES "Colegio".subjects(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE "Colegio".subjects ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer asignaturas
CREATE POLICY select_subjects ON "Colegio".subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admin puede insert/update/delete
CREATE POLICY insert_subjects ON "Colegio".subjects
  FOR INSERT WITH CHECK ("Colegio".is_admin());

CREATE POLICY update_subjects ON "Colegio".subjects
  FOR UPDATE USING ("Colegio".is_admin()) WITH CHECK ("Colegio".is_admin());

CREATE POLICY delete_subjects ON "Colegio".subjects
  FOR DELETE USING ("Colegio".is_admin());

-- Grant permisos para authenticated
GRANT ALL ON "Colegio".subjects TO authenticated;
GRANT USAGE ON SCHEMA "Colegio" TO authenticated;
