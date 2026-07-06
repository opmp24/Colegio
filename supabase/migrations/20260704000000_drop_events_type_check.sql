-- Eliminar CHECK constraint de events.type para permitir tipos dinámicos desde evaluation_types
ALTER TABLE "Colegio".events DROP CONSTRAINT IF EXISTS events_type_check;
