-- Agregar columnas para avatar personalizado
ALTER TABLE "Colegio".profiles
  ADD COLUMN IF NOT EXISTS avatar_icon TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT '#6366f1';
