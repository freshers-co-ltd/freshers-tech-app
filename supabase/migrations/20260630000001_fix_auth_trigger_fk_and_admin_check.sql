DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE
OR REPLACE FUNCTION public.handle_new_user_before () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_role TEXT;
    v_is_service_role BOOLEAN;
BEGIN
    v_role := NEW.raw_user_meta_data->>'role';
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

CREATE TRIGGER on_auth_user_created_before BEFORE INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_before ();

REVOKE
EXECUTE ON FUNCTION public.handle_new_user_before ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.handle_new_user_after () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        (NEW.raw_user_meta_data->>'role')::public.user_role
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created_after
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_after ();

REVOKE
EXECUTE ON FUNCTION public.handle_new_user_after ()
FROM
    PUBLIC,
    anon,
    authenticated;

DROP FUNCTION IF EXISTS public.handle_new_user ();