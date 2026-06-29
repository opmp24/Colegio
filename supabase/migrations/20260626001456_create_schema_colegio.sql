-- Crear schema Colegio
CREATE SCHEMA IF NOT EXISTS "Colegio";

-- Tabla: cursos
CREATE TABLE "Colegio".courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: perfiles (vinculados a auth.users)
CREATE TABLE "Colegio".profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: eventos
CREATE TABLE "Colegio".events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES "Colegio".courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('test', 'exam', 'homework', 'essay', 'other')),
  due_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES "Colegio".profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: relación curso-profesor
CREATE TABLE "Colegio".course_teachers (
  course_id UUID REFERENCES "Colegio".courses(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES "Colegio".profiles(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (course_id, profile_id)
);

-- Tabla: relación estudiante-curso
CREATE TABLE "Colegio".course_students (
  course_id UUID REFERENCES "Colegio".courses(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES "Colegio".profiles(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (course_id, profile_id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE "Colegio".courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Colegio".profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Colegio".events ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Colegio".course_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Colegio".course_students ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: admin puede todo
CREATE POLICY admin_all ON "Colegio".courses FOR ALL USING (
  EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all ON "Colegio".profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all ON "Colegio".events FOR ALL USING (
  EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all ON "Colegio".course_teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all ON "Colegio".course_students FOR ALL USING (
  EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas RLS: teacher puede leer/crear en sus cursos
CREATE POLICY teacher_select ON "Colegio".events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Colegio".profiles p
    JOIN "Colegio".course_teachers ct ON ct.profile_id = p.id
    WHERE p.id = auth.uid() AND p.role = 'teacher' AND ct.course_id = events.course_id
  )
);
CREATE POLICY teacher_insert ON "Colegio".events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY teacher_update ON "Colegio".events FOR UPDATE USING (
  created_by = auth.uid()
) WITH CHECK (
  created_by = auth.uid()
);

-- Políticas RLS: student/parent solo lectura
CREATE POLICY read_only ON "Colegio".events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Colegio".profiles p
    JOIN "Colegio".course_students cs ON cs.profile_id = p.id
    WHERE p.id = auth.uid() AND p.role IN ('student', 'parent') AND cs.course_id = events.course_id
  )
);

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION "Colegio".handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO "Colegio".profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  );
  RETURN NEW;
END;
$$;

-- Trigger para nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION "Colegio".handle_new_user();
