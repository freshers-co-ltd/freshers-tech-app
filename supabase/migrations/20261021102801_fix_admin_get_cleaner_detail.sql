DROP FUNCTION IF EXISTS public.admin_get_cleaner_detail (UUID, TEXT, TEXT);

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
    cleaner_stats JSONB,
    is_invited BOOLEAN,
    host_subscription_status TEXT
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
        ),
        p.is_invited,
        p.host_subscription_status::TEXT
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.id = p_cleaner_id AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_cleaner_detail (uuid, text, text)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_cleaner_detail (uuid, text, text) TO authenticated;
