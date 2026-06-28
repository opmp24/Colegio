-- Crear tabla de relación usuario-curso (member genérico: cualquier usuario asignado a un curso)
CREATE TABLE IF NOT EXISTS "Colegio".course_members (
  user_id UUID REFERENCES "Colegio".profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES "Colegio".courses(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

-- RLS
ALTER TABLE "Colegio".course_members ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
CREATE POLICY select_course_members ON "Colegio".course_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admin puede insert/update/delete
CREATE POLICY insert_course_members ON "Colegio".course_members
  FOR INSERT WITH CHECK ("Colegio".is_admin());

CREATE POLICY update_course_members ON "Colegio".course_members
  FOR UPDATE USING ("Colegio".is_admin()) WITH CHECK ("Colegio".is_admin());

CREATE POLICY delete_course_members ON "Colegio".course_members
  FOR DELETE USING ("Colegio".is_admin());
