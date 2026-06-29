-- Profesores pueden leer eventos (no solo admin)
DROP POLICY IF EXISTS select_events ON "Colegio".events;
CREATE POLICY select_events ON "Colegio".events
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profesores pueden insertar eventos (created_by propio)
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
  );

-- Profesores pueden actualizar/eliminar sus propios eventos
DROP POLICY IF EXISTS update_events_teacher ON "Colegio".events;
CREATE POLICY update_events_teacher ON "Colegio".events
  FOR UPDATE
  USING ("Colegio".is_admin() OR (created_by = auth.uid()))
  WITH CHECK ("Colegio".is_admin() OR (created_by = auth.uid()));

DROP POLICY IF EXISTS delete_events_teacher ON "Colegio".events;
CREATE POLICY delete_events_teacher ON "Colegio".events
  FOR DELETE
  USING ("Colegio".is_admin() OR (created_by = auth.uid()));
