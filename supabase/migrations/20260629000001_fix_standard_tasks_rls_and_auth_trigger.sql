-- Fix standard_tasks RLS policy to use profiles table instead of JWT claims
-- The old policy checked auth.jwt() -> 'app_metadata' ->> 'role' which is never set
-- because the handle_new_user trigger is AFTER INSERT (modifying NEW in AFTER
-- triggers has no effect). This change makes standard_tasks readable by all
-- authenticated non-banned users and restricts writes to admins via profiles table.

DROP POLICY IF EXISTS "Admins can do everything and hosts can view standard tasks" ON public.standard_tasks;

-- Anyone who is authenticated and not banned can view active standard tasks
CREATE POLICY "view_active_standard_tasks" ON public.standard_tasks
FOR SELECT TO authenticated
USING (public.is_not_banned() AND is_active = true);

-- Only admins can insert standard tasks
CREATE POLICY "admin_insert_standard_tasks" ON public.standard_tasks
FOR INSERT TO authenticated
WITH CHECK (
    public.is_not_banned()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'::public.user_role
        AND deleted_at IS NULL
    )
);

-- Only admins can update standard tasks
CREATE POLICY "admin_update_standard_tasks" ON public.standard_tasks
FOR UPDATE TO authenticated
USING (
    public.is_not_banned()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'::public.user_role
        AND deleted_at IS NULL
    )
)
WITH CHECK (
    public.is_not_banned()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'::public.user_role
        AND deleted_at IS NULL
    )
);

-- Only admins can delete standard tasks
CREATE POLICY "admin_delete_standard_tasks" ON public.standard_tasks
FOR DELETE TO authenticated
USING (
    public.is_not_banned()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'::public.user_role
        AND deleted_at IS NULL
    )
);

-- Fix handle_new_user trigger: change from AFTER to BEFORE
-- In an AFTER INSERT trigger, modifying NEW has no effect (the row is already inserted).
-- This caused raw_app_meta_data.role to never be persisted, so JWT claims never had the role,
-- breaking any RLS policies that depend on auth.jwt() -> 'app_metadata' ->> 'role'.
-- The function body stays the same; only the trigger timing changes.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
BEFORE INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user ();

-- Backfill raw_app_meta_data for existing users who are missing the role claim
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role::text)
FROM public.profiles p
WHERE p.id = auth.users.id
  AND (
    raw_app_meta_data->>'role' IS NULL
    OR raw_app_meta_data->>'role' IS DISTINCT FROM p.role::text
  );
