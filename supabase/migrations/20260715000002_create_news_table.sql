CREATE TABLE IF NOT EXISTS "Colegio".news (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES "Colegio".profiles(id),
  created_at timestamptz DEFAULT now(),
  visibility text NOT NULL DEFAULT 'all',
  publish_at timestamptz,
  course_id uuid REFERENCES "Colegio".courses(id)
);

ALTER TABLE "Colegio".news ENABLE ROW LEVEL SECURITY;

-- Admin puede todo
CREATE POLICY admin_all_news ON "Colegio".news
  FOR ALL USING ("Colegio".is_admin());

-- Profesor puede insertar (created_by propio)
CREATE POLICY teacher_insert_news ON "Colegio".news
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM "Colegio".profiles
      WHERE id = auth.uid() AND role = 'profesor'
    )
    AND created_by = auth.uid()
  );

-- Profesor puede actualizar sus propias noticias
CREATE POLICY teacher_update_news ON "Colegio".news
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Colegio".profiles
      WHERE id = auth.uid() AND role = 'profesor'
    )
    AND created_by = auth.uid()
  );

-- Profesor puede eliminar sus propias noticias
CREATE POLICY teacher_delete_news ON "Colegio".news
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "Colegio".profiles
      WHERE id = auth.uid() AND role = 'profesor'
    )
    AND created_by = auth.uid()
  );

-- SELECT: admin ve todo, profesor ve todo, alumno solo visible y publicada
CREATE POLICY select_news ON "Colegio".news
  FOR SELECT USING (
    "Colegio".is_admin()
    OR EXISTS (
      SELECT 1 FROM "Colegio".profiles
      WHERE id = auth.uid() AND role = 'profesor'
    )
    OR (
      auth.role() = 'authenticated'
      AND news.visibility = 'all'
      AND (news.publish_at IS NULL OR news.publish_at <= now())
      AND (
        news.course_id IS NULL
        OR EXISTS (
          SELECT 1 FROM "Colegio".course_members
          WHERE course_id = news.course_id AND user_id = auth.uid()
        )
      )
    )
  );
