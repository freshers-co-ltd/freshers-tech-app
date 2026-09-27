CREATE INDEX IF NOT EXISTS idx_notifications_cleaning_id ON public.notifications ((data ->> 'cleaning_id'));

CREATE
OR REPLACE FUNCTION public.notify_cleaning_reminders () RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public
SET
    TimeZone = 'Europe/London' AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT
            c.id AS cleaning_id,
            c.cleaner_id,
            c.property_id,
            c.scheduled_start,
            p.address_line_1 AS property_address,
            pr.full_name AS cleaner_name
        FROM public.cleanings c
        LEFT JOIN public.properties p ON c.property_id = p.id
        LEFT JOIN public.profiles pr ON c.cleaner_id = pr.id
        WHERE c.status = 'confirmed'
          AND c.cleaner_id IS NOT NULL
          AND c.deleted_at IS NULL
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
    search_path = public
SET
    TimeZone = 'Europe/London' AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT
            c.id AS cleaning_id,
            c.cleaner_id,
            c.property_id,
            c.scheduled_start,
            p.address_line_1 AS property_address,
            pr.full_name AS cleaner_name
        FROM public.cleanings c
        LEFT JOIN public.properties p ON c.property_id = p.id
        LEFT JOIN public.profiles pr ON c.cleaner_id = pr.id
        WHERE c.status = 'confirmed'
          AND c.cleaner_id IS NOT NULL
          AND c.deleted_at IS NULL
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
    search_path = public
SET
    TimeZone = 'Europe/London' AS $$
DECLARE
    rec RECORD;
    v_admin_id UUID;
BEGIN
    FOR rec IN
        SELECT
            c.id AS cleaning_id,
            c.cleaner_id,
            c.property_id,
            c.scheduled_start,
            c.host_id,
            p.address_line_1 AS property_address,
            pr.full_name AS cleaner_name
        FROM public.cleanings c
        LEFT JOIN public.properties p ON c.property_id = p.id
        LEFT JOIN public.profiles pr ON c.cleaner_id = pr.id
        WHERE c.status = 'confirmed'
          AND c.cleaner_id IS NOT NULL
          AND c.deleted_at IS NULL
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
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

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

    IF TG_OP = 'INSERT' AND NEW.status = 'requested' AND NEW.source = 'manual' THEN
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

    IF TG_OP = 'INSERT' AND NEW.status = 'unverified' THEN
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        VALUES (
            v_host_id,
            'cleaning_needs_verification',
            'Calendar Cleaning Needs Verification',
            'A calendar event at ' || v_property_address || ' on ' || v_scheduled_date || ' needs your confirmation.',
            jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address),
            '/host/cleanings?cleaning_view=' || NEW.id::TEXT
        );
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

    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.source = 'manual' THEN
        INSERT INTO public.notifications (user_id, type, title, message, data, link)
        SELECT p.id, 'cleaning_cancelled', 'Cleaning Cancelled',
            'Cleaning at ' || v_property_address || ' has been cancelled.',
            jsonb_build_object('cleaning_id', NEW.id, 'property_id', NEW.property_id, 'property_address', v_property_address),
            '/admin/users/hosts/' || v_host_id::TEXT || '?cleaning_view=' || NEW.id::TEXT
        FROM public.profiles p
        WHERE p.role = 'admin'
        ON CONFLICT DO NOTHING;
    END IF;

    IF NEW.status = 'requested' AND OLD.status = 'requested' AND NEW.source = 'manual' THEN
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
        IF v_status NOT IN ('completed', 'cancelled', 'unverified') THEN
            RAISE EXCEPTION 'Only completed or cancelled cleanings can be deleted.' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    UPDATE public.cleanings SET deleted_at = now() WHERE id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.cleaning_tasks SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.evidence_media SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.cleaning_reports SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
    DELETE FROM public.notifications WHERE data ? 'cleaning_id' AND data ->> 'cleaning_id' = p_cleaning_id::TEXT;
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
OR REPLACE FUNCTION public.handle_soft_cascade_delete () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.cleanings
    SET deleted_at = NEW.deleted_at
    WHERE property_id = NEW.id AND deleted_at IS NULL;
    DELETE FROM public.notifications
    WHERE data ? 'cleaning_id'
    AND (data ->> 'cleaning_id') IN (SELECT id::TEXT FROM public.cleanings WHERE property_id = NEW.id AND deleted_at IS NOT NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.handle_soft_cascade_delete ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.purge_soft_deleted_records () RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    DELETE FROM public.notifications
    WHERE data ? 'cleaning_id'
    AND (data ->> 'cleaning_id') IN (SELECT id::TEXT FROM public.cleanings WHERE deleted_at IS NOT NULL);
    DELETE FROM public.notifications
    WHERE data ? 'cleaning_id'
    AND NOT EXISTS (SELECT 1 FROM public.cleanings WHERE id::TEXT = data ->> 'cleaning_id');
    DELETE FROM public.profiles WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '12 months';
    DELETE FROM public.properties WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '12 months';
    DELETE FROM public.cleanings WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '12 months';

    DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '12 months';
END;
$$;

REVOKE
EXECUTE ON FUNCTION public.purge_soft_deleted_records ()
FROM
    PUBLIC,
    anon,
    authenticated;

DELETE FROM public.notifications
WHERE data ? 'cleaning_id'
AND (data ->> 'cleaning_id') IN (SELECT id::TEXT FROM public.cleanings WHERE deleted_at IS NOT NULL);
