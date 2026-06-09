-- Create fallback roles for when schema parameter is missing from connection string
-- These roles prevent the "role anon_ does not exist" error
-- This is a permanent fix that works regardless of the SUDA_DATABASE_URL format

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon_') THEN
    CREATE ROLE anon_ WITH NOINHERIT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated_') THEN
    CREATE ROLE authenticated_ WITH NOINHERIT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role_') THEN
    CREATE ROLE service_role_ WITH NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon_, authenticated_, service_role_;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon_, authenticated_, service_role_;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon_, authenticated_, service_role_;

-- Grant appuser ability to SET ROLE to these roles
GRANT anon_ TO appuser;
GRANT authenticated_ TO appuser;
GRANT service_role_ TO appuser;
