CREATE TYPE public.user_role AS ENUM('cleaner', 'host', 'admin');

CREATE TABLE
    public.profiles (
        id UUID REFERENCES auth.users ON DELETE RESTRICT NOT NULL PRIMARY KEY,
        email TEXT,
        role public.user_role NOT NULL DEFAULT 'cleaner',
        is_verified BOOLEAN DEFAULT FALSE,
        full_name TEXT,
        avatar_url TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen_at TIMESTAMP WITH TIME ZONE
    );

CREATE UNIQUE INDEX profiles_email_idx ON public.profiles (email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE
OR REPLACE FUNCTION public.is_not_banned () RETURNS BOOLEAN SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = (auth.uid())::UUID
    AND banned_until > now()
  );
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.is_not_banned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_not_banned() TO authenticated;

CREATE
OR REPLACE FUNCTION public.update_modified_column () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column ();

REVOKE EXECUTE ON FUNCTION public.update_modified_column() FROM PUBLIC, anon, authenticated;

CREATE
OR REPLACE FUNCTION public.enforce_profiles_immutability () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('host', 'cleaner')) THEN
        IF (
            NEW.id IS DISTINCT FROM OLD.id OR
            NEW.email IS DISTINCT FROM OLD.email OR
            NEW.role IS DISTINCT FROM OLD.role OR
            NEW.is_verified IS DISTINCT FROM OLD.is_verified
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_immutability BEFORE
UPDATE ON public.profiles FOR EACH ROW
EXECUTE FUNCTION public.enforce_profiles_immutability ();

REVOKE EXECUTE ON FUNCTION public.enforce_profiles_immutability() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Users can update their own profile and admins can update all" ON public.profiles FOR
UPDATE TO authenticated USING (
    public.is_not_banned ()
    AND (
        (
            (
                SELECT
                    auth.jwt ()
            ) -> 'app_metadata' ->> 'role'
        ) = 'admin'
        OR (
            (
                SELECT
                    auth.uid ()
            ) = id
        )
    )
)
WITH
    CHECK (
        public.is_not_banned ()
        AND (
            (
                (
                    SELECT
                        auth.jwt ()
                ) -> 'app_metadata' ->> 'role'
            ) = 'admin'
            OR (
                SELECT
                    auth.uid ()
            ) = id
        )
    );

CREATE
OR REPLACE FUNCTION public.handle_new_user () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_role TEXT;
    v_is_service_role BOOLEAN;
BEGIN
    v_role := NEW.raw_user_meta_data->>'role';
    v_is_service_role := current_setting('role', true) IN ('service_role', 'supabase_auth_admin', 'postgres');

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

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        v_role::public.user_role
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user ();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE VIEW
    public.profiles_public AS
SELECT
    id,
    full_name,
    avatar_url,
    role
FROM
    public.profiles;

GRANT
SELECT
    ON public.profiles_public TO authenticated;

ALTER VIEW public.profiles_public SET (security_invoker = true);

GRANT SELECT (id, full_name, avatar_url, role) ON public.profiles TO authenticated;

CREATE POLICY "Public profile info visible to authenticated" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE
OR REPLACE FUNCTION public.handle_user_update () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    full_name = NEW.raw_user_meta_data->>'full_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url'
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_updated
AFTER
UPDATE ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_user_update ();

REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Users can upload their own avatar" ON STORAGE.objects FOR INSERT TO authenticated
WITH
    CHECK (
        public.is_not_banned ()
        AND bucket_id = 'avatars'
        AND (STORAGE.foldername (NAME)) [1] = (SELECT auth.uid ())::TEXT
    );

CREATE POLICY "Users can update their own avatar" ON STORAGE.objects FOR
UPDATE TO authenticated USING (
    public.is_not_banned ()
    AND bucket_id = 'avatars'
    AND (STORAGE.foldername (NAME)) [1] = (SELECT auth.uid ())::TEXT
)
WITH
    CHECK (public.is_not_banned ());