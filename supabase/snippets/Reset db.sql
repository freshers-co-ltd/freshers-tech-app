-- Disable foreign key checks to allow truncation
SET session_replication_role = 'replica';

-- Truncate all tables in  public schema
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
    ) LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;
END $$;

TRUNCATE auth.users CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';