CREATE TYPE public.cleaning_status AS ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled');

CREATE TYPE public.media_type AS ENUM('image', 'video');

CREATE TABLE
    public.standard_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        description TEXT NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

INSERT INTO
    public.standard_tasks (description)
VALUES
    ('Vacuum all carpets'),
    ('Mop hard floors'),
    ('Clean bathroom surfaces'),
    ('Change bed linens'),
    ('Dust all surfaces'),
    ('Clean kitchen appliances'),
    ('Wipe down countertops'),
    ('Clean mirrors and glass'),
    ('Empty trash bins'),
    ('Clean toilet and sanitise') ON CONFLICT (description)
DO NOTHING;

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

GRANT
SELECT
    ON public.cleanings TO authenticated;

GRANT
SELECT
    ON public.cleaning_tasks TO authenticated;

GRANT
SELECT
    ON public.standard_tasks TO authenticated;

GRANT INSERT,
UPDATE,
DELETE ON public.cleaning_tasks TO authenticated;

GRANT
UPDATE,
DELETE ON public.cleanings TO authenticated;