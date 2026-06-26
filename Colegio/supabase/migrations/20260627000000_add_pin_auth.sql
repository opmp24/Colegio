-- Agregar columnas para autenticación por PIN
ALTER TABLE "Colegio".profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS pin TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Actualizar constraint de role: admin, profesor, usuario
ALTER TABLE "Colegio".profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE "Colegio".profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'profesor', 'usuario'));

-- Migrar roles existentes
UPDATE "Colegio".profiles SET role = 'usuario' WHERE role IN ('student', 'parent');
UPDATE "Colegio".profiles SET role = 'profesor' WHERE role = 'teacher';

-- Actualizar trigger auto-creación de perfil con nuevos roles
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
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'usuario')
  );
  RETURN NEW;
END;
$$;

-- RPC: login con PIN (SECURITY DEFINER, bypass RLS)
CREATE OR REPLACE FUNCTION "Colegio".login_with_pin(p_pin TEXT)
RETURNS TABLE (auth_email TEXT, user_id UUID, full_name TEXT, role TEXT, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile "Colegio".profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM "Colegio".profiles WHERE pin = p_pin;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PIN_INVALIDO';
  END IF;

  IF v_profile.is_blocked THEN
    RAISE EXCEPTION 'CUENTA_BLOQUEADA';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_profile.id) THEN
    RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
  END IF;

  RETURN QUERY
  SELECT 
    au.email::TEXT AS auth_email,
    v_profile.id,
    v_profile.full_name,
    v_profile.role,
    v_profile.is_blocked
  FROM auth.users au
  WHERE au.id = v_profile.id;
END;
$$;

-- Permitir que anon ejecute login_with_pin (necesario para login)
GRANT EXECUTE ON FUNCTION "Colegio".login_with_pin TO anon;

-- Permitir que authenticated también lo ejecute (por si acaso)
GRANT EXECUTE ON FUNCTION "Colegio".login_with_pin TO authenticated;

-- Política RLS: todos los autenticados pueden leer profiles (sin pin)
DROP POLICY IF EXISTS read_profiles ON "Colegio".profiles;
CREATE POLICY read_profiles ON "Colegio".profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política RLS: solo admin puede actualizar profiles
DROP POLICY IF EXISTS admin_all ON "Colegio".profiles;
CREATE POLICY admin_all ON "Colegio".profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM "Colegio".profiles WHERE id = auth.uid() AND role = 'admin'));
