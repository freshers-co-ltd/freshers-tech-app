-- Fix handle_new_user trigger: split into BEFORE (validate role, set metadata)
-- and AFTER (insert into profiles, which needs the auth.users row to exist).
--
-- Bug 1: The previous BEFORE trigger (from 20260629000001) inserted into
--        public.profiles before the auth.users row was committed, causing FK
--        violation 23503: Key (id) not present in table "users" (actually auth.users).
--        AFTER trigger runs after the row exists, so the FK is satisfied.
--
-- Bug 2: current_setting('role') is set by the connection pooler for REST API
--        calls, but GoTrue connects directly to the DB -- this GUC is never set.
--        Added current_user as a fallback: in a SECURITY DEFINER function,
--        current_user is the function owner (postgres), which is a superuser
--        and should be allowed to create admin accounts.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ── BEFORE trigger: validate role + set raw_app_meta_data ──

CREATE OR REPLACE FUNCTION public.handle_new_user_before ()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_is_service_role BOOLEAN;
BEGIN
    v_role := NEW.raw_user_meta_data->>'role';
    -- current_setting('role') is set by the connection pooler for REST API calls.
    -- current_user is the function owner (postgres in Supabase) when SECURITY DEFINER.
    -- Together, both paths (REST and GoTrue direct) are covered.
    v_is_service_role := current_setting('role', true) IN ('service_role', 'supabase_auth_admin', 'postgres')
                         OR current_user IN ('service_role', 'supabase_auth_admin', 'postgres');

    IF v_role = 'admin' AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Signup failed: Only admins can create admin accounts.';
    ELSIF v_role IS NULL OR v_role NOT IN ('host', 'cleaner', 'admin') THEN
        RAISE EXCEPTION 'Signup failed: Invalid or missing role.';
    END IF;

    NEW.raw_app_meta_data = jsonb_set(
        COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(v_role)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created_before
BEFORE INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_before ();

REVOKE EXECUTE ON FUNCTION public.handle_new_user_before () FROM PUBLIC, anon, authenticated;

-- ── AFTER trigger: insert into profiles (FK to auth.users now satisfied) ──

CREATE OR REPLACE FUNCTION public.handle_new_user_after ()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        (NEW.raw_user_meta_data->>'role')::public.user_role
    );
    RETURN NULL; -- AFTER trigger return value is ignored
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created_after
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_after ();

REVOKE EXECUTE ON FUNCTION public.handle_new_user_after () FROM PUBLIC, anon, authenticated;

-- The original function is no longer used but keep it for reference; it will be
-- replaced on next deploy.  Drop it to avoid confusion.
DROP FUNCTION IF EXISTS public.handle_new_user ();
