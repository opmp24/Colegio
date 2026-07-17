-- ============================================================
-- Migration: Login attempts tracking + PIN lockout
-- ============================================================

-- 1. Tabla de intentos de login
CREATE TABLE IF NOT EXISTS "Colegio".login_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  ip_address text,
  success boolean DEFAULT false
);

ALTER TABLE "Colegio".login_attempts ENABLE ROW LEVEL SECURITY;

-- Solo admin puede leer
CREATE POLICY select_login_attempts ON "Colegio".login_attempts
  FOR SELECT USING ("Colegio".is_admin());

-- El trigger function inserta, nadie más
CREATE POLICY no_insert_login_attempts ON "Colegio".login_attempts
  FOR INSERT WITH CHECK (false);

-- 2. Función para registrar intento de login (llamada desde edge function)
CREATE OR REPLACE FUNCTION "Colegio".record_login_attempt(p_email text, p_success boolean, p_ip text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  INSERT INTO "Colegio".login_attempts(email, success, ip_address)
  VALUES (p_email, p_success, p_ip);
END;
$$;

-- 3. Función para verificar si una cuenta está bloqueada
CREATE OR REPLACE FUNCTION "Colegio".is_account_locked(p_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER AS $$
DECLARE
  v_recent_failures integer;
BEGIN
  SELECT COUNT(*) INTO v_recent_failures
  FROM "Colegio".login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  RETURN v_recent_failures >= 5;
END;
$$;

-- 4. Función para limpiar intentos viejos (llamar desde cron)
CREATE OR REPLACE FUNCTION "Colegio".cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  DELETE FROM "Colegio".login_attempts
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;
