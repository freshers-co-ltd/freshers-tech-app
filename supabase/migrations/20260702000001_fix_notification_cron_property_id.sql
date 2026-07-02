-- Fix notify_cleaning_reminders - add missing c.property_id to SELECT
CREATE OR REPLACE FUNCTION public.notify_cleaning_reminders ()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- Fix notify_cleaning_starting_soon - add missing c.property_id to SELECT
CREATE OR REPLACE FUNCTION public.notify_cleaning_starting_soon ()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- Fix notify_missed_clockin - add missing c.property_id to SELECT
CREATE OR REPLACE FUNCTION public.notify_missed_clockin ()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
