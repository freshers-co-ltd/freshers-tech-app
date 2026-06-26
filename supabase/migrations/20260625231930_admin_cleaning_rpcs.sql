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
    information TEXT,
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
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
    RETURN QUERY
    SELECT 
        c.id, c.host_id, c.property_id, c.cleaner_id, c.status::TEXT,
        c.scheduled_start, c.service_cost, c.cleaner_pay, c.information, c.stocks_included,
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

REVOKE
EXECUTE ON FUNCTION public.admin_get_all_cleanings
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_all_cleanings TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_unassign_cleaner (p_cleaning_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE v_status public.cleaning_status;
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
    SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id AND deleted_at IS NULL;
    IF v_status::TEXT IN ('in_progress', 'completed') THEN RAISE EXCEPTION 'Unassignment blocked'; END IF;
    UPDATE public.cleanings SET cleaner_id = NULL, updated_at = now() WHERE id = p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_unassign_cleaner (uuid)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_unassign_cleaner (uuid) TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_assign_cleaner (p_cleaning_id UUID, p_cleaner_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE v_status public.cleaning_status;
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
    SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id AND deleted_at IS NULL;
    IF v_status NOT IN ('requested', 'confirmed') THEN
        RAISE EXCEPTION 'Can only assign or reassign cleaner to requested or confirmed cleanings';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_cleaner_id AND role = 'cleaner' AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Invalid cleaner ID';
    END IF;

    UPDATE public.cleanings 
    SET cleaner_id = p_cleaner_id, updated_at = now() 
    WHERE id = p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_assign_cleaner (uuid, uuid)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_assign_cleaner (uuid, uuid) TO authenticated;

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
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = p_host_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Ownership mismatch';
    END IF;
    
    SELECT p.type, p.bedrooms INTO v_property_type, v_bedrooms
    FROM public.properties p WHERE p.id = p_property_id;
    
    INSERT INTO public.cleanings (host_id, property_id, scheduled_start, status, information, stocks_included)
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

REVOKE
EXECUTE ON FUNCTION public.admin_create_cleaning_for_host
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_create_cleaning_for_host TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_update_standard_tasks (p_tasks JSONB, p_tasks_to_delete UUID[]) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
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

REVOKE
EXECUTE ON FUNCTION public.admin_update_standard_tasks (jsonb, uuid[])
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_update_standard_tasks (jsonb, uuid[]) TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_get_available_cleaners () RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, current_assignments INT, avg_completion_hours NUMERIC) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
    RETURN QUERY
    SELECT 
        p.id, p.full_name, p.avatar_url,
        (SELECT count(*)::INT FROM public.cleanings c WHERE c.cleaner_id = p.id AND c.status IN ('confirmed', 'in_progress') AND c.deleted_at IS NULL),
        COALESCE((SELECT avg(EXTRACT(EPOCH FROM (c.clock_out_time - c.clock_in_time)) / 3600) FROM public.cleanings c WHERE c.cleaner_id = p.id AND c.status = 'completed' AND c.clock_out_time IS NOT NULL AND c.deleted_at IS NULL), 0)
    FROM public.profiles p
    WHERE p.role = 'cleaner' AND p.deleted_at IS NULL
    ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_available_cleaners ()
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_available_cleaners () TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_update_cleaning (
    p_cleaning_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE
) RETURNS UUID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleanings
    SET scheduled_start = p_scheduled_start,
        information = p_information,
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

REVOKE
EXECUTE ON FUNCTION public.admin_update_cleaning
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_update_cleaning TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_get_cleanings_count (
    p_status TEXT DEFAULT NULL,
    p_cleaner_id UUID DEFAULT NULL,
    p_host_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
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

REVOKE
EXECUTE ON FUNCTION public.admin_get_cleanings_count
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_cleanings_count TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_update_property_price (p_property_id UUID, p_price NUMERIC) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;

    UPDATE properties SET price_per_cleaning = p_price WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_update_property_price (uuid, numeric)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_update_property_price (uuid, numeric) TO authenticated;

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
            AND deleted_at IS NULL
    ) AS total_hosts,
    (
        SELECT
            COUNT(*)
        FROM
            public.profiles
        WHERE
            role = 'cleaner'
            AND deleted_at IS NULL
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

ALTER VIEW public.platform_stats
SET
    (security_invoker = true);

GRANT
SELECT
    ON public.platform_stats TO authenticated;
