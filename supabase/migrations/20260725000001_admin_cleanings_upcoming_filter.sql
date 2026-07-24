DROP FUNCTION IF EXISTS public.admin_get_all_cleanings (text, uuid, uuid, text, boolean, int, int, text, text);
DROP FUNCTION IF EXISTS public.admin_get_all_cleanings (text, uuid, uuid, text, int, int, text, text);

CREATE
OR REPLACE FUNCTION public.admin_get_all_cleanings (
    p_status TEXT DEFAULT NULL,
    p_cleaner_id UUID DEFAULT NULL,
    p_host_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_upcoming BOOLEAN DEFAULT NULL,
    p_unassigned BOOLEAN DEFAULT NULL,
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
    LEFT JOIN auth.users au_host ON c.host_id = au_host.id
    LEFT JOIN auth.users au_cleaner ON c.cleaner_id = au_cleaner.id
    WHERE 
        (p_status IS NULL OR c.status::TEXT = p_status)
        AND (p_cleaner_id IS NULL OR c.cleaner_id = p_cleaner_id)
        AND (p_host_id IS NULL OR c.host_id = p_host_id)
        AND (p_search IS NULL OR hp.full_name ILIKE '%' || p_search || '%' OR cp.full_name ILIKE '%' || p_search || '%' OR pr.address_line_1 ILIKE '%' || p_search || '%' OR pr.postcode ILIKE '%' || p_search || '%' OR pr.town_city ILIKE '%' || p_search || '%')
        AND (p_upcoming IS NULL OR p_upcoming = FALSE OR c.scheduled_start >= NOW())
        AND (p_unassigned IS NULL OR (p_unassigned = TRUE AND c.cleaner_id IS NULL))
        AND c.deleted_at IS NULL
        AND (au_host.banned_until IS NULL OR au_host.banned_until < NOW())
        AND (au_cleaner.banned_until IS NULL OR au_cleaner.banned_until < NOW())
    ORDER BY
        CASE WHEN p_sort_field IN ('date', 'time') AND p_sort_direction = 'asc' THEN c.scheduled_start END ASC,
        CASE WHEN p_sort_field IN ('date', 'time') AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN c.scheduled_start END DESC,
        CASE WHEN p_sort_field IN ('property', 'property_address') AND p_sort_direction = 'asc' THEN pr.address_line_1 END ASC,
        CASE WHEN p_sort_field IN ('property', 'property_address') AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN pr.address_line_1 END DESC,
        CASE WHEN p_sort_field = 'property_postcode' AND p_sort_direction = 'asc' THEN pr.postcode END ASC,
        CASE WHEN p_sort_field = 'property_postcode' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN pr.postcode END DESC,
        CASE WHEN p_sort_field = 'property_town_city' AND p_sort_direction = 'asc' THEN pr.town_city END ASC,
        CASE WHEN p_sort_field = 'property_town_city' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN pr.town_city END DESC,
        CASE WHEN p_sort_field IN ('host', 'host_name') AND p_sort_direction = 'asc' THEN hp.full_name END ASC,
        CASE WHEN p_sort_field IN ('host', 'host_name') AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN hp.full_name END DESC,
        CASE WHEN p_sort_field IN ('cleaner', 'cleaner_name') AND p_sort_direction = 'asc' THEN cp.full_name END ASC,
        CASE WHEN p_sort_field IN ('cleaner', 'cleaner_name') AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN cp.full_name END DESC,
        CASE WHEN p_sort_field IN ('status') AND p_sort_direction = 'asc' THEN c.status END ASC,
        CASE WHEN p_sort_field IN ('status') AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN c.status END DESC,
        CASE WHEN p_sort_field IN ('cost', 'service_cost') AND p_sort_direction = 'asc' THEN c.service_cost END ASC,
        CASE WHEN p_sort_field IN ('cost', 'service_cost') AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN c.service_cost END DESC,
        CASE WHEN p_sort_field = 'cleaner_pay' AND p_sort_direction = 'asc' THEN c.cleaner_pay END ASC,
        CASE WHEN p_sort_field = 'cleaner_pay' AND (p_sort_direction IS NULL OR p_sort_direction = 'desc') THEN c.cleaner_pay END DESC,
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

DROP FUNCTION IF EXISTS public.admin_get_cleanings_count (text, uuid, uuid, text, boolean);
DROP FUNCTION IF EXISTS public.admin_get_cleanings_count (text, uuid, uuid, text);

CREATE
OR REPLACE FUNCTION public.admin_get_cleanings_count (
    p_status TEXT DEFAULT NULL,
    p_cleaner_id UUID DEFAULT NULL,
    p_host_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_upcoming BOOLEAN DEFAULT NULL,
    p_unassigned BOOLEAN DEFAULT NULL
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
    LEFT JOIN auth.users au_host ON c.host_id = au_host.id
    LEFT JOIN auth.users au_cleaner ON c.cleaner_id = au_cleaner.id
    WHERE (p_status IS NULL OR c.status::TEXT = p_status)
    AND (p_cleaner_id IS NULL OR c.cleaner_id = p_cleaner_id)
    AND (p_host_id IS NULL OR c.host_id = p_host_id)
    AND (p_search IS NULL OR hp.full_name ILIKE '%' || p_search || '%' OR cp.full_name ILIKE '%' || p_search || '%' OR pr.address_line_1 ILIKE '%' || p_search || '%' OR pr.postcode ILIKE '%' || p_search || '%' OR pr.town_city ILIKE '%' || p_search || '%')
    AND (p_upcoming IS NULL OR p_upcoming = FALSE OR c.scheduled_start >= NOW())
    AND (p_unassigned IS NULL OR (p_unassigned = TRUE AND c.cleaner_id IS NULL))
    AND c.deleted_at IS NULL
    AND (au_host.banned_until IS NULL OR au_host.banned_until < NOW())
    AND (au_cleaner.banned_until IS NULL OR au_cleaner.banned_until < NOW()));
END; $$;

REVOKE
EXECUTE ON FUNCTION public.admin_get_cleanings_count
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_cleanings_count TO authenticated;