CREATE TABLE
    public.evidence_media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        cleaning_id UUID NOT NULL REFERENCES public.cleanings (id) ON DELETE RESTRICT,
        uploader_id UUID NOT NULL REFERENCES public.profiles (id),
        media_url TEXT NOT NULL,
        TYPE public.media_type NOT NULL DEFAULT 'image',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
    );

ALTER TABLE public.evidence_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised users can view cleaning evidence" ON public.evidence_media FOR
SELECT
    TO authenticated USING (
        public.is_not_banned ()
        AND (
            (
                (
                    SELECT
                        auth.jwt ()
                ) -> 'app_metadata' ->> 'role'
            ) = 'admin'
            OR (
                deleted_at IS NULL
                AND (
                    uploader_id = (
                        SELECT
                            auth.uid ()
                    )
                    OR EXISTS (
                        SELECT
                            1
                        FROM
                            public.cleanings
                        WHERE
                            cleanings.id = evidence_media.cleaning_id
                            AND cleanings.host_id = (
                                SELECT
                                    auth.uid ()
                            )
                            AND cleanings.deleted_at IS NULL
                    )
                )
            )
        )
    );

CREATE POLICY "Authorised users can insert cleaning evidence" ON public.evidence_media FOR INSERT TO authenticated
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
                uploader_id = (
                    SELECT
                        auth.uid ()
                )
            )
        )
    );

CREATE POLICY "Authorised users can update cleaning evidence" ON public.evidence_media FOR
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
            uploader_id = (
                SELECT
                    auth.uid ()
            )
            AND EXISTS (
                SELECT
                    1
                FROM
                    public.cleanings
                WHERE
                    cleanings.id = evidence_media.cleaning_id
                    AND cleanings.status = 'in_progress'
                    AND cleanings.deleted_at IS NULL
            )
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
                uploader_id = (
                    SELECT
                        auth.uid ()
                )
            )
        )
    );

CREATE POLICY "Authorised users can delete cleaning evidence" ON public.evidence_media FOR DELETE TO authenticated USING (
    public.is_not_banned ()
    AND (
        (
            (
                SELECT
                    auth.jwt ()
            ) -> 'app_metadata' ->> 'role'
        ) = 'admin'
    )
);

CREATE TABLE
    public.cleaning_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        cleaning_id UUID NOT NULL REFERENCES public.cleanings (id) ON DELETE RESTRICT UNIQUE,
        cleaner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
        broken_items_report TEXT,
        low_supplies_report TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ
    );

CREATE INDEX idx_cleaning_reports_cleaning_id ON public.cleaning_reports (cleaning_id);

CREATE INDEX idx_cleaning_reports_cleaner_id ON public.cleaning_reports (cleaner_id);

ALTER TABLE public.cleaning_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised users can view cleaning reports" ON public.cleaning_reports FOR
SELECT
    TO authenticated USING (
        public.is_not_banned ()
        AND (
            (
                (
                    SELECT
                        auth.jwt ()
                ) -> 'app_metadata' ->> 'role'
            ) = 'admin'
            OR (
                deleted_at IS NULL
                AND (
                    cleaner_id = (
                        SELECT
                            auth.uid ()
                    )
                    OR EXISTS (
                        SELECT
                            1
                        FROM
                            public.cleanings
                        WHERE
                            cleanings.id = cleaning_id
                            AND cleanings.host_id = (
                                SELECT
                                    auth.uid ()
                            )
                            AND cleanings.deleted_at IS NULL
                    )
                )
            )
        )
    );

CREATE POLICY "Authorised users can insert cleaning reports" ON public.cleaning_reports FOR INSERT TO authenticated
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
                cleaner_id = (
                    SELECT
                        auth.uid ()
                )
                AND EXISTS (
                    SELECT
                        1
                    FROM
                        public.cleanings
                    WHERE
                        cleanings.id = cleaning_id
                        AND cleanings.cleaner_id = (
                            SELECT
                                auth.uid ()
                        )
                        AND cleanings.status = 'in_progress'
                        AND cleanings.deleted_at IS NULL
                )
            )
        )
    );

CREATE POLICY "Authorised users can update cleaning reports" ON public.cleaning_reports FOR
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
            cleaner_id = (
                SELECT
                    auth.uid ()
            )
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
                cleaner_id = (
                    SELECT
                        auth.uid ()
                )
            )
        )
    );

CREATE
OR REPLACE FUNCTION public.enforce_evidence_media_immutability () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('host', 'cleaner')) THEN
        IF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at) THEN
            RAISE EXCEPTION 'Modification of soft-deleted record prohibited' USING ERRCODE = '42501';
        END IF;

        IF (
            NEW.id IS DISTINCT FROM OLD.id OR
            NEW.cleaning_id IS DISTINCT FROM OLD.cleaning_id OR
            NEW.uploader_id IS DISTINCT FROM OLD.uploader_id OR
            NEW.created_at IS DISTINCT FROM OLD.created_at OR
            NEW.media_url IS DISTINCT FROM OLD.media_url OR
            NEW.type IS DISTINCT FROM OLD.type
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_evidence_media_immutability BEFORE
UPDATE ON public.evidence_media FOR EACH ROW
EXECUTE FUNCTION public.enforce_evidence_media_immutability ();

REVOKE
EXECUTE ON FUNCTION public.enforce_evidence_media_immutability ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.enforce_cleaning_reports_immutability () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('host', 'cleaner')) THEN
        IF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at) THEN
            RAISE EXCEPTION 'Modification of soft-deleted record prohibited' USING ERRCODE = '42501';
        END IF;

        IF (
            NEW.id IS DISTINCT FROM OLD.id OR
            NEW.cleaning_id IS DISTINCT FROM OLD.cleaning_id OR
            NEW.cleaner_id IS DISTINCT FROM OLD.cleaner_id OR
            NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleaning_reports_immutability BEFORE
UPDATE ON public.cleaning_reports FOR EACH ROW
EXECUTE FUNCTION public.enforce_cleaning_reports_immutability ();

REVOKE
EXECUTE ON FUNCTION public.enforce_cleaning_reports_immutability ()
FROM
    PUBLIC,
    anon,
    authenticated;

GRANT
SELECT
    ON public.evidence_media TO authenticated;

GRANT
SELECT
    ON public.cleaning_reports TO authenticated;

GRANT INSERT,
DELETE ON public.evidence_media TO authenticated;

GRANT INSERT,
UPDATE ON public.cleaning_reports TO authenticated;
