-- ============================================================
-- Migration: Auditoría + Triggers de seguridad
-- ============================================================

-- 1. Trigger: forzar created_by = auth.uid() en news
CREATE OR REPLACE FUNCTION "Colegio".set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_set_created_by ON "Colegio".news;
CREATE TRIGGER trg_news_set_created_by
  BEFORE INSERT ON "Colegio".news
  FOR EACH ROW EXECUTE FUNCTION "Colegio".set_created_by();

-- 2. Trigger: forzar created_by = auth.uid() en events
DROP TRIGGER IF EXISTS trg_events_set_created_by ON "Colegio".events;
CREATE TRIGGER trg_events_set_created_by
  BEFORE INSERT ON "Colegio".events
  FOR EACH ROW EXECUTE FUNCTION "Colegio".set_created_by();

-- 3. Tabla de auditoría
CREATE TABLE IF NOT EXISTS "Colegio".audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid REFERENCES "Colegio".profiles(id),
  performed_at timestamptz DEFAULT now()
);

ALTER TABLE "Colegio".audit_log ENABLE ROW LEVEL SECURITY;

-- Solo admin puede leer auditoría
CREATE POLICY select_audit_log ON "Colegio".audit_log
  FOR SELECT USING ("Colegio".is_admin());

-- Nadie inserta directo, solo el trigger function
CREATE POLICY no_insert_audit_log ON "Colegio".audit_log
  FOR INSERT WITH CHECK (false);

CREATE POLICY no_update_audit_log ON "Colegio".audit_log
  FOR UPDATE USING (false);

CREATE POLICY no_delete_audit_log ON "Colegio".audit_log
  FOR DELETE USING (false);

-- 4. Función trigger de auditoría genérica
CREATE OR REPLACE FUNCTION "Colegio".audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "Colegio".audit_log(table_name, record_id, action, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW)::jsonb, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO "Colegio".audit_log(table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO "Colegio".audit_log(table_name, record_id, action, old_data, performed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD)::jsonb, auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Aplicar triggers de auditoría a tablas principales
DROP TRIGGER IF EXISTS trg_events_audit ON "Colegio".events;
CREATE TRIGGER trg_events_audit
  AFTER INSERT OR UPDATE OR DELETE ON "Colegio".events
  FOR EACH ROW EXECUTE FUNCTION "Colegio".audit_trigger();

DROP TRIGGER IF EXISTS trg_news_audit ON "Colegio".news;
CREATE TRIGGER trg_news_audit
  AFTER INSERT OR UPDATE OR DELETE ON "Colegio".news
  FOR EACH ROW EXECUTE FUNCTION "Colegio".audit_trigger();

DROP TRIGGER IF EXISTS trg_profiles_audit ON "Colegio".profiles;
CREATE TRIGGER trg_profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON "Colegio".profiles
  FOR EACH ROW EXECUTE FUNCTION "Colegio".audit_trigger();

DROP TRIGGER IF EXISTS trg_courses_audit ON "Colegio".courses;
CREATE TRIGGER trg_courses_audit
  AFTER INSERT OR UPDATE OR DELETE ON "Colegio".courses
  FOR EACH ROW EXECUTE FUNCTION "Colegio".audit_trigger();
