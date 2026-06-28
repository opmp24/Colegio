-- Permitir que rol usuario con permiso "eventos" pueda insertar eventos

DROP POLICY IF EXISTS insert_events_teacher ON "Colegio".events;
CREATE POLICY insert_events_teacher ON "Colegio".events
  FOR INSERT
  WITH CHECK (
    "Colegio".is_admin()
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM "Colegio".profiles
        WHERE id = auth.uid() AND role = 'profesor'
      )
      AND created_by = auth.uid()
    )
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM "Colegio".profiles
        WHERE id = auth.uid()
          AND role = 'usuario'
          AND permissions @> '["eventos"]'::jsonb
      )
      AND created_by = auth.uid()
    )
  );
