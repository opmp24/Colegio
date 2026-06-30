-- Fix login_with_pin function to properly verify PIN hashes
DROP FUNCTION IF EXISTS "Colegio".login_with_pin(text);

CREATE OR REPLACE FUNCTION "Colegio".login_with_pin(p_pin TEXT)
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
    -- Scan all profiles with password hashes
    FOR v_profile IN SELECT * FROM "Colegio".profiles WHERE pin_hash IS NOT NULL LOOP
        -- Split by ':' to get components
        parts := string_to_array(v_profile.pin_hash, ':');
        
        -- Validate format: sha256:<salt_hex>:<hash_hex>
        IF array_length(parts, 1) <> 3 OR parts[1] <> 'sha256' THEN
            CONTINUE; -- Skip to next profile
        END IF;
        
        -- Decode salt from hex to bytes
        salt_bytes := decode(parts[2], 'hex');
        expected_hash_hex := parts[3];
        
        -- Calculate SHA256(salt + PIN)
        hash_bytes := extensions.digest(salt_bytes || p_pin::bytea, 'sha256');
        computed_hash_hex := encode(hash_bytes, 'hex');
        
        -- Compare hashes
        IF computed_hash_hex = expected_hash_hex THEN
            -- Match found!
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
            RETURN; -- Exit function after finding match
        END IF;
    END LOOP;
    
    -- If no hash match found, try legacy plain text PIN (for migration)
    SELECT * INTO v_profile FROM "Colegio".profiles 
    WHERE pin = p_pin
    LIMIT 1;
    
    IF FOUND THEN
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
        RETURN;
    END IF;
    
    -- If we get here, no user was found
    RAISE EXCEPTION 'PIN_INVALIDO';
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION "Colegio".login_with_pin(text) TO anon, authenticated;
