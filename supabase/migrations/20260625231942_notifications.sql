CREATE TYPE public.notification_type AS ENUM(
    'cleaning_requested',
    'cleaning_confirmed',
    'cleaning_started',
    'cleaning_completed',
    'cleaning_cancelled',
    'cleaning_assigned',
    'cleaning_reassigned',
    'cleaning_updated',
    'cleaning_reminder',
    'cleaning_starting_soon',
    'cleaning_missed_clockin'
);

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE
OR REPLACE FUNCTION public.notify_cleaning_reminders () RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT
            c.id AS cleaning_id,
            c.cleaner_id,
            c.scheduled_start,
            p.address_line_1 AS property_address,
            pr.full_name AS cleaner_name
        FROM public.cleanings c
        LEFT JOIN public.properties p ON c.property_id = p.id
        LEFT JOIN public.profiles pr ON c.cleaner_id = pr.id
        WHERE c.status = 'confirmed'
          AND c.cleaner_id IS NOT NULL
          AND DATE(c.scheduled_start) = CURRENT_DATE
          AND EXTRACT(HOUR FROM NOW()) >= 8
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.data->>'cleaning_id' = c.id::TEXT
                AND n.type = 'cleaning_reminder'
                AND DATE(n.created_at) = CURRENT_DATE
          )
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        VALUES (
            rec.cleaner_id,
            'cleaning_reminder',
            'Cleaning Reminder',
            'You have a cleaning scheduled at ' || rec.property_address || ' today at ' || TO_CHAR(rec.scheduled_start, 'HH12:MI AM') || '.',
            jsonb_build_object(
                'cleaning_id', rec.cleaning_id,
                'property_id', rec.property_id,
                'property_address', rec.property_address,
                'cleaner_name', rec.cleaner_name,
                'scheduled_time', TO_CHAR(rec.scheduled_start, 'HH12:MI AM')
            ),
            '/cleaner/cleanings?cleaning_view=' || rec.cleaning_id::TEXT
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

CREATE
OR REPLACE FUNCTION public.notify_cleaning_starting_soon () RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT
            c.id AS cleaning_id,
            c.cleaner_id,
            c.scheduled_start,
            p.address_line_1 AS property_address,
            pr.full_name AS cleaner_name
        FROM public.cleanings c
        LEFT JOIN public.properties p ON c.property_id = p.id
        LEFT JOIN public.profiles pr ON c.cleaner_id = pr.id
        WHERE c.status = 'confirmed'
          AND c.cleaner_id IS NOT NULL
          AND c.scheduled_start BETWEEN NOW() AND NOW() + INTERVAL '6 minutes'
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.data->>'cleaning_id' = c.id::TEXT
                AND n.type = 'cleaning_starting_soon'
                AND n.created_at > NOW() - INTERVAL '10 minutes'
          )
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        VALUES (
            rec.cleaner_id,
            'cleaning_starting_soon',
            'Cleaning Starting Soon',
            'Your cleaning at ' || rec.property_address || ' starts at ' || TO_CHAR(rec.scheduled_start, 'HH12:MI AM') || '. Please clock in.',
            jsonb_build_object(
                'cleaning_id', rec.cleaning_id,
                'property_id', rec.property_id,
                'property_address', rec.property_address,
                'cleaner_name', rec.cleaner_name,
                'scheduled_time', TO_CHAR(rec.scheduled_start, 'HH12:MI AM')
            ),
            '/cleaner/cleanings?cleaning_view=' || rec.cleaning_id::TEXT
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

CREATE
OR REPLACE FUNCTION public.notify_missed_clockin () RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    rec RECORD;
    v_admin_id UUID;
BEGIN
    FOR rec IN
        SELECT
            c.id AS cleaning_id,
            c.cleaner_id,
            c.scheduled_start,
            c.host_id,
            p.address_line_1 AS property_address,
            pr.full_name AS cleaner_name
        FROM public.cleanings c
        LEFT JOIN public.properties p ON c.property_id = p.id
        LEFT JOIN public.profiles pr ON c.cleaner_id = pr.id
        WHERE c.status = 'confirmed'
          AND c.cleaner_id IS NOT NULL
          AND c.clock_in_time IS NULL
          AND c.scheduled_start < NOW() - INTERVAL '30 minutes'
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.data->>'cleaning_id' = c.id::TEXT
                AND n.type = 'cleaning_missed_clockin'
          )
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        VALUES (
            rec.cleaner_id,
            'cleaning_missed_clockin',
            'Missed Clock-In',
            'You haven''t clocked in for your cleaning at ' || rec.property_address || ' (scheduled at ' || TO_CHAR(rec.scheduled_start, 'HH12:MI AM') || '). Please clock in now.',
            jsonb_build_object(
                'cleaning_id', rec.cleaning_id,
                'property_id', rec.property_id,
                'property_address', rec.property_address,
                'cleaner_name', rec.cleaner_name,
                'scheduled_time', TO_CHAR(rec.scheduled_start, 'HH12:MI AM')
            ),
            '/cleaner/cleanings?cleaning_view=' || rec.cleaning_id::TEXT
        )
        ON CONFLICT DO NOTHING;

        FOR v_admin_id IN
            SELECT id FROM public.profiles WHERE role = 'admin'
        LOOP
            INSERT INTO public.notifications (user_id, type, title, message, data, link)
            VALUES (
                v_admin_id,
                'cleaning_missed_clockin',
                'Cleaner Missed Clock-In',
                rec.cleaner_name || ' hasn''t clocked in for cleaning at ' || rec.property_address || ' (scheduled at ' || TO_CHAR(rec.scheduled_start, 'HH12:MI AM') || ').',
                jsonb_build_object(
                    'cleaning_id', rec.cleaning_id,
                    'property_id', rec.property_id,
                    'property_address', rec.property_address,
                    'cleaner_name', rec.cleaner_name,
                    'scheduled_time', TO_CHAR(rec.scheduled_start, 'HH12:MI AM')
                ),
                '/admin/users/hosts/' || rec.host_id::TEXT || '?cleaning_view=' || rec.cleaning_id::TEXT
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

CREATE TABLE
    public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
        type public.notification_type NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        link TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);

CREATE INDEX idx_notifications_created_at ON public.notifications (created_at DESC);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read)
WHERE
    is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR
SELECT
    TO authenticated USING (
        user_id = (
            SELECT
                auth.uid ()
        )
        AND EXISTS (
            SELECT
                1
            FROM
                public.profiles
            WHERE
                id = (
                    SELECT
                        auth.uid ()
                )
                AND public.is_not_banned ()
        )
    );

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR
UPDATE TO authenticated USING (
    user_id = (
        SELECT
            auth.uid ()
    )
)
WITH
    CHECK (
        user_id = (
            SELECT
                auth.uid ()
        )
    );

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated
WITH
    CHECK (
        user_id = (
            SELECT
                auth.uid ()
        )
    );

CREATE TABLE
    public.notification_preferences (
        user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
        enabled BOOLEAN DEFAULT TRUE,
        push_enabled BOOLEAN DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR
SELECT
    TO authenticated USING (
        user_id = (
            SELECT
                auth.uid ()
        )
    );

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR
UPDATE TO authenticated USING (
    user_id = (
        SELECT
            auth.uid ()
    )
)
WITH
    CHECK (
        user_id = (
            SELECT
                auth.uid ()
        )
    );

CREATE
OR REPLACE FUNCTION public.get_or_create_notification_preferences () RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_user_id UUID;
    v_pref_id UUID;
BEGIN
    v_user_id := auth.uid();

    INSERT INTO notification_preferences (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id INTO v_pref_id;

    IF v_pref_id IS NULL THEN
        SELECT user_id INTO v_pref_id FROM notification_preferences WHERE user_id = v_user_id;
    END IF;

    RETURN v_pref_id;
END;
$$;

REVOKE
EXECUTE ON FUNCTION public.get_or_create_notification_preferences ()
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.get_or_create_notification_preferences () TO authenticated;

CREATE
OR REPLACE FUNCTION public.create_notification_for_user (
    p_user_id UUID,
    p_type public.notification_type,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_link TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    IF p_user_id != auth.uid() AND ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Cannot create notifications for other users' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO notifications (user_id, type, title, message, data, link)
    VALUES (p_user_id, p_type, p_title, p_message, p_data, p_link)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

REVOKE
EXECUTE ON FUNCTION public.create_notification_for_user
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.create_notification_for_user TO authenticated;

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

    IF TG_OP = 'INSERT' AND NEW.status = 'requested' THEN
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

    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        SELECT p.id, 'cleaning_cancelled', 'Cleaning Cancelled',
            'Cleaning at ' || v_property_address || ' has been cancelled.',
            jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address),
            '/admin/users/hosts/' || v_host_id::TEXT || '?cleaning_view=' || NEW.id::TEXT
        FROM public.profiles p
        WHERE p.role = 'admin'
        ON CONFLICT DO NOTHING;
    END IF;

    IF NEW.status = 'requested' AND OLD.status = 'requested' THEN
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

CREATE TRIGGER on_cleaning_notifications
AFTER INSERT
OR
UPDATE ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.handle_cleaning_notifications ();

REVOKE
EXECUTE ON FUNCTION public.handle_cleaning_notifications ()
FROM
    PUBLIC,
    anon,
    authenticated;

SELECT
    cron.schedule ('cleaning-reminder-check', '0 * * * *', 'SELECT public.notify_cleaning_reminders()');

SELECT
    cron.schedule ('cleaning-starting-soon-check', '*/5 * * * *', 'SELECT public.notify_cleaning_starting_soon()');

SELECT
    cron.schedule ('cleaning-missed-clockin-check', '*/10 * * * *', 'SELECT public.notify_missed_clockin()');

REVOKE
EXECUTE ON FUNCTION public.notify_cleaning_reminders ()
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.notify_cleaning_reminders () TO authenticated;

REVOKE
EXECUTE ON FUNCTION public.notify_cleaning_starting_soon ()
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.notify_cleaning_starting_soon () TO authenticated;

REVOKE
EXECUTE ON FUNCTION public.notify_missed_clockin ()
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.notify_missed_clockin () TO authenticated;

BEGIN;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.profiles;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.properties;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.cleanings;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.cleaning_tasks;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.evidence_media;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.cleaning_reports;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.notifications;

ALTER PUBLICATION supabase_realtime
ADD TABLE public.notification_preferences;

CREATE TABLE
    public.push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
        subscription JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (
    user_id = (
        SELECT
            auth.uid ()
    )
);

ALTER PUBLICATION supabase_realtime
ADD TABLE public.push_subscriptions;

COMMENT ON TABLE public.push_subscriptions IS '@omit';

GRANT
SELECT
    ON public.notifications TO authenticated;

GRANT
SELECT
    ON public.notification_preferences TO authenticated;

GRANT
SELECT
    ON public.push_subscriptions TO authenticated;

GRANT
UPDATE,
DELETE ON public.notifications TO authenticated;

GRANT
UPDATE ON public.notification_preferences TO authenticated;

GRANT INSERT,
DELETE ON public.push_subscriptions TO authenticated;

COMMIT;