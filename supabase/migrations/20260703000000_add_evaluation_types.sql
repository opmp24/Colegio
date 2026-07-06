-- Crear tabla de tipos de evaluación
CREATE TABLE IF NOT EXISTS "Colegio".evaluation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial data (migrar los 5 tipos hardcodeados del frontend)
INSERT INTO "Colegio".evaluation_types (name, label) VALUES
  ('test', 'Prueba'),
  ('exam', 'Examen'),
  ('homework', 'Trabajo'),
  ('essay', 'Ensayo'),
  ('other', 'Otros')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE "Colegio".evaluation_types ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
CREATE POLICY select_evaluation_types ON "Colegio".evaluation_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin y profesor pueden insertar
CREATE POLICY insert_evaluation_types ON "Colegio".evaluation_types
  FOR INSERT WITH CHECK (
    "Colegio".is_admin()
    OR EXISTS (
      SELECT 1 FROM "Colegio".profiles
      WHERE id = auth.uid() AND role = 'profesor'
    )
  );

-- Admin y profesor pueden actualizar
CREATE POLICY update_evaluation_types ON "Colegio".evaluation_types
  FOR UPDATE USING (
    "Colegio".is_admin()
    OR EXISTS (
      SELECT 1 FROM "Colegio".profiles
      WHERE id = auth.uid() AND role = 'profesor'
    )
  );

-- Admin y profesor pueden eliminar
CREATE POLICY delete_evaluation_types ON "Colegio".evaluation_types
  FOR DELETE USING (
    "Colegio".is_admin()
    OR EXISTS (
      SELECT 1 FROM "Colegio".profiles
      WHERE id = auth.uid() AND role = 'profesor'
    )
  );

-- Grant permisos
GRANT ALL ON "Colegio".evaluation_types TO authenticated;
GRANT USAGE ON SCHEMA "Colegio" TO authenticated;
