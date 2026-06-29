-- Añadir columna para hash de PIN seguro
ALTER TABLE "Colegio".profiles 
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Comentario para documentar el propósito
COMMENT ON COLUMN "Colegio".profiles.pin_hash 
  IS 'Hash SHA-256 con salt del PIN de autenticación (formato: sha256:<salt_hex>:<hash_hex>)';

-- Actualizar función login_with_pin para verificar hash personalizado
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
  -- Primero intentar verificar con el nuevo sistema de hash
  SELECT * INTO v_profile FROM "Colegio".profiles 
  WHERE pin_hash IS NOT NULL AND pin_hash LIKE 'sha256:%';
  
  IF FOUND THEN
    -- Extraer componentes del hash
    hex_salt := split_part(v_profile.pin_hash, ':', 2);
    hex_hash := split_part(v_profile.pin_hash, ':', 3);
    
    -- Convertir hex salt a bytes
    salt_bytes := '';
    FOR i IN 1..length(hex_salt)/2 LOOP
      byte_val := ('x' || substr(hex_salt, (i-1)*2 + 1, 2))::bit(8)::int;
      salt_bytes := salt_bytes || chr(byte_val);
    END LOOP;
    
    -- Crear entrada: salt + PIN
    input_bytes := salt_bytes || convert(p_pin, 'UTF8');
    
    -- Calcular hash SHA-256
    SELECT digest(input_bytes, 'sha256') INTO hash_bytes;
    
    -- Convertir hash calculado a hex
    SELECT encode(hash_bytes, 'hex') INTO computed_hash;
    
    -- Comparar hashes
    IF computed_hash = hex_hash THEN
      -- Hash coincide, continuar con validación de cuenta
    ELSE
      -- Hash no coincide, intentar con método legado (PIN en texto plano)
      SELECT * INTO v_profile FROM "Colegio".profiles 
      WHERE pin = p_pin AND pin_hash IS NULL
      LIMIT 1;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'PIN_INVALIDO';
      END IF;
    END IF;
  ELSE
    -- No hay hashes nuevos, usar método legado (PIN en texto plano)
    SELECT * INTO v_profile FROM "Colegio".profiles 
    WHERE pin = p_pin
    LIMIT 1;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PIN_INVALIDO';
    END IF;
  END IF;
  
  -- Verificar que la cuenta no esté bloqueada
  IF v_profile.is_blocked THEN
    RAISE EXCEPTION 'CUENTA_BLOQUEADA';
  END IF;
  
  -- Verificar que el usuario exista en auth.users
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
GRANT EXECUTE ON FUNCTION "Colegio".login_with_pin TO authenticated;