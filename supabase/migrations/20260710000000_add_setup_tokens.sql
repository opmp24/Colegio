-- Tabla de tokens para setup/reset de PIN
CREATE TABLE IF NOT EXISTS "Colegio".setup_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "Colegio".profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Columna para control de setup completo
ALTER TABLE "Colegio".profiles
  ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT true;

-- Admin: actualizar PIN a 7141 con hash + setup_complete = true
UPDATE "Colegio".profiles
SET pin_hash = 'sha256:b3e2f05f302b77b2bb2b014c49aa1d5f:840d7ef73114572e1c077f14542fd27738e5205a9fcd6950023897f40e12a802',
    pin = NULL,
    setup_complete = true
WHERE id = '1c31d16b-a80f-4efc-8383-5f6485065f11';

-- Resetear usuarios no-admin: pin_hash = NULL, setup_complete = false
UPDATE "Colegio".profiles
SET pin_hash = NULL,
    pin = NULL,
    setup_complete = false
WHERE role IN ('usuario', 'profesor');

-- RLS para setup_tokens
ALTER TABLE "Colegio".setup_tokens ENABLE ROW LEVEL SECURITY;

-- Solo el admin puede leer setup_tokens (via edge function con service_role)
CREATE POLICY select_setup_tokens ON "Colegio".setup_tokens
  FOR SELECT USING ("Colegio".is_admin());

CREATE POLICY insert_setup_tokens ON "Colegio".setup_tokens
  FOR INSERT WITH CHECK ("Colegio".is_admin());

CREATE POLICY update_setup_tokens ON "Colegio".setup_tokens
  FOR UPDATE USING ("Colegio".is_admin()) WITH CHECK ("Colegio".is_admin());

CREATE POLICY delete_setup_tokens ON "Colegio".setup_tokens
  FOR DELETE USING ("Colegio".is_admin());
