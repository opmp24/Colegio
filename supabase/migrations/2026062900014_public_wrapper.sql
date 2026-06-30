CREATE OR REPLACE FUNCTION public.login_with_pin(p_pin TEXT)
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
    SELECT * FROM "Colegio".login_with_pin(p_pin);
$$;

GRANT EXECUTE ON FUNCTION public.login_with_pin(text) TO anon, authenticated;
