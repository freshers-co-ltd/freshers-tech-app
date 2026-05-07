CREATE TYPE public.property_type AS ENUM('house', 'apartment', 'studio');

CREATE TABLE
    public.properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        host_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
        address_line_1 TEXT NOT NULL,
        address_line_2 TEXT,
        town_city TEXT NOT NULL,
        postcode TEXT NOT NULL,
        TYPE public.property_type NOT NULL DEFAULT 'house',
        bedrooms SMALLINT NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
        bathrooms SMALLINT NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
        main_image_url TEXT NOT NULL,
        extra_images_urls TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
    );

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised users can insert properties" ON public.properties FOR INSERT TO authenticated
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
            OR host_id = (
                SELECT
                    auth.uid ()
            )
        )
    );

CREATE POLICY "Authorised users can update properties" ON public.properties FOR
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
            host_id = (
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
            OR host_id = (
                SELECT
                    auth.uid ()
            )
        )
    );

CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE TO authenticated USING (
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

CREATE TRIGGER set_properties_updated_at BEFORE
UPDATE ON public.properties FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column ();

CREATE POLICY "Authorised users can manage property media" ON STORAGE.objects FOR ALL TO authenticated USING (
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
            OR (STORAGE.foldername (NAME)) [1] = (
                SELECT
                    auth.uid ()
            )::TEXT
        )
    )
)
WITH
    CHECK (
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
                OR (STORAGE.foldername (NAME)) [1] = (
                    SELECT
                        auth.uid ()
                )::TEXT
            )
        )
    );

CREATE
OR REPLACE FUNCTION public.enforce_property_immutability () RETURNS TRIGGER SECURITY DEFINER
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
            NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_property_immutability BEFORE
UPDATE ON public.properties FOR EACH ROW
EXECUTE FUNCTION public.enforce_property_immutability ();

CREATE
OR REPLACE FUNCTION public.soft_delete_property (p_property_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.properties 
        WHERE id = p_property_id 
        AND host_id = (SELECT auth.uid()) 
        AND deleted_at IS NULL
    ) AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.properties
    SET deleted_at = now()
    WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql;

GRANT
EXECUTE ON FUNCTION public.soft_delete_property TO authenticated;

ALTER TABLE public.profiles ADD COLUMN base_price_per_cleaning NUMERIC;

COMMIT;