ALTER TABLE public.properties
ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/London',
ADD COLUMN default_cleaning_time TIME NOT NULL DEFAULT '11:00';

ALTER TABLE public.cleanings
ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

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
            NEW.source IS DISTINCT FROM OLD.source OR
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

CREATE TABLE
    public.ical_feeds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
        property_id UUID NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
        url_secret_id UUID,
        url_hash TEXT NOT NULL UNIQUE,
        url_display TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('airbnb', 'booking', 'vrbo', 'generic')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_synced_at TIMESTAMPTZ,
        last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error')),
        last_sync_error TEXT,
        etag TEXT,
        last_modified TEXT,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX idx_ical_feeds_owner_id ON public.ical_feeds (owner_id);

CREATE INDEX idx_ical_feeds_property_id ON public.ical_feeds (property_id);

CREATE INDEX idx_ical_feeds_active ON public.ical_feeds (is_active)
WHERE
    is_active = TRUE;

ALTER TABLE public.ical_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised users can view ical feeds" ON public.ical_feeds FOR
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
            OR owner_id = (
                SELECT
                    auth.uid ()
            )
        )
    );

CREATE POLICY "Authorised users can insert ical feeds" ON public.ical_feeds FOR INSERT TO authenticated
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
            OR owner_id = (
                SELECT
                    auth.uid ()
            )
        )
    );

CREATE POLICY "Authorised users can update ical feeds" ON public.ical_feeds FOR
UPDATE TO authenticated USING (
    public.is_not_banned ()
    AND (
        (
            (
                SELECT
                    auth.jwt ()
            ) -> 'app_metadata' ->> 'role'
        ) = 'admin'
        OR owner_id = (
            SELECT
                auth.uid ()
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
            OR owner_id = (
                SELECT
                    auth.uid ()
            )
        )
    );

CREATE POLICY "Authorised users can delete ical feeds" ON public.ical_feeds FOR DELETE TO authenticated USING (
    public.is_not_banned ()
    AND (
        (
            (
                SELECT
                    auth.jwt ()
            ) -> 'app_metadata' ->> 'role'
        ) = 'admin'
        OR owner_id = (
            SELECT
                auth.uid ()
        )
    )
);

CREATE
OR REPLACE FUNCTION public.enforce_ical_feed_owner () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF (SELECT host_id FROM public.properties WHERE id = NEW.property_id) IS DISTINCT FROM NEW.owner_id THEN
        RAISE EXCEPTION 'Feed owner must be the property host' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ical_feed_owner BEFORE INSERT ON public.ical_feeds FOR EACH ROW
EXECUTE FUNCTION public.enforce_ical_feed_owner ();

CREATE
OR REPLACE FUNCTION public.enforce_ical_feed_immutability () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') THEN
        RETURN NEW;
    END IF;

    IF (
        NEW.id IS DISTINCT FROM OLD.id OR
        NEW.owner_id IS DISTINCT FROM OLD.owner_id OR
        NEW.property_id IS DISTINCT FROM OLD.property_id OR
        NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
        RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ical_feed_immutability BEFORE
UPDATE ON public.ical_feeds FOR EACH ROW
EXECUTE FUNCTION public.enforce_ical_feed_immutability ();

REVOKE
EXECUTE ON FUNCTION public.enforce_ical_feed_owner ()
FROM
    PUBLIC,
    anon,
    authenticated;

REVOKE
EXECUTE ON FUNCTION public.enforce_ical_feed_immutability ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE TRIGGER set_ical_feeds_updated_at BEFORE
UPDATE ON public.ical_feeds FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column ();

CREATE TABLE
    public.ical_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        feed_id UUID NOT NULL REFERENCES public.ical_feeds (id) ON DELETE CASCADE,
        uid TEXT NOT NULL,
        summary TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        cleaning_id UUID REFERENCES public.cleanings (id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (feed_id, uid)
    );

CREATE INDEX idx_ical_events_feed_id ON public.ical_events (feed_id);

CREATE INDEX idx_ical_events_status ON public.ical_events (feed_id, status);

CREATE INDEX idx_ical_events_cleaning_id ON public.ical_events (cleaning_id);

ALTER TABLE public.ical_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feed owners and admins can view ical events" ON public.ical_events FOR
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
            OR EXISTS (
                SELECT
                    1
                FROM
                    public.ical_feeds
                WHERE
                    ical_feeds.id = ical_events.feed_id
                    AND ical_feeds.owner_id = (
                        SELECT
                            auth.uid ()
                    )
            )
        )
    );

CREATE TRIGGER set_ical_events_updated_at BEFORE
UPDATE ON public.ical_events FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column ();

GRANT
SELECT
    ON public.ical_feeds TO authenticated;

GRANT INSERT,
UPDATE,
DELETE ON public.ical_feeds TO authenticated;

GRANT
SELECT
    ON public.ical_events TO authenticated;

GRANT
SELECT
,
    INSERT,
UPDATE,
DELETE ON public.ical_feeds TO service_role;

GRANT
SELECT
,
    INSERT,
UPDATE,
DELETE ON public.ical_events TO service_role;

GRANT
SELECT
,
    INSERT,
UPDATE,
DELETE ON public.cleanings TO service_role;

GRANT
SELECT
,
    INSERT,
UPDATE,
DELETE ON public.properties TO service_role;

GRANT
SELECT
,
    INSERT,
UPDATE,
DELETE ON public.notifications TO service_role;

GRANT
EXECUTE ON FUNCTION public.calculate_cleaner_pay (uuid) TO service_role;

ALTER TYPE public.notification_type
ADD VALUE IF NOT EXISTS 'ical_sync_alert';

CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE
OR REPLACE FUNCTION public.store_ical_feed_url (p_url TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = '' AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT vault.create_secret (p_url, 'ical_feed_' || gen_random_uuid()::TEXT) INTO v_id;
    RETURN v_id;
END;
$$;

CREATE
OR REPLACE FUNCTION public.update_ical_feed_url (p_secret_id UUID, p_url TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = '' AS $$
BEGIN
    PERFORM vault.update_secret (p_secret_id, p_url, 'ical_feed_' || p_secret_id::TEXT);
END;
$$;

CREATE
OR REPLACE FUNCTION public.get_ical_feed_url (p_feed_id UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = '' AS $$
DECLARE
    v_secret_id UUID;
    v_url TEXT;
BEGIN
    SELECT url_secret_id INTO v_secret_id
    FROM public.ical_feeds
    WHERE id = p_feed_id;

    IF v_secret_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE id = v_secret_id;

    RETURN v_url;
END;
$$;

REVOKE
EXECUTE ON FUNCTION public.store_ical_feed_url (text)
FROM
    PUBLIC,
    anon,
    authenticated;

REVOKE
EXECUTE ON FUNCTION public.update_ical_feed_url (uuid, text)
FROM
    PUBLIC,
    anon,
    authenticated;

REVOKE
EXECUTE ON FUNCTION public.get_ical_feed_url (uuid)
FROM
    PUBLIC,
    anon,
    authenticated;

GRANT
EXECUTE ON FUNCTION public.store_ical_feed_url (text) TO service_role;

GRANT
EXECUTE ON FUNCTION public.update_ical_feed_url (uuid, text) TO service_role;

GRANT
EXECUTE ON FUNCTION public.get_ical_feed_url (uuid) TO service_role;

CREATE
OR REPLACE FUNCTION public.run_ical_sync (p_feed_id UUID DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = '' AS $$
DECLARE
    v_url TEXT;
    v_secret TEXT;
    v_body JSONB;
BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'ical_sync_url';

    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'ical_webhook_secret';

    IF v_url IS NULL OR v_secret IS NULL THEN
        RAISE NOTICE 'ical_sync_url or ical_webhook_secret not configured';
        RETURN;
    END IF;

    v_body := CASE
        WHEN p_feed_id IS NULL THEN '{}'::jsonb
        ELSE jsonb_build_object('feedId', p_feed_id)
    END;

    PERFORM net.http_post (
        url := v_url,
        headers := jsonb_build_object (
            'Content-Type',
            'application/json',
            'Webhook-secret',
            v_secret
        ),
        body := v_body
    );
END;
$$;

REVOKE
EXECUTE ON FUNCTION public.run_ical_sync (uuid)
FROM
    PUBLIC,
    anon,
    authenticated;

GRANT
EXECUTE ON FUNCTION public.run_ical_sync (uuid) TO service_role;

DO $$
BEGIN
    PERFORM cron.unschedule ('ical-sync');
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

SELECT
    cron.schedule ('ical-sync', '*/30 * * * *', 'SELECT public.run_ical_sync()');

CREATE
OR REPLACE FUNCTION public.handle_cleaning_notifications () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_property_address TEXT;
    v_host_id UUID;
    v_scheduled_date TEXT;
    v_cleaner_name TEXT;
    v_old_cleaner_name TEXT;
    v_is_reassignment BOOLEAN := FALSE;
BEGIN
    SELECT COALESCE(p.address_line_1, 'Unknown property'), c.host_id
    INTO v_property_address, v_host_id
    FROM public.cleanings c
    LEFT JOIN public.properties p ON c.property_id = p.id
    WHERE c.id = NEW.id;

    v_scheduled_date := TO_CHAR(NEW.scheduled_start, 'FMMonth FMDD, YYYY');

    IF NEW.cleaner_id IS NOT NULL THEN
        SELECT COALESCE(full_name, 'Unknown') INTO v_cleaner_name
        FROM public.profiles WHERE id = NEW.cleaner_id;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.status = 'requested' AND NEW.source != 'ical' THEN
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        SELECT p.id, 'cleaning_requested', 'New Cleaning Requested',
            'Host ' || COALESCE(hp.full_name, 'Unknown') || ' has requested a cleaning at ' || v_property_address,
            jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'host_name', COALESCE(hp.full_name, 'Unknown')),
            '/admin/users/hosts/' || v_host_id::TEXT || '?cleaning_view=' || NEW.id::TEXT
        FROM public.profiles p
        CROSS JOIN (SELECT full_name FROM public.profiles WHERE id = v_host_id) hp
        WHERE p.role = 'admin'
        ON CONFLICT DO NOTHING;
    END IF;

    IF NEW.cleaner_id IS DISTINCT FROM OLD.cleaner_id AND NEW.cleaner_id IS NOT NULL THEN
        IF OLD.cleaner_id IS NOT NULL THEN
            v_is_reassignment := TRUE;
            SELECT COALESCE(full_name, 'Unknown') INTO v_old_cleaner_name
            FROM public.profiles WHERE id = OLD.cleaner_id;
        END IF;

        IF v_is_reassignment THEN
            IF v_host_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, type, title, message, data, link)
                VALUES (
                    v_host_id,
                    'cleaning_reassigned',
                    'Cleaning Reassigned',
                    'Your cleaning at ' || v_property_address || ' has been reassigned to ' || v_cleaner_name || '.',
                    jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
                    '/host/cleanings?cleaning_view=' || NEW.id::TEXT
                )
                ON CONFLICT DO NOTHING;
            END IF;

            INSERT INTO public.notifications (user_id, type, title, message, data, link)
            VALUES (
                OLD.cleaner_id,
                'cleaning_reassigned',
                'Cleaning Unassigned',
                'You have been unassigned from ' || v_property_address || '.',
                jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_old_cleaner_name),
                '/cleaner/cleanings'
            )
            ON CONFLICT DO NOTHING;

            INSERT INTO public.notifications (user_id, type, title, message, data, link)
            VALUES (
                NEW.cleaner_id,
                'cleaning_assigned',
                'New Cleaning Assigned',
                'You have been assigned to clean ' || v_property_address || ' on ' || v_scheduled_date || '.',
                jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
                '/cleaner/cleanings?cleaning_view=' || NEW.id::TEXT
            )
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO public.notifications (user_id, type, title, message, data, link)
            VALUES (
                NEW.cleaner_id,
                'cleaning_assigned',
                'New Cleaning Assigned',
                'You have been assigned to clean ' || v_property_address || ' on ' || v_scheduled_date || '.',
                jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
                '/cleaner/cleanings?cleaning_view=' || NEW.id::TEXT
            )
            ON CONFLICT DO NOTHING;

            IF v_host_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, type, title, message, data, link)
                VALUES (
                    v_host_id,
                    'cleaning_confirmed',
                    'Cleaning Confirmed',
                    'Your cleaning request for ' || v_property_address || ' has been confirmed and ' || v_cleaner_name || ' has been assigned.',
                    jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
                    '/host/cleanings?cleaning_view=' || NEW.id::TEXT
                )
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;

    IF (OLD.clock_in_time IS NULL AND NEW.clock_in_time IS NOT NULL) THEN
        IF v_host_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, link)
            VALUES (
                v_host_id,
                'cleaning_started',
                'Cleaning Started',
                v_cleaner_name || ' has started cleaning at ' || v_property_address || '.',
                jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
                '/host/cleanings?cleaning_view=' || NEW.id::TEXT
            )
            ON CONFLICT DO NOTHING;
        END IF;

        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        SELECT p.id, 'cleaning_started', 'Cleaning Started',
            'Cleaning started by ' || v_cleaner_name || ' at ' || v_property_address || '.',
            jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
            '/admin/users/hosts/' || v_host_id::TEXT || '?cleaning_view=' || NEW.id::TEXT
        FROM public.profiles p
        WHERE p.role = 'admin'
        ON CONFLICT DO NOTHING;
    END IF;

    IF (OLD.clock_out_time IS NULL AND NEW.clock_out_time IS NOT NULL) THEN
        IF v_host_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, link)
            VALUES (
                v_host_id,
                'cleaning_completed',
                'Cleaning Completed',
                v_cleaner_name || ' has completed cleaning at ' || v_property_address || '.',
                jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
                '/host/cleanings?cleaning_view=' || NEW.id::TEXT
            )
            ON CONFLICT DO NOTHING;
        END IF;

        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        SELECT p.id, 'cleaning_completed', 'Cleaning Completed',
            'Cleaning completed by ' || v_cleaner_name || ' at ' || v_property_address || '.',
            jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address, 'cleaner_name', v_cleaner_name),
            '/admin/users/hosts/' || v_host_id::TEXT || '?cleaning_view=' || NEW.id::TEXT
        FROM public.profiles p
        WHERE p.role = 'admin'
        ON CONFLICT DO NOTHING;
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.source != 'ical' THEN
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        SELECT p.id, 'cleaning_cancelled', 'Cleaning Cancelled',
            'Cleaning at ' || v_property_address || ' has been cancelled.',
            jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address),
            '/admin/users/hosts/' || v_host_id::TEXT || '?cleaning_view=' || NEW.id::TEXT
        FROM public.profiles p
        WHERE p.role = 'admin'
        ON CONFLICT DO NOTHING;
    END IF;

    IF NEW.status = 'requested' AND OLD.status = 'requested' AND NEW.source != 'ical' THEN
        IF NEW.scheduled_start IS DISTINCT FROM OLD.scheduled_start
            OR NEW.information IS DISTINCT FROM OLD.information
            OR NEW.stocks_included IS DISTINCT FROM OLD.stocks_included
            OR EXISTS (SELECT 1 FROM public.cleaning_tasks ct WHERE ct.cleaning_id = NEW.id AND ct.deleted_at IS NULL AND (SELECT count(*) FROM public.cleaning_tasks ct2 WHERE ct2.cleaning_id = NEW.id AND ct2.deleted_at IS NULL) != (SELECT count(*) FROM public.cleaning_tasks ct3 WHERE ct3.cleaning_id = OLD.id AND ct3.deleted_at IS NULL)) THEN

            IF NEW.cleaner_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, type, title, message, data, link)
                VALUES (
                    NEW.cleaner_id,
                    'cleaning_updated',
                    'Cleaning Details Updated',
                    'The cleaning at ' || v_property_address || ' has been updated.',
                    jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address),
                    '/cleaner/cleanings?cleaning_view=' || NEW.id::TEXT
                )
                ON CONFLICT DO NOTHING;
            END IF;

            INSERT INTO public.notifications (user_id, type, title, message, data, link)
            SELECT p.id, 'cleaning_updated', 'Cleaning Details Updated',
                'Cleaning at ' || v_property_address || ' has been updated by the host.',
                jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address),
                '/admin/users/hosts/' || v_host_id::TEXT || '?cleaning_view=' || NEW.id::TEXT
            FROM public.profiles p
            WHERE p.role = 'admin'
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.handle_cleaning_notifications ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.create_cleaning_request (
    p_property_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE,
    p_source TEXT DEFAULT 'manual'
) RETURNS UUID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_cleaning_id UUID;
    v_host_id UUID;
    v_property_type TEXT;
    v_bedrooms INT;
    v_price_per_cleaning NUMERIC;
    v_main_cleaner_id UUID;
BEGIN
    IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
        IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = (SELECT auth.uid()) AND deleted_at IS NULL) THEN
            RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    SELECT p.host_id, p.type, p.bedrooms, p.price_per_cleaning, p.main_cleaner_id
    INTO v_host_id, v_property_type, v_bedrooms, v_price_per_cleaning, v_main_cleaner_id
    FROM public.properties p WHERE p.id = p_property_id;

    INSERT INTO public.cleanings (property_id, host_id, scheduled_start, status, information, stocks_included, service_cost, cleaner_id, source)
    VALUES (
        p_property_id,
        v_host_id,
        p_scheduled_start,
        CASE WHEN v_main_cleaner_id IS NOT NULL THEN 'confirmed'::cleaning_status ELSE 'requested'::cleaning_status END,
        p_information,
        p_stocks_included,
        v_price_per_cleaning,
        v_main_cleaner_id,
        p_source
    )
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

DROP FUNCTION IF EXISTS public.create_cleaning_request (UUID, TEXT[], TEXT, TIMESTAMPTZ, BOOLEAN);

REVOKE
EXECUTE ON FUNCTION public.create_cleaning_request (UUID, TEXT[], TEXT, TIMESTAMPTZ, BOOLEAN, TEXT)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.create_cleaning_request (UUID, TEXT[], TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;

GRANT
EXECUTE ON FUNCTION public.create_cleaning_request (UUID, TEXT[], TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) TO service_role;