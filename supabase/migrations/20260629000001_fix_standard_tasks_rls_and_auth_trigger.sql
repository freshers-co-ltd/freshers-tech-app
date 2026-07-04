DROP POLICY IF EXISTS "Admins can do everything and hosts can view standard tasks" ON public.standard_tasks;

CREATE POLICY "view_active_standard_tasks" ON public.standard_tasks FOR
SELECT
    TO authenticated USING (
        public.is_not_banned ()
        AND is_active = true
    );

CREATE POLICY "admin_insert_standard_tasks" ON public.standard_tasks FOR INSERT TO authenticated
WITH
    CHECK (
        public.is_not_banned ()
        AND EXISTS (
            SELECT
                1
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
                AND role = 'admin'::public.user_role
                AND deleted_at IS NULL
        )
    );

CREATE POLICY "admin_update_standard_tasks" ON public.standard_tasks FOR
UPDATE TO authenticated USING (
    public.is_not_banned ()
    AND EXISTS (
        SELECT
            1
        FROM
            public.profiles
        WHERE
            id = auth.uid ()
            AND role = 'admin'::public.user_role
            AND deleted_at IS NULL
    )
)
WITH
    CHECK (
        public.is_not_banned ()
        AND EXISTS (
            SELECT
                1
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
                AND role = 'admin'::public.user_role
                AND deleted_at IS NULL
        )
    );

CREATE POLICY "admin_delete_standard_tasks" ON public.standard_tasks FOR DELETE TO authenticated USING (
    public.is_not_banned ()
    AND EXISTS (
        SELECT
            1
        FROM
            public.profiles
        WHERE
            id = auth.uid ()
            AND role = 'admin'::public.user_role
            AND deleted_at IS NULL
    )
);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created BEFORE INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user ();

UPDATE auth.users
SET
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role::text)
FROM
    public.profiles p
WHERE
    p.id = auth.users.id
    AND (
        raw_app_meta_data ->> 'role' IS NULL
        OR raw_app_meta_data ->> 'role' IS DISTINCT
        FROM
            p.role::text
    );