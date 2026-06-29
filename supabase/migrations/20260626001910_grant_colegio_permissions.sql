-- Grant schema usage to roles
GRANT USAGE ON SCHEMA "Colegio" TO anon, authenticated, service_role;

-- Grant table permissions for anon (read-only)
GRANT SELECT ON ALL TABLES IN SCHEMA "Colegio" TO anon;

-- Grant table permissions for authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "Colegio" TO authenticated;

-- Grant table permissions for service_role (full access)
GRANT ALL ON ALL TABLES IN SCHEMA "Colegio" TO service_role;

-- Grant sequence permissions (for any future serial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA "Colegio" TO anon, authenticated, service_role;

-- Ensure future tables also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA "Colegio" GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA "Colegio" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "Colegio" GRANT ALL ON TABLES TO service_role;
