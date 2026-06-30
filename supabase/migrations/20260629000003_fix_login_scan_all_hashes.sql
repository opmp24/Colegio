-- Fix: login_with_pin ahora escanea TODOS los perfiles con pin_hash
-- para encontrar una coincidencia, en lugar de solo tomar el primero
-- Ver también: 20260629000002_add_pin_hash.sql (migración original con bug)

DROP FUNCTION IF EXISTS "Colegio".login_with_pin(text);
CREATE OR REPLACE FUNCTION "Colegio".login_with_pin(p_pin TEXT)
RETURNS TABLE (auth_email TEXT, user_id UUID, full_name TEXT, role TEXT, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile "Colegio".profiles%ROWTYPE;
  hex_salt TEXT;
  hex_hash TEXT;
  computed_hash TEXT;
  i INTEGER;
  byte_val INTEGER;
  salt_bytes BYTEA;
  input_bytes BYTEA;
  hash_bytes BYTEA;
BEGIN
  -- Escanear todos los perfiles con pin_hash buscando coincidencia
  FOR v_profile IN SELECT * FROM "Colegio".profiles WHERE pin_hash IS NOT NULL LOOP
    hex_salt := split_part(v_profile.pin_hash, ':', 2);
    hex_hash := split_part(v_profile.pin_hash, ':', 3);
    
    salt_bytes := '';
    FOR i IN 1..length(hex_salt)/2 LOOP
      byte_val := ('x' || substr(hex_salt, (i-1)*2 + 1, 2))::bit(8)::int;
      salt_bytes := salt_bytes || chr(byte_val);
    END LOOP;
    
    input_bytes := salt_bytes || convert(p_pin, 'UTF8');
    SELECT digest(input_bytes, 'sha256') INTO hash_bytes;
    SELECT encode(hash_bytes, 'hex') INTO computed_hash;
    
    IF computed_hash = hex_hash THEN
      IF v_profile.is_blocked THEN
        RAISE EXCEPTION 'CUENTA_BLOQUEADA';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_profile.id) THEN
        RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
      END IF;
      RETURN QUERY
      SELECT au.email::TEXT, v_profile.id, v_profile.full_name, v_profile.role, v_profile.is_blocked
      FROM auth.users au WHERE au.id = v_profile.id;
      RETURN;
    END IF;
  END LOOP;

  -- Fallback legado: buscar por PIN en texto plano
  SELECT * INTO v_profile FROM "Colegio".profiles WHERE pin = p_pin LIMIT 1;
  IF FOUND THEN
    IF v_profile.is_blocked THEN RAISE EXCEPTION 'CUENTA_BLOQUEADA'; END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_profile.id) THEN
      RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
    END IF;
    RETURN QUERY
    SELECT au.email::TEXT, v_profile.id, v_profile.full_name, v_profile.role, v_profile.is_blocked
    FROM auth.users au WHERE au.id = v_profile.id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'PIN_INVALIDO';
END;
$$;

GRANT EXECUTE ON FUNCTION "Colegio".login_with_pin TO anon;
GRANT EXECUTE ON FUNCTION "Colegio".login_with_pin TO authenticated;