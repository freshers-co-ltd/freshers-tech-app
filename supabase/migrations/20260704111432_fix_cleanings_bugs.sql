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
    LEFT JOIN auth.users au_host ON c.host_id = au_host.id
    LEFT JOIN auth.users au_cleaner ON c.cleaner_id = au_cleaner.id
    WHERE 
        (p_status IS NULL OR c.status::TEXT = p_status)
        AND (p_cleaner_id IS NULL OR c.cleaner_id = p_cleaner_id)
        AND (p_host_id IS NULL OR c.host_id = p_host_id)
        AND (p_search IS NULL OR hp.full_name ILIKE '%' || p_search || '%' OR cp.full_name ILIKE '%' || p_search || '%' OR pr.address_line_1 ILIKE '%' || p_search || '%' OR pr.postcode ILIKE '%' || p_search || '%')
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
    LEFT JOIN auth.users au_host ON c.host_id = au_host.id
    LEFT JOIN auth.users au_cleaner ON c.cleaner_id = au_cleaner.id
    WHERE (p_status IS NULL OR c.status::TEXT = p_status)
    AND (p_cleaner_id IS NULL OR c.cleaner_id = p_cleaner_id)
    AND (p_host_id IS NULL OR c.host_id = p_host_id)
    AND (p_search IS NULL OR hp.full_name ILIKE '%' || p_search || '%' OR cp.full_name ILIKE '%' || p_search || '%' OR pr.address_line_1 ILIKE '%' || p_search || '%' OR pr.postcode ILIKE '%' || p_search || '%')
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

DROP FUNCTION IF EXISTS public.admin_get_host_detail (UUID, TEXT, TEXT);

CREATE
OR REPLACE FUNCTION public.admin_get_host_detail (
    p_host_id UUID,
    p_properties_sort_field TEXT DEFAULT 'created_at',
    p_properties_sort_direction TEXT DEFAULT 'desc',
    p_cleanings_sort_field TEXT DEFAULT 'created_at',
    p_cleanings_sort_direction TEXT DEFAULT 'desc'
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
    deleted_at TIMESTAMP WITH TIME ZONE,
    properties JSONB,
    cleanings JSONB,
    cleaning_stats JSONB
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
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
        p.deleted_at,
        (
            SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
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
                ORDER BY
                    CASE WHEN p_properties_sort_direction = 'asc' THEN
                        CASE p_properties_sort_field
                            WHEN 'address_line_1' THEN pr.address_line_1
                            WHEN 'postcode' THEN pr.postcode
                            WHEN 'town_city' THEN pr.town_city
                            WHEN 'type' THEN pr.type::text
                            WHEN 'bedrooms' THEN pr.bedrooms::text
                            WHEN 'bathrooms' THEN pr.bathrooms::text
                            WHEN 'price_per_cleaning' THEN pr.price_per_cleaning::text
                            ELSE pr.created_at::text
                        END
                    END ASC NULLS LAST,
                    CASE WHEN p_properties_sort_direction = 'desc' OR p_properties_sort_direction IS NULL THEN
                        CASE p_properties_sort_field
                            WHEN 'address_line_1' THEN pr.address_line_1
                            WHEN 'postcode' THEN pr.postcode
                            WHEN 'town_city' THEN pr.town_city
                            WHEN 'type' THEN pr.type::text
                            WHEN 'bedrooms' THEN pr.bedrooms::text
                            WHEN 'bathrooms' THEN pr.bathrooms::text
                            WHEN 'price_per_cleaning' THEN pr.price_per_cleaning::text
                            ELSE pr.created_at::text
                        END
                    END DESC NULLS LAST
            ) AS props
        ),
        (
            SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'id', c.id,
                    'status', c.status,
                    'scheduled_start', c.scheduled_start,
                    'service_cost', c.service_cost,
                    'cleaner_pay', c.cleaner_pay,
                    'cleaner_id', c.cleaner_id,
                    'property_id', c.property_id,
                    'created_at', c.created_at,
                    'cleaner_name', cl.full_name,
                    'host_name', hp.full_name,
                    'property_town_city', pr.town_city,
                    'property_address', pr.address_line_1,
                    'property_postcode', pr.postcode
                ) AS row
                FROM public.cleanings c
                LEFT JOIN public.profiles cl ON cl.id = c.cleaner_id
                LEFT JOIN public.profiles hp ON c.host_id = hp.id
                LEFT JOIN public.properties pr ON c.property_id = pr.id
                WHERE c.host_id = p_host_id AND c.deleted_at IS NULL
                ORDER BY
                    CASE WHEN p_cleanings_sort_direction = 'asc' THEN
                        CASE p_cleanings_sort_field
                            WHEN 'date' THEN c.scheduled_start::text
                            WHEN 'time' THEN c.scheduled_start::text
                            WHEN 'status' THEN c.status::text
                            WHEN 'host_name' THEN hp.full_name
                            WHEN 'cleaner_name' THEN cl.full_name
                            WHEN 'service_cost' THEN c.service_cost::text
                            WHEN 'cleaner_pay' THEN c.cleaner_pay::text
                            ELSE c.created_at::text
                        END
                    END ASC NULLS LAST,
                    CASE WHEN p_cleanings_sort_direction = 'desc' OR p_cleanings_sort_direction IS NULL THEN
                        CASE p_cleanings_sort_field
                            WHEN 'date' THEN c.scheduled_start::text
                            WHEN 'time' THEN c.scheduled_start::text
                            WHEN 'status' THEN c.status::text
                            WHEN 'host_name' THEN hp.full_name
                            WHEN 'cleaner_name' THEN cl.full_name
                            WHEN 'service_cost' THEN c.service_cost::text
                            WHEN 'cleaner_pay' THEN c.cleaner_pay::text
                            ELSE c.created_at::text
                        END
                    END DESC NULLS LAST
                LIMIT 50
            ) AS props
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
    WHERE p.id = p_host_id AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_host_detail
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_host_detail TO authenticated;

DROP FUNCTION IF EXISTS public.admin_get_cleaner_detail (UUID);

CREATE
OR REPLACE FUNCTION public.admin_get_cleaner_detail (
    p_cleaner_id UUID,
    p_cleanings_sort_field TEXT DEFAULT 'scheduled_start',
    p_cleanings_sort_direction TEXT DEFAULT 'desc'
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
    deleted_at TIMESTAMP WITH TIME ZONE,
    assigned_cleanings JSONB,
    cleaner_stats JSONB
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
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
        p.deleted_at,
        (
            SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'id', c.id,
                    'status', c.status,
                    'scheduled_start', c.scheduled_start,
                    'service_cost', c.service_cost,
                    'cleaner_pay', c.cleaner_pay,
                    'host_id', c.host_id,
                    'property_id', c.property_id,
                    'clock_in_time', c.clock_in_time,
                    'clock_out_time', c.clock_out_time,
                    'created_at', c.created_at,
                    'host_name', hp.full_name,
                    'property_address', pr.address_line_1,
                    'property_postcode', pr.postcode,
                    'property_town_city', pr.town_city
                ) AS row
                FROM public.cleanings c
                LEFT JOIN public.profiles hp ON c.host_id = hp.id
                LEFT JOIN public.properties pr ON c.property_id = pr.id
                WHERE c.cleaner_id = p_cleaner_id AND c.deleted_at IS NULL
                ORDER BY
                    CASE WHEN p_cleanings_sort_direction = 'asc' THEN
                        CASE p_cleanings_sort_field
                            WHEN 'date' THEN c.scheduled_start::text
                            WHEN 'time' THEN c.scheduled_start::text
                            WHEN 'status' THEN c.status::text
                            WHEN 'host_name' THEN hp.full_name
                            WHEN 'cleaner_name' THEN c.scheduled_start::text
                            WHEN 'service_cost' THEN c.service_cost::text
                            WHEN 'cleaner_pay' THEN c.cleaner_pay::text
                            ELSE c.scheduled_start::text
                        END
                    END ASC NULLS LAST,
                    CASE WHEN p_cleanings_sort_direction = 'desc' OR p_cleanings_sort_direction IS NULL THEN
                        CASE p_cleanings_sort_field
                            WHEN 'date' THEN c.scheduled_start::text
                            WHEN 'time' THEN c.scheduled_start::text
                            WHEN 'status' THEN c.status::text
                            WHEN 'host_name' THEN hp.full_name
                            WHEN 'cleaner_name' THEN c.scheduled_start::text
                            WHEN 'service_cost' THEN c.service_cost::text
                            WHEN 'cleaner_pay' THEN c.cleaner_pay::text
                            ELSE c.scheduled_start::text
                        END
                    END DESC NULLS LAST
                LIMIT 50
            ) AS props
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
    WHERE p.id = p_cleaner_id AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_cleaner_detail
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_cleaner_detail TO authenticated;