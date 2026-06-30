-- Versión de prueba de login_with_pin usando decode() incorporada
DROP FUNCTION IF EXISTS "Colegio".login_with_pin_test(text);
CREATE OR REPLACE FUNCTION "Colegio".login_with_pin_test(p_pin TEXT)
RETURNS TABLE (auth_email TEXT, user_id UUID, full_name TEXT, role TEXT, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile "Colegio".profiles".profiles%ROWTYPE;
  salt TEXT;
 
    bytea;
  decoded_salt BYTEA;
  computed_hash BYTEA;
  hex_hash TEXT;
BEGIN
  -- Buscar en todos los perfiles con pin_hash
  FOR v_profile IN SELECT * FROM "Colegio".profiles WHERE pin_hash IS NOT NULL LOOP
    -- Extraer componentes del hash usando split_part
    -- Formato esperado: sha256:<salt_hex>:<hash_hex>
    DECLARE
      parts TEXT[] := string_to_array(v_profile.pin_hash, ':');
    BEGIN
      IF array_length(parts, 1) <> 3 OR parts[1] <> 'sha256' THEN
        CONTINUE; -- Saltar formato inválido
      END IF;
      
      decoded_salt := decode(parts[2], 'hex');
      hex_hash := parts[3];
      
      -- Calcular hash: SHA256(salt + PIN)
      computed_hash := digest(decoded_salt || p_pin::bytea, 'sha256');
      
      -- Comparar
      IF encode(computed_hash, 'hex') = hex_hash THEN
        -- Encontrado coincidencia
        IF v_profile.is_blocked THEN
          RAISE EXCEPTION 'CUENTA_BLOQUEADA';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_profile.id) THEN
          RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
        END IF;
        RETURN QUERY
        SELECT au.email::TEXT, v_profile.id, v_profile.full_name, v_profile.role, v_profile.is_blocked
        FROM auth.users au
        WHERE au.id = v_profile.id;
        RETURN;
      END IF;
    END;
  END LOOP;
  
  -- Fallback legado: buscar por PIN en texto plano
  SELECT * INTO v_profile FROM "Colegio".profiles WHERE pin = p_pin LIMIT 1;
  IF FOUND THEN
    IF v_profile.is_blocked THEN
      RAISE EXCEPTION 'CUENTA_BLOQUEADA';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_profile.id) THEN
      RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
    END IF;
    RETURN QUERY
    SELECT au.email::TEXT, v_profile.id, v_profile.full_name, v_profile.role, v_profile.is_blocked
    FROM auth.users au
    WHERE au.id = v_profile.id;
    RETURN;
  END IF;
  
  RAISE EXCEPTION 'PIN_INVALIDO';
END;
$$;

-- Probar la función de prueba
SELECT * FROM "Colegio".login_with_pin_test('43805952');