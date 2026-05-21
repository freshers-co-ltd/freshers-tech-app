BEGIN;

CREATE
OR REPLACE FUNCTION public.admin_get_users (
    p_role TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_limit INT DEFAULT 20,
    p_sort_field TEXT DEFAULT 'joined',
    p_sort_direction TEXT DEFAULT 'desc'
) RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_verified BOOLEAN,
    avatar_url TEXT,
    banned_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN,
    total_properties INT,
    total_cleanings INT,
    completed_cleanings INT,
    last_sign_in_text TEXT,
    total_user_count INT
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role::TEXT,
        p.is_verified,
        p.avatar_url,
        au.banned_until,
        MAX(au.created_at) as created_at,
        MAX(au.last_sign_in_at) as last_sign_in_at,
        p.last_seen_at,
        p.last_seen_at IS NOT NULL AND p.last_seen_at > now() - interval '5 minutes' as is_online,
        (SELECT count(*)::INT FROM public.properties pr WHERE pr.host_id = p.id AND pr.deleted_at IS NULL),
        (SELECT count(*)::INT FROM public.cleanings c WHERE (c.host_id = p.id OR c.cleaner_id = p.id) AND c.deleted_at IS NULL),
        (SELECT count(*)::INT FROM public.cleanings c WHERE (c.host_id = p.id OR c.cleaner_id = p.id) AND c.status = 'completed' AND c.deleted_at IS NULL),
        CASE 
            WHEN MAX(au.last_sign_in_at) IS NULL THEN 'Never'
            WHEN MAX(au.last_sign_in_at) > now() - interval '24 hours' THEN 'Today'
            WHEN MAX(au.last_sign_in_at) > now() - interval '7 days' THEN 'This week'
            WHEN MAX(au.last_sign_in_at) > now() - interval '30 days' THEN 'This month'
            WHEN MAX(au.last_sign_in_at) > now() - interval '3 months' THEN 'Past 3 months'
            WHEN MAX(au.last_sign_in_at) > now() - interval '6 months' THEN 'Past 6 months'
            WHEN MAX(au.last_sign_in_at) > now() - interval '1 year' THEN 'Past year'
            ELSE 'More than a year ago'
        END as last_sign_in_text,
        (SELECT count(*)::INT FROM public.profiles p2 WHERE (p_role IS NULL OR p2.role::TEXT = p_role) AND (p_search IS NULL OR p2.full_name ILIKE '%' || p_search || '%' OR p2.email ILIKE '%' || p_search || '%'))
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE 
        (p_role IS NULL OR p.role::TEXT = p_role)
        AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
    GROUP BY p.id, p.email, p.full_name, p.role, p.is_verified, p.avatar_url, p.last_seen_at, au.banned_until
    ORDER BY
        CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'asc' THEN p.full_name END ASC NULLS FIRST,
        CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'desc' THEN p.full_name END DESC NULLS LAST,
        CASE WHEN p_sort_field = 'email' AND p_sort_direction = 'asc' THEN p.email END ASC NULLS FIRST,
        CASE WHEN p_sort_field = 'email' AND p_sort_direction = 'desc' THEN p.email END DESC NULLS LAST,
        CASE WHEN p_sort_field = 'role' AND p_sort_direction = 'asc' THEN p.role::TEXT END ASC NULLS FIRST,
        CASE WHEN p_sort_field = 'role' AND p_sort_direction = 'desc' THEN p.role::TEXT END DESC NULLS LAST,
        CASE WHEN p_sort_field = 'status' AND p_sort_direction = 'asc' THEN au.banned_until END ASC NULLS FIRST,
        CASE WHEN p_sort_field = 'status' AND p_sort_direction = 'desc' THEN au.banned_until END DESC NULLS LAST,
        CASE WHEN p_sort_field = 'last_online' AND p_sort_direction = 'asc' THEN MAX(au.last_sign_in_at) END ASC NULLS FIRST,
        CASE WHEN p_sort_field = 'last_online' AND p_sort_direction = 'desc' THEN MAX(au.last_sign_in_at) END DESC NULLS LAST,
        CASE WHEN p_sort_field = 'joined' AND p_sort_direction = 'asc' THEN MAX(au.created_at) END ASC NULLS FIRST,
        CASE WHEN p_sort_field = 'joined' AND p_sort_direction = 'desc' THEN MAX(au.created_at) END DESC NULLS LAST
    LIMIT p_limit
    OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.update_user_presence () RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    UPDATE public.profiles
    SET last_seen_at = NOW()
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_host_detail (
    p_host_id UUID,
    p_properties_sort_field TEXT DEFAULT 'created_at',
    p_properties_sort_direction TEXT DEFAULT 'desc'
) RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_verified BOOLEAN,
    avatar_url TEXT,
    banned_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_text TEXT,
    is_online BOOLEAN,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    properties JSONB,
    cleanings JSONB,
    cleaning_stats JSONB
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.full_name,
        p.role::TEXT,
        p.is_verified,
        p.avatar_url,
        au.banned_until,
        au.created_at AS created_at,
        au.last_sign_in_at AS last_sign_in_at,
        CASE 
            WHEN au.last_sign_in_at IS NULL THEN 'Never'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 'Today'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN 'This week'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN 'This month'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '3 months' THEN 'Past 3 months'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '6 months' THEN 'Past 6 months'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '1 year' THEN 'Past year'
            ELSE 'More than a year ago'
        END AS last_sign_in_text,
        p.last_seen_at IS NOT NULL AND p.last_seen_at > now() - interval '5 minutes' as is_online,
        p.last_seen_at,
        (
            SELECT jsonb_agg(row ORDER BY
                CASE WHEN p_properties_sort_direction = 'asc' THEN
                    CASE p_properties_sort_field
                        WHEN 'address_line_1' THEN (row->>'address_line_1')::text
                        WHEN 'postcode' THEN (row->>'postcode')::text
                        WHEN 'town_city' THEN (row->>'town_city')::text
                        WHEN 'type' THEN (row->>'type')::text
                        WHEN 'bedrooms' THEN (row->>'bedrooms')::text
                        WHEN 'bathrooms' THEN (row->>'bathrooms')::text
                        WHEN 'price_per_cleaning' THEN (row->>'price_per_cleaning')::text
                        ELSE (row->>'created_at')::text
                    END
                END ASC NULLS LAST,
                CASE WHEN p_properties_sort_direction = 'desc' OR p_properties_sort_direction IS NULL THEN
                    CASE p_properties_sort_field
                        WHEN 'address_line_1' THEN (row->>'address_line_1')::text
                        WHEN 'postcode' THEN (row->>'postcode')::text
                        WHEN 'town_city' THEN (row->>'town_city')::text
                        WHEN 'type' THEN (row->>'type')::text
                        WHEN 'bedrooms' THEN (row->>'bedrooms')::text
                        WHEN 'bathrooms' THEN (row->>'bathrooms')::text
                        WHEN 'price_per_cleaning' THEN (row->>'price_per_cleaning')::text
                        ELSE (row->>'created_at')::text
                    END
                END DESC NULLS LAST
            )
            FROM (
                SELECT jsonb_build_object(
                    'id', pr.id,
                    'address_line_1', pr.address_line_1,
                    'postcode', pr.postcode,
                    'town_city', pr.town_city,
                    'type', pr.type,
                    'bedrooms', pr.bedrooms,
                    'bathrooms', pr.bathrooms,
                    'main_image_url', pr.main_image_url,
                    'price_per_cleaning', pr.price_per_cleaning,
                    'created_at', pr.created_at
                ) AS row
                FROM public.properties pr
                WHERE pr.host_id = p_host_id AND pr.deleted_at IS NULL
            ) AS props
        ),
        (
            SELECT jsonb_agg(row)
            FROM (
                SELECT
                    c.id,
                    c.status,
                    c.scheduled_start,
                    c.service_cost,
                    c.cleaner_pay,
                    c.cleaner_id,
                    c.property_id,
                    c.created_at,
                    cl.full_name AS cleaner_name,
                    pr.town_city AS property_town_city
                FROM public.cleanings c
                LEFT JOIN public.profiles cl ON cl.id = c.cleaner_id
                LEFT JOIN public.properties pr ON c.property_id = pr.id
                WHERE c.host_id = p_host_id AND c.deleted_at IS NULL
                ORDER BY c.created_at DESC
                LIMIT 50
            ) AS row
        ),
        (
            SELECT jsonb_build_object(
                'total', count(*),
                'requested', count(*) FILTER (WHERE c.status = 'requested'),
                'confirmed', count(*) FILTER (WHERE c.status = 'confirmed'),
                'in_progress', count(*) FILTER (WHERE c.status = 'in_progress')
            )
            FROM public.cleanings c
            WHERE c.host_id = p_host_id AND c.deleted_at IS NULL
        )
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.id = p_host_id;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_cleaner_detail (p_cleaner_id UUID) RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_verified BOOLEAN,
    avatar_url TEXT,
    banned_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_text TEXT,
    is_online BOOLEAN,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    assigned_cleanings JSONB,
    cleaner_stats JSONB
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role::TEXT,
        p.is_verified,
        p.avatar_url,
        au.banned_until,
        au.created_at AS created_at,
        au.last_sign_in_at AS last_sign_in_at,
        CASE 
            WHEN au.last_sign_in_at IS NULL THEN 'Never'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 'Today'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN 'This week'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN 'This month'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '3 months' THEN 'Past 3 months'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '6 months' THEN 'Past 6 months'
            WHEN au.last_sign_in_at > NOW() - INTERVAL '1 year' THEN 'Past year'
            ELSE 'More than a year ago'
        END AS last_sign_in_text,
        p.last_seen_at IS NOT NULL AND p.last_seen_at > now() - interval '5 minutes' as is_online,
        p.last_seen_at,
        (
            SELECT jsonb_agg(row)
            FROM (
                SELECT 
                    c.id,
                    c.status,
                    c.scheduled_start,
                    c.service_cost,
                    c.cleaner_pay,
                    c.host_id,
                    c.property_id,
                    c.clock_in_time,
                    c.clock_out_time,
                    c.created_at,
                    hp.full_name AS host_name,
                    pr.address_line_1 AS property_address,
                    pr.postcode AS property_postcode,
                    pr.town_city AS property_town_city
                FROM public.cleanings c
                LEFT JOIN public.profiles hp ON c.host_id = hp.id
                LEFT JOIN public.properties pr ON c.property_id = pr.id
                WHERE c.cleaner_id = p_cleaner_id AND c.deleted_at IS NULL
                ORDER BY c.scheduled_start DESC
                LIMIT 50
            ) AS row
        ),
        (
            SELECT jsonb_build_object(
                'total_assigned', count(*),
                'completed', count(*) FILTER (WHERE c.status = 'completed'),
                'confirmed', count(*) FILTER (WHERE c.status = 'confirmed'),
                'avg_completion_hours', 
                    CASE 
                        WHEN count(*) FILTER (WHERE c.clock_out_time IS NOT NULL AND c.clock_in_time IS NOT NULL) > 0
                        THEN avg(EXTRACT(EPOCH FROM (c.clock_out_time - c.clock_in_time)) / 3600)
                        ELSE 0
                    END
            )
            FROM public.cleanings c
            WHERE c.cleaner_id = p_cleaner_id AND c.deleted_at IS NULL
        )
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.id = p_cleaner_id;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_all_cleanings (
    p_status TEXT DEFAULT NULL,
    p_cleaner_id UUID DEFAULT NULL,
    p_host_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_limit INT DEFAULT 20,
    p_sort_field TEXT DEFAULT NULL,
    p_sort_direction TEXT DEFAULT 'desc'
) RETURNS TABLE (
    id UUID,
    host_id UUID,
    property_id UUID,
    cleaner_id UUID,
    status TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    service_cost NUMERIC,
    cleaner_pay NUMERIC,
    instructions TEXT,
    stocks_included BOOLEAN,
    clock_in_time TIMESTAMP WITH TIME ZONE,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    host_name TEXT,
    cleaner_name TEXT,
    property_address TEXT,
    property_postcode TEXT,
    property_town_city TEXT
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id, c.host_id, c.property_id, c.cleaner_id, c.status::TEXT,
        c.scheduled_start, c.service_cost, c.cleaner_pay, c.instructions, c.stocks_included,
        c.clock_in_time, c.clock_out_time, c.created_at, c.updated_at, c.deleted_at,
        hp.full_name, cp.full_name, pr.address_line_1, pr.postcode, pr.town_city
    FROM public.cleanings c
    LEFT JOIN public.profiles hp ON c.host_id = hp.id
    LEFT JOIN public.profiles cp ON c.cleaner_id = cp.id
    LEFT JOIN public.properties pr ON c.property_id = pr.id
    WHERE 
        (p_status IS NULL OR c.status::TEXT = p_status)
        AND (p_cleaner_id IS NULL OR c.cleaner_id = p_cleaner_id)
        AND (p_host_id IS NULL OR c.host_id = p_host_id)
        AND (p_search IS NULL OR hp.full_name ILIKE '%' || p_search || '%' OR cp.full_name ILIKE '%' || p_search || '%' OR pr.address_line_1 ILIKE '%' || p_search || '%' OR pr.postcode ILIKE '%' || p_search || '%')
        AND c.deleted_at IS NULL
    ORDER BY
        CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'asc' THEN c.scheduled_start END ASC,
        CASE WHEN p_sort_field = 'date' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN c.scheduled_start END DESC,
        CASE WHEN p_sort_field = 'property' AND p_sort_direction = 'asc' THEN pr.address_line_1 END ASC,
        CASE WHEN p_sort_field = 'property' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN pr.address_line_1 END DESC,
        CASE WHEN p_sort_field = 'host' AND p_sort_direction = 'asc' THEN hp.full_name END ASC,
        CASE WHEN p_sort_field = 'host' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN hp.full_name END DESC,
        CASE WHEN p_sort_field = 'cleaner' AND p_sort_direction = 'asc' THEN cp.full_name END ASC,
        CASE WHEN p_sort_field = 'cleaner' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN cp.full_name END DESC,
        CASE WHEN p_sort_field = 'status' AND p_sort_direction = 'asc' THEN c.status END ASC,
        CASE WHEN p_sort_field = 'status' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN c.status END DESC,
        CASE WHEN p_sort_field = 'cost' AND p_sort_direction = 'asc' THEN c.service_cost END ASC,
        CASE WHEN p_sort_field = 'cost' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN c.service_cost END DESC,
        CASE WHEN p_sort_field IS NULL OR p_sort_field = '' THEN c.scheduled_start END DESC
    LIMIT p_limit
    OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_unassign_cleaner (p_cleaning_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE v_status public.cleaning_status;
BEGIN
    SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id AND deleted_at IS NULL;
    IF v_status::TEXT IN ('in_progress', 'completed') THEN RAISE EXCEPTION 'Unassignment blocked'; END IF;
    UPDATE public.cleanings SET cleaner_id = NULL, updated_at = now() WHERE id = p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_assign_cleaner (p_cleaning_id UUID, p_cleaner_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE v_status public.cleaning_status;
BEGIN
    SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id AND deleted_at IS NULL;
    IF v_status NOT IN ('requested', 'confirmed') THEN
        RAISE EXCEPTION 'Can only assign or reassign cleaner to requested or confirmed cleanings';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_cleaner_id AND role = 'cleaner') THEN
        RAISE EXCEPTION 'Invalid cleaner ID';
    END IF;

    UPDATE public.cleanings 
    SET cleaner_id = p_cleaner_id, updated_at = now() 
    WHERE id = p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_create_cleaning_for_host (
    p_host_id UUID,
    p_property_id UUID,
    p_scheduled_start TIMESTAMPTZ,
    p_information TEXT DEFAULT NULL,
    p_stocks_included BOOLEAN DEFAULT FALSE,
    p_custom_tasks TEXT[] DEFAULT '{}'
) RETURNS UUID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE v_cleaning_id UUID;
    v_property_type TEXT;
    v_bedrooms INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = p_host_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Ownership mismatch';
    END IF;
    
    SELECT p.type, p.bedrooms INTO v_property_type, v_bedrooms
    FROM public.properties p WHERE p.id = p_property_id;
    
    INSERT INTO public.cleanings (host_id, property_id, scheduled_start, status, instructions, stocks_included)
    VALUES (p_host_id, p_property_id, p_scheduled_start, 'requested', p_information, p_stocks_included)
    RETURNING id INTO v_cleaning_id;
    INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom)
    SELECT v_cleaning_id, description, false FROM public.standard_tasks WHERE is_active = true;
    IF array_length(p_custom_tasks, 1) > 0 THEN
        INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom)
        SELECT v_cleaning_id, t, true FROM unnest(p_custom_tasks) t;
    END IF;
    RETURN v_cleaning_id;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_update_standard_tasks (p_tasks JSONB, p_tasks_to_delete UUID[]) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF array_length(p_tasks_to_delete, 1) > 0 THEN
        DELETE FROM public.standard_tasks WHERE id = ANY(p_tasks_to_delete);
    END IF;

    FOR i IN 0..jsonb_array_length(p_tasks) - 1 LOOP
        DECLARE
            task_data JSONB := p_tasks->i;
            task_id TEXT := task_data->>'id';
            task_desc TEXT := task_data->>'description';
            task_active BOOLEAN := (task_data->>'is_active')::BOOLEAN;
        BEGIN
            IF task_id IS NOT NULL AND task_id != '' THEN
                UPDATE public.standard_tasks 
                SET description = trim(task_desc), is_active = task_active 
                WHERE id = task_id::UUID;
            ELSE
                INSERT INTO public.standard_tasks (description, is_active)
                VALUES (trim(task_desc), task_active);
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_standard_tasks () RETURNS TABLE (id UUID, description TEXT, is_active BOOLEAN, created_at TIMESTAMP WITH TIME ZONE) SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    RETURN QUERY SELECT st.id, st.description, st.is_active, st.created_at FROM public.standard_tasks st ORDER BY st.created_at;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_available_cleaners () RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, current_assignments INT, avg_completion_hours NUMERIC) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.full_name, p.avatar_url,
        (SELECT count(*)::INT FROM public.cleanings c WHERE c.cleaner_id = p.id AND c.status IN ('confirmed', 'in_progress') AND c.deleted_at IS NULL),
        COALESCE((SELECT avg(EXTRACT(EPOCH FROM (c.clock_out_time - c.clock_in_time)) / 3600) FROM public.cleanings c WHERE c.cleaner_id = p.id AND c.status = 'completed' AND c.clock_out_time IS NOT NULL AND c.deleted_at IS NULL), 0)
    FROM public.profiles p
    WHERE p.role = 'cleaner'
    ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW
    public.platform_stats AS
SELECT
    (
        SELECT
            COUNT(*)
        FROM
            public.properties
        WHERE
            deleted_at IS NULL
    ) AS total_properties,
    (
        SELECT
            COUNT(*)
        FROM
            public.profiles
        WHERE
            role = 'host'
    ) AS total_hosts,
    (
        SELECT
            COUNT(*)
        FROM
            public.profiles
        WHERE
            role = 'cleaner'
    ) AS total_cleaners,
    (
        SELECT
            COUNT(*)
        FROM
            public.cleanings
        WHERE
            status = 'completed'
            AND deleted_at IS NULL
            AND created_at >= DATE_TRUNC('month', NOW())
    ) AS completed_cleanings_mtd,
    (
        SELECT
            COUNT(*)
        FROM
            public.cleanings
        WHERE
            status = 'completed'
            AND deleted_at IS NULL
            AND created_at >= DATE_TRUNC('year', NOW())
    ) AS completed_cleanings_ytd,
    (
        SELECT
            COUNT(*)
        FROM
            public.cleanings
        WHERE
            deleted_at IS NULL
            AND created_at >= DATE_TRUNC('month', NOW())
    ) AS total_cleanings_mtd,
    (
        SELECT
            COUNT(*)
        FROM
            public.cleanings
        WHERE
            status = 'in_progress'
            AND deleted_at IS NULL
    ) AS cleanings_in_progress,
    COALESCE(
        (
            SELECT
                ROUND(
                    AVG(
                        EXTRACT(
                            EPOCH
                            FROM
                                (clock_out_time - clock_in_time)
                        ) / 3600
                    )::numeric,
                    2
                )
            FROM
                public.cleanings
            WHERE
                status = 'completed'
                AND clock_out_time IS NOT NULL
                AND deleted_at IS NULL
        ),
        0
    ) AS avg_completion_hours,
    (
        SELECT
            COUNT(*)
        FROM
            public.cleaning_reports
        WHERE
            broken_items_report IS NOT NULL
            AND deleted_at IS NULL
            AND created_at >= DATE_TRUNC('month', NOW())
    ) AS broken_items_mtd,
    (
        SELECT
            COUNT(*)
        FROM
            public.cleaning_reports
        WHERE
            low_supplies_report IS NOT NULL
            AND deleted_at IS NULL
            AND created_at >= DATE_TRUNC('month', NOW())
    ) AS low_supplies_mtd,
    NOW() AS calculated_at;

COMMENT ON VIEW public.platform_stats IS '@omit';

ALTER VIEW public.platform_stats SET (security_invoker = true);

CREATE
OR REPLACE FUNCTION public.admin_get_audit_logs (
    p_target_table TEXT DEFAULT NULL,
    p_action_type TEXT DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_limit INT DEFAULT 50,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    actor_id UUID,
    target_id UUID,
    target_table TEXT,
    action_type TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    actor_name TEXT
) SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    RETURN QUERY SELECT al.id, al.actor_id, al.target_id, al.target_table, al.action_type, al.old_data, al.new_data, al.created_at, COALESCE(p.full_name, 'System')
    FROM public.audit_logs al LEFT JOIN public.profiles p ON al.actor_id = p.id
    WHERE (p_target_table IS NULL OR al.target_table = p_target_table)
      AND (p_action_type IS NULL OR al.action_type = p_action_type)
      AND (p_date_from IS NULL OR al.created_at >= p_date_from)
      AND (p_date_to IS NULL OR al.created_at <= p_date_to)
    ORDER BY al.created_at DESC LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_cleanings_count (
    p_status TEXT DEFAULT NULL,
    p_cleaner_id UUID DEFAULT NULL,
    p_host_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    RETURN (SELECT count(*)::INT FROM public.cleanings c
    LEFT JOIN public.profiles hp ON c.host_id = hp.id
    LEFT JOIN public.profiles cp ON c.cleaner_id = cp.id
    LEFT JOIN public.properties pr ON c.property_id = pr.id
    WHERE (p_status IS NULL OR c.status::TEXT = p_status)
    AND (p_cleaner_id IS NULL OR c.cleaner_id = p_cleaner_id)
    AND (p_host_id IS NULL OR c.host_id = p_host_id)
    AND (p_search IS NULL OR hp.full_name ILIKE '%' || p_search || '%' OR cp.full_name ILIKE '%' || p_search || '%' OR pr.address_line_1 ILIKE '%' || p_search || '%' OR pr.postcode ILIKE '%' || p_search || '%')
    AND c.deleted_at IS NULL);
END; $$;

CREATE
OR REPLACE FUNCTION public.admin_get_users_count (p_role TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL) RETURNS INT SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN (
        SELECT count(*)::INT 
        FROM public.profiles p
        WHERE 
            (p_role IS NULL OR p.role::TEXT = p_role)
            AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
    );
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_user_stats () RETURNS TABLE (
    total_users INT,
    banned_users INT,
    hosts_count INT,
    cleaners_count INT,
    admins_count INT,
    new_users_this_month INT,
    new_users_last_month INT,
    recently_online INT,
    online_now INT
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY SELECT 
        count(*)::INT,
        count(*) FILTER (WHERE au.banned_until IS NOT NULL)::INT,
        count(*) FILTER (WHERE p.role = 'host')::INT,
        count(*) FILTER (WHERE p.role = 'cleaner')::INT,
        count(*) FILTER (WHERE p.role = 'admin')::INT,
        count(*) FILTER (WHERE au.created_at >= date_trunc('month', now()))::INT,
        count(*) FILTER (WHERE au.created_at >= date_trunc('month', now() - interval '1 month') AND au.created_at < date_trunc('month', now()))::INT,
        count(*) FILTER (WHERE p.last_seen_at > now() - interval '7 days')::INT,
        count(*) FILTER (WHERE p.last_seen_at > now() - interval '5 minutes')::INT
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    LEFT JOIN auth.identities ai ON ai.provider = 'email' AND ai.user_id::UUID = p.id::UUID;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_ban_user (target_user_id UUID, is_banned BOOLEAN) RETURNS VOID SECURITY DEFINER
SET
    search_path = auth,
    public AS $$
BEGIN
  IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') != 'admin') THEN
    RAISE EXCEPTION 'Unauthorised: Only admins can perform this action';
  END IF;

  IF is_banned THEN
    UPDATE auth.users
    SET 
      banned_until = NOW() + INTERVAL '100 years',
      raw_app_meta_data = raw_app_meta_data || JSONB_BUILD_OBJECT('banned_until', (NOW() + INTERVAL '100 years')::TEXT)
    WHERE id = target_user_id;

    DELETE FROM auth.refresh_tokens
    WHERE user_id = target_user_id::TEXT;
  ELSE
    UPDATE auth.users
    SET 
      banned_until = NULL,
      raw_app_meta_data = raw_app_meta_data - 'banned_until'
    WHERE id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.set_cleaner_pay_on_cleaning_insert () RETURNS TRIGGER
SET search_path = public AS $$
DECLARE
    v_property_type TEXT;
    v_bedrooms INT;
    v_bathrooms INT;
    v_hourly_rate NUMERIC;
    v_target_times JSONB;
    v_bathroom_time NUMERIC;
    v_target_hours NUMERIC;
BEGIN
    SELECT p.type, p.bedrooms, p.bathrooms INTO v_property_type, v_bedrooms, v_bathrooms
    FROM public.properties p WHERE p.id = NEW.property_id;

    SELECT c.hourly_rate, c.target_times, c.bathroom_time INTO v_hourly_rate, v_target_times, v_bathroom_time
    FROM cleaner_pay_config c WHERE c.id = 1;

    IF v_property_type = 'studio' THEN
        v_target_hours := (v_target_times->>'studio')::NUMERIC;
    ELSE
        v_target_hours := (v_target_times->>CONCAT(v_bedrooms, '_bed'))::NUMERIC;
        IF v_target_hours IS NULL THEN
            SELECT (v_target_times->>key)::NUMERIC INTO v_target_hours
            FROM jsonb_object_keys(v_target_times) AS key
            WHERE key ~ '^[0-9]+_bed$'
            ORDER BY LENGTH(key) DESC, key DESC
            LIMIT 1;
        END IF;
    END IF;

    v_target_hours := v_target_hours + GREATEST(0, v_bathrooms - 1) * COALESCE(v_bathroom_time, 0.5);

    NEW.cleaner_pay := ROUND(v_hourly_rate * COALESCE(v_target_hours, 0), 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_cleaner_pay_on_cleaning_insert BEFORE INSERT ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.set_cleaner_pay_on_cleaning_insert ();

REVOKE EXECUTE ON FUNCTION public.set_cleaner_pay_on_cleaning_insert() FROM PUBLIC, anon, authenticated;

CREATE
OR REPLACE FUNCTION public.admin_update_property_price (p_property_id UUID, p_price NUMERIC) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE properties SET price_per_cleaning = p_price WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.set_service_cost_on_cleaning_insert () RETURNS TRIGGER
SET search_path = public AS $$
DECLARE
    v_price NUMERIC;
BEGIN
    SELECT price_per_cleaning INTO v_price
    FROM public.properties WHERE id = NEW.property_id;

    NEW.service_cost := v_price;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_service_cost_on_cleaning_insert BEFORE INSERT ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.set_service_cost_on_cleaning_insert ();

REVOKE EXECUTE ON FUNCTION public.set_service_cost_on_cleaning_insert() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_users FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_user_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_presence() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_host_detail FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_host_detail TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_cleaner_detail FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_cleaner_detail TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_all_cleanings FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_all_cleanings TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_unassign_cleaner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unassign_cleaner(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_assign_cleaner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_cleaner(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_create_cleaning_for_host FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_cleaning_for_host TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_standard_tasks(jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_standard_tasks(jsonb, uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_standard_tasks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_standard_tasks() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_available_cleaners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_available_cleaners() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_audit_logs FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_logs TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_cleanings_count FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_cleanings_count TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_users_count FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users_count TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_property_price(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_property_price(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_cleaning (
    p_cleaning_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE
) RETURNS UUID SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleanings
    SET scheduled_start = p_scheduled_start,
        instructions = p_information,
        stocks_included = p_stocks_included,
        updated_at = now()
    WHERE id = p_cleaning_id AND deleted_at IS NULL;

    UPDATE public.cleaning_tasks SET deleted_at = now()
    WHERE cleaning_id = p_cleaning_id AND is_custom = true;

    IF p_custom_tasks IS NOT NULL THEN
        INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
        SELECT p_cleaning_id, task_desc, true, false
        FROM unnest(p_custom_tasks) AS task_desc
        WHERE task_desc <> '';
    END IF;

    RETURN p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.admin_update_cleaning FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_cleaning TO authenticated;

COMMIT;