-- Migrar login_with_pin para usar email + PIN en lugar de solo PIN
-- Busca por email primero (identifica al usuario), luego verifica el hash

DROP FUNCTION IF EXISTS public.login_with_pin(text);
DROP FUNCTION IF EXISTS "Colegio".login_with_pin(text);

CREATE OR REPLACE FUNCTION "Colegio".login_with_pin(p_email TEXT, p_pin TEXT)
RETURNS TABLE (
    auth_email TEXT,
    user_id UUID,
    full_name TEXT,
    role TEXT,
    is_blocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '', extensions
AS $$
DECLARE
    v_profile "Colegio".profiles%ROWTYPE;
    parts TEXT[];
    salt_bytes BYTEA;
    hash_bytes BYTEA;
    computed_hash_hex TEXT;
    expected_hash_hex TEXT;
BEGIN
    -- Buscar perfil por email (identifica al usuario)
    SELECT * INTO v_profile FROM "Colegio".profiles 
    WHERE email = p_email
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PIN_INVALIDO';
    END IF;

    -- Verificar si la cuenta está bloqueada
    IF v_profile.is_blocked THEN
        RAISE EXCEPTION 'CUENTA_BLOQUEADA';
    END IF;

    -- Verificar que exista en auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_profile.id) THEN
        RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
    END IF;

    -- Verificar pin_hash (salted SHA-256)
    IF v_profile.pin_hash IS NOT NULL THEN
        parts := string_to_array(v_profile.pin_hash, ':');

        IF array_length(parts, 1) = 3 AND parts[1] = 'sha256' THEN
            salt_bytes := decode(parts[2], 'hex');
            expected_hash_hex := parts[3];

            hash_bytes := digest(salt_bytes || p_pin::bytea, 'sha256');
            computed_hash_hex := encode(hash_bytes, 'hex');

            IF computed_hash_hex = expected_hash_hex THEN
                RETURN QUERY
                SELECT 
                    au.email::TEXT AS auth_email,
                    v_profile.id,
                    v_profile.full_name,
                    v_profile.role,
                    v_profile.is_blocked
                FROM auth.users au
                WHERE au.id = v_profile.id;
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Fallback a legacy plain text PIN (para migración)
    IF v_profile.pin IS NOT NULL AND v_profile.pin = p_pin THEN
        RETURN QUERY
        SELECT 
            au.email::TEXT AS auth_email,
            v_profile.id,
            v_profile.full_name,
            v_profile.role,
            v_profile.is_blocked
        FROM auth.users au
        WHERE au.id = v_profile.id;
        RETURN;
    END IF;

    -- Sin match
    RAISE EXCEPTION 'PIN_INVALIDO';
END;
$$;

-- Wrapper en public para acceso vía RPC
CREATE OR REPLACE FUNCTION public.login_with_pin(p_email TEXT, p_pin TEXT)
RETURNS TABLE (
    auth_email TEXT,
    user_id UUID,
    full_name TEXT,
    role TEXT,
    is_blocked BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM "Colegio".login_with_pin(p_email, p_pin);
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION "Colegio".login_with_pin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_with_pin(text, text) TO anon, authenticated;
