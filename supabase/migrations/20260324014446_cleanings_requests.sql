CREATE TYPE public.cleaning_status AS ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled');

CREATE TYPE public.media_type AS ENUM('image', 'video');

CREATE TABLE
    public.standard_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        description TEXT NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Vacuum all carpets');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Mop hard floors');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Clean bathroom surfaces');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Change bed linens');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Dust all surfaces');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Clean kitchen appliances');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Wipe down countertops');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Clean mirrors and glass');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Empty trash bins');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

DO $$
BEGIN
INSERT INTO public.standard_tasks (description) VALUES ('Clean toilet and sanitize');
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

ALTER TABLE public.standard_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything and hosts can view standard tasks" ON public.standard_tasks FOR ALL TO authenticated USING (
    public.is_not_banned ()
    AND (
        (
            (
                SELECT
                    auth.jwt ()
            ) -> 'app_metadata' ->> 'role' = 'admin'
        )
        OR (
            (
                (
                    SELECT
                        auth.jwt ()
                ) -> 'app_metadata' ->> 'role' = 'host'
            )
            AND is_active = true
        )
    )
)
WITH
    CHECK (
        public.is_not_banned ()
        AND (
            (
                SELECT
                    auth.jwt ()
            ) -> 'app_metadata' ->> 'role' = 'admin'
        )
    );

CREATE TABLE
    public.cleanings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        host_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
        property_id UUID NOT NULL REFERENCES public.properties (id) ON DELETE RESTRICT,
        cleaner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
        status public.cleaning_status NOT NULL DEFAULT 'requested',
        scheduled_start TIMESTAMPTZ NOT NULL,
        service_cost NUMERIC(10, 2),
        cleaner_pay NUMERIC(10, 2),
        information TEXT,
        stocks_included BOOLEAN DEFAULT FALSE NOT NULL,
        clock_in_time TIMESTAMPTZ,
        clock_out_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ
    );

CREATE INDEX idx_cleanings_host_id ON public.cleanings (host_id);

CREATE INDEX idx_cleanings_property_id ON public.cleanings (property_id);

CREATE INDEX idx_cleanings_cleaner_id ON public.cleanings (cleaner_id);

ALTER TABLE public.cleanings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised users can view cleanings" ON public.cleanings FOR
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
                (
                    host_id = (
                        SELECT
                            auth.uid ()
                    )
                    OR cleaner_id = (
                        SELECT
                            auth.uid ()
                    )
                )
                AND deleted_at IS NULL
            )
        )
    );

CREATE POLICY "Authorised users can insert cleanings" ON public.cleanings FOR INSERT TO authenticated
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
                host_id = (
                    SELECT
                        auth.uid ()
                )
                AND status = 'requested'::public.cleaning_status
                AND cleaner_id IS NULL
                AND clock_in_time IS NULL
                AND clock_out_time IS NULL
            )
        )
    );

CREATE POLICY "Authorised users can update cleanings" ON public.cleanings FOR
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
                host_id = (
                    SELECT
                        auth.uid ()
                )
                AND status IN ('requested', 'confirmed')
            )
            OR (
                cleaner_id = (
                    SELECT
                        auth.uid ()
                )
                AND status IN ('confirmed', 'in_progress')
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
                CASE
                    WHEN host_id = (
                        SELECT
                            auth.uid ()
                    ) THEN clock_in_time IS NULL
                    AND clock_out_time IS NULL
                    WHEN cleaner_id = (
                        SELECT
                            auth.uid ()
                    ) THEN TRUE
                    ELSE FALSE
                END
            )
        )
    );

CREATE TRIGGER set_cleanings_updated_at BEFORE
UPDATE ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column ();

CREATE TABLE
    public.cleaning_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        cleaning_id UUID NOT NULL REFERENCES public.cleanings (id) ON DELETE RESTRICT,
        description TEXT NOT NULL,
        is_custom BOOLEAN DEFAULT FALSE NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ
    );

CREATE INDEX idx_cleaning_tasks_cleaning_id ON public.cleaning_tasks (cleaning_id);

ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised users can view tasks for cleanings" ON public.cleaning_tasks FOR
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
                AND EXISTS (
                    SELECT
                        1
                    FROM
                        public.cleanings
                    WHERE
                        cleanings.id = cleaning_tasks.cleaning_id
                        AND cleanings.deleted_at IS NULL
                        AND (
                            cleanings.host_id = (
                                SELECT
                                    auth.uid ()
                            )
                            OR cleanings.cleaner_id = (
                                SELECT
                                    auth.uid ()
                            )
                        )
                )
            )
        )
    );

CREATE POLICY "Authorised users can insert cleaning tasks" ON public.cleaning_tasks FOR INSERT TO authenticated
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
                EXISTS (
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
                        AND cleanings.status IN ('requested', 'confirmed')
                        AND cleanings.deleted_at IS NULL
                )
                AND is_completed = FALSE
            )
        )
    );

CREATE POLICY "Cleaners can update task completion" ON public.cleaning_tasks FOR
UPDATE TO authenticated USING (
    public.is_not_banned ()
    AND deleted_at IS NULL
    AND EXISTS (
        SELECT
            1
        FROM
            public.cleanings
        WHERE
            cleanings.id = cleaning_tasks.cleaning_id
            AND cleanings.deleted_at IS NULL
            AND cleanings.cleaner_id = auth.uid ()
            AND cleanings.status = 'in_progress'
    )
)
WITH
    CHECK (
        public.is_not_banned ()
        AND deleted_at IS NULL
        AND EXISTS (
            SELECT
                1
            FROM
                public.cleanings
            WHERE
                cleanings.id = cleaning_tasks.cleaning_id
                AND cleanings.deleted_at IS NULL
                AND cleanings.cleaner_id = auth.uid ()
                AND cleanings.status = 'in_progress'
        )
    );

CREATE POLICY "Admins can delete cleaning tasks" ON public.cleaning_tasks FOR DELETE TO authenticated USING (
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

CREATE
OR REPLACE FUNCTION public.create_cleaning_request (
    p_property_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE
) RETURNS UUID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_cleaning_id UUID;
    v_host_id UUID;
    v_property_type TEXT;
    v_bedrooms INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = (SELECT auth.uid()) AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
    END IF;
    
    SELECT p.host_id, p.type, p.bedrooms INTO v_host_id, v_property_type, v_bedrooms
    FROM public.properties p WHERE p.id = p_property_id;
    
    INSERT INTO public.cleanings (property_id, host_id, scheduled_start, status, information, stocks_included) 
    VALUES (p_property_id, v_host_id, p_scheduled_start, 'requested', p_information, p_stocks_included)
    RETURNING id INTO v_cleaning_id;
    INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
    SELECT v_cleaning_id, description, false, false FROM standard_tasks WHERE is_active = true;
    IF p_custom_tasks IS NOT NULL THEN
        INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
        SELECT v_cleaning_id, task_desc, true, false FROM unnest(p_custom_tasks) AS task_desc;
    END IF;
    RETURN v_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.create_cleaning_request
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.create_cleaning_request TO authenticated;

CREATE
OR REPLACE FUNCTION public.update_cleaning_request (
    p_cleaning_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE
) RETURNS UUID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.cleanings WHERE id = p_cleaning_id AND host_id = (SELECT auth.uid()) AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.cleanings
    SET scheduled_start = p_scheduled_start, information = p_information, stocks_included = p_stocks_included
    WHERE id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.cleaning_tasks SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND is_custom = true;
    IF p_custom_tasks IS NOT NULL THEN
        INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
        SELECT p_cleaning_id, task_desc, true, false FROM unnest(p_custom_tasks) AS task_desc WHERE task_desc <> '';
    END IF;
    RETURN p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.update_cleaning_request
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.update_cleaning_request TO authenticated;

CREATE
OR REPLACE FUNCTION public.handle_cleaning_status_transitions () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF OLD.cleaner_id IS NULL AND NEW.cleaner_id IS NOT NULL THEN
        NEW.status := 'confirmed';
    END IF;
    IF OLD.clock_in_time IS NULL AND NEW.clock_in_time IS NOT NULL THEN
        IF NEW.clock_in_time::DATE != NEW.scheduled_start::DATE THEN
            RAISE EXCEPTION 'Cannot clock in: must be on the same day as the scheduled cleaning.';
        END IF;
        IF NEW.clock_in_time < NEW.scheduled_start - INTERVAL '10 minutes' THEN
            RAISE EXCEPTION 'Cannot clock in: can only clock in up to 10 minutes before the scheduled start time.';
        END IF;
        NEW.status := 'in_progress';
    END IF;
    IF OLD.clock_out_time IS NULL AND NEW.clock_out_time IS NOT NULL THEN
        NEW.status := 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_cleaning_timestamp_update BEFORE
UPDATE ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.handle_cleaning_status_transitions ();

REVOKE
EXECUTE ON FUNCTION public.handle_cleaning_status_transitions ()
FROM
    PUBLIC,
    anon,
    authenticated;

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

CREATE POLICY "Authorised users can view properties" ON public.properties FOR
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
                    host_id = (
                        SELECT
                            auth.uid ()
                    )
                    OR EXISTS (
                        SELECT
                            1
                        FROM
                            public.cleanings
                        WHERE
                            cleanings.property_id = properties.id
                            AND cleanings.cleaner_id = (
                                SELECT
                                    auth.uid ()
                            )
                            AND cleanings.deleted_at IS NULL
                    )
                )
            )
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

CREATE
OR REPLACE FUNCTION public.handle_soft_cascade_delete () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.cleanings 
    SET deleted_at = NEW.deleted_at 
    WHERE property_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cascade_property_delete
AFTER
UPDATE OF deleted_at ON public.properties FOR EACH ROW
EXECUTE FUNCTION public.handle_soft_cascade_delete ();

REVOKE
EXECUTE ON FUNCTION public.handle_soft_cascade_delete ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.enforce_cleaning_immutability () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('host', 'cleaner')) THEN
        IF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at) THEN
            RAISE EXCEPTION 'Cannot modify a soft-deleted record' USING ERRCODE = '42501';
        END IF;

        IF (
            NEW.id IS DISTINCT FROM OLD.id OR
            NEW.host_id IS DISTINCT FROM OLD.host_id OR
            NEW.property_id IS DISTINCT FROM OLD.property_id OR
            NEW.cleaner_id IS DISTINCT FROM OLD.cleaner_id OR
            NEW.service_cost IS DISTINCT FROM OLD.service_cost OR
            NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;

        IF ((SELECT auth.uid()) = OLD.cleaner_id AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
            RAISE EXCEPTION 'Cleaner immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleaning_immutability BEFORE
UPDATE ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.enforce_cleaning_immutability ();

REVOKE
EXECUTE ON FUNCTION public.enforce_cleaning_immutability ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.enforce_cleaning_tasks_immutability () RETURNS TRIGGER SECURITY DEFINER
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
            NEW.is_custom IS DISTINCT FROM OLD.is_custom OR
            NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleaning_tasks_immutability BEFORE
UPDATE ON public.cleaning_tasks FOR EACH ROW
EXECUTE FUNCTION public.enforce_cleaning_tasks_immutability ();

REVOKE
EXECUTE ON FUNCTION public.enforce_cleaning_tasks_immutability ()
FROM
    PUBLIC,
    anon,
    authenticated;

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

CREATE
OR REPLACE FUNCTION public.soft_delete_cleaning (p_cleaning_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_status public.cleaning_status;
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';

    IF NOT v_is_admin THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.cleanings 
            WHERE id = p_cleaning_id 
            AND host_id = (SELECT auth.uid()) 
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
        END IF;

        SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id;
        IF v_status NOT IN ('completed', 'cancelled') THEN
            RAISE EXCEPTION 'Soft delete not allowed for this status. Use cancel instead.' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    UPDATE public.cleanings SET deleted_at = now() WHERE id = p_cleaning_id;
    UPDATE public.cleaning_tasks SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.evidence_media SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.cleaning_reports SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_cleaning
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_cleaning TO authenticated;

CREATE
OR REPLACE FUNCTION public.host_cancel_cleaning (p_cleaning_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_status public.cleaning_status;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.cleanings 
        WHERE id = p_cleaning_id 
        AND host_id = (SELECT auth.uid()) 
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Unauthorised or cleaning not found' USING ERRCODE = 'P0001';
    END IF;

    SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id;

    IF v_status != 'requested' THEN
        RAISE EXCEPTION 'Cannot cancel a cleaning that is already in progress, confirmed, or completed' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleanings SET status = 'cancelled', updated_at = now() WHERE id = p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.host_cancel_cleaning
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.host_cancel_cleaning TO authenticated;

CREATE
OR REPLACE FUNCTION public.soft_delete_cleaning_task (p_task_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.cleaning_tasks t
        JOIN public.cleanings c ON t.cleaning_id = c.id
        WHERE t.id = p_task_id 
        AND c.host_id = (SELECT auth.uid()) 
        AND t.deleted_at IS NULL
    ) AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleaning_tasks SET deleted_at = now() WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_cleaning_task
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_cleaning_task TO authenticated;

CREATE
OR REPLACE FUNCTION public.soft_delete_evidence_media (p_evidence_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.evidence_media 
        WHERE id = p_evidence_id 
        AND uploader_id = (SELECT auth.uid()) 
        AND deleted_at IS NULL
    ) AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.evidence_media SET deleted_at = now() WHERE id = p_evidence_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_evidence_media
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_evidence_media TO authenticated;

CREATE
OR REPLACE FUNCTION public.soft_delete_cleaning_report (p_report_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.cleaning_reports 
        WHERE id = p_report_id 
        AND cleaner_id = (SELECT auth.uid()) 
        AND deleted_at IS NULL
    ) AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleaning_reports SET deleted_at = now() WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_cleaning_report
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_cleaning_report TO authenticated;

DROP POLICY IF EXISTS "Public profile info visible to authenticated" ON public.profiles;

CREATE POLICY "Users can view profiles based on cleaning relationship" ON public.profiles FOR
SELECT
    TO authenticated USING (
        public.is_not_banned ()
        AND (
            id = (
                SELECT
                    auth.uid ()
            )
            OR (
                (
                    SELECT
                        auth.jwt ()
                ) -> 'app_metadata' ->> 'role'
            ) = 'admin'
            OR EXISTS (
                SELECT
                    1
                FROM
                    public.cleanings c
                WHERE
                    c.deleted_at IS NULL
                    AND (
                        (
                            c.host_id = (
                                SELECT
                                    auth.uid ()
                            )
                            AND c.cleaner_id = profiles.id
                        )
                        OR (
                            c.cleaner_id = (
                                SELECT
                                    auth.uid ()
                            )
                            AND c.host_id = profiles.id
                        )
                    )
            )
        )
    );