CREATE TYPE public.user_role AS ENUM ('cleaner', 'host', 'admin');

CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT UNIQUE,
    role public.user_role NOT NULL DEFAULT 'cleaner',
    is_verified BOOLEAN DEFAULT FALSE,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile and admins can view all" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (
    (SELECT auth.uid()) = id 
    OR 
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Users can update their own profile and admins can update all" 
ON public.profiles
FOR UPDATE 
TO authenticated
USING (
    (SELECT auth.uid()) = id 
    OR 
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
    (SELECT auth.uid()) = id 
    OR 
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_modified_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
SECURITY DEFINER
SET search_path = public 
AS $$ 
DECLARE 
    v_role TEXT;
    v_is_admin_action BOOLEAN;
BEGIN
    v_role := NEW.raw_user_meta_data->>'role';

    v_is_admin_action := (current_setting('role', true) = 'service_role');

    IF v_role = 'admin' AND NOT v_is_admin_action THEN
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
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT 
    id, 
    full_name, 
    avatar_url,
    role
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.handle_user_update() 
RETURNS trigger 
SECURITY DEFINER
SET search_path = public 
AS $$
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
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();