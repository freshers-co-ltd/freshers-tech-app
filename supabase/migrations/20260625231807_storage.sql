CREATE POLICY "Cleaners can upload evidence to assigned cleaning folders" ON STORAGE.objects FOR INSERT TO authenticated
WITH
    CHECK (
        public.is_not_banned ()
        AND bucket_id = 'cleaning-media'
        AND EXISTS (
            SELECT
                1
            FROM
                public.cleanings
            WHERE
                cleanings.id::TEXT = (STORAGE.foldername (NAME)) [1]
                AND cleanings.cleaner_id = (
                    SELECT
                        auth.uid ()
                )
                AND cleanings.deleted_at IS NULL
        )
    );

CREATE POLICY "Authorised users can view property media" ON STORAGE.objects FOR
SELECT
    TO authenticated USING (
        public.is_not_banned ()
        AND bucket_id = 'property-media'
        AND (
            (
                (
                    (
                        SELECT
                            auth.jwt ()
                    ) -> 'app_metadata' ->> 'role'
                ) = 'admin'
                OR EXISTS (
                    SELECT
                        1
                    FROM
                        public.properties p
                        LEFT JOIN public.cleanings c ON c.property_id = p.id
                    WHERE
                        p.host_id::TEXT = (STORAGE.foldername (STORAGE.objects.name)) [1]
                        AND p.deleted_at IS NULL
                        AND (
                            p.host_id = (
                                SELECT
                                    auth.uid ()
                            )
                            OR (
                                c.cleaner_id = (
                                    SELECT
                                        auth.uid ()
                                )
                                AND c.deleted_at IS NULL
                            )
                        )
                )
            )
        )
    );

CREATE POLICY "Authorised users can view cleaning evidence" ON STORAGE.objects FOR
SELECT
    TO authenticated USING (
        public.is_not_banned ()
        AND bucket_id = 'cleaning-media'
        AND EXISTS (
            SELECT
                1
            FROM
                public.cleanings c
                LEFT JOIN public.properties p ON p.id = c.property_id
            WHERE
                c.id::TEXT = (STORAGE.foldername (NAME)) [1]
                AND c.deleted_at IS NULL
                AND (
                    c.cleaner_id = (
                        SELECT
                            auth.uid ()
                    )
                    OR p.host_id = (
                        SELECT
                            auth.uid ()
                    )
                    OR (
                        SELECT
                            auth.jwt () -> 'app_metadata' ->> 'role'
                    ) = 'admin'
                )
        )
    );

CREATE POLICY "Admins can manage cleaning evidence" ON STORAGE.objects FOR ALL TO authenticated USING (
    public.is_not_banned ()
    AND bucket_id = 'cleaning-media'
    AND (
        SELECT
            auth.jwt () -> 'app_metadata' ->> 'role'
    ) = 'admin'
);
