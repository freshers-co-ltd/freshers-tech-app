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
    deleted_at TIMESTAMP WITH TIME ZONE,
    total_user_count INT
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
        p.deleted_at,
        (SELECT count(*)::INT FROM public.profiles p2 WHERE p2.deleted_at IS NULL AND (p_role IS NULL OR p2.role::TEXT = p_role) AND (p_search IS NULL OR p2.full_name ILIKE '%' || p_search || '%' OR p2.email ILIKE '%' || p_search || '%'))
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.deleted_at IS NULL
        AND (p_role IS NULL OR p.role::TEXT = p_role)
        AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
    GROUP BY p.id, p.email, p.full_name, p.role, p.is_verified, p.avatar_url, p.last_seen_at, p.deleted_at, au.banned_until
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

REVOKE
EXECUTE ON FUNCTION public.admin_get_users
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_users TO authenticated;

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

REVOKE
EXECUTE ON FUNCTION public.update_user_presence ()
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.update_user_presence () TO authenticated;

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
            SELECT COALESCE(jsonb_agg(row ORDER BY
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
            ), '[]'::jsonb)
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
            SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
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

CREATE
OR REPLACE FUNCTION public.admin_get_users_count (p_role TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL) RETURNS INT SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
    RETURN (
        SELECT count(*)::INT 
        FROM public.profiles p
        WHERE p.deleted_at IS NULL
            AND (p_role IS NULL OR p.role::TEXT = p_role)
            AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
    );
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_users_count
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_users_count TO authenticated;

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
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
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
    LEFT JOIN auth.identities ai ON ai.provider = 'email' AND ai.user_id::UUID = p.id::UUID
    WHERE p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_user_stats ()
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_user_stats () TO authenticated;

CREATE
OR REPLACE FUNCTION public.admin_ban_user (target_user_id UUID, is_banned BOOLEAN) RETURNS VOID SECURITY DEFINER
SET
    search_path = auth,
    public AS $$
BEGIN
  IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
    RAISE EXCEPTION 'Unauthorised: Only admins can perform this action';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot perform action on a deleted user';
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

REVOKE
EXECUTE ON FUNCTION public.admin_ban_user (uuid, boolean)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_ban_user (uuid, boolean) TO authenticated;

CREATE
OR REPLACE FUNCTION public.purge_user_pii (p_user_id UUID) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public,
    extensions AS $$
BEGIN
    IF (SELECT auth.uid()) != p_user_id
       AND ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin')
    THEN
        RAISE EXCEPTION 'Unauthorised: Only admins or the user themselves can purge PII' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.profiles
    SET email = encode(gen_random_bytes(3), 'hex') || '@deleted',
        full_name = '[Deleted User]',
        avatar_url = NULL,
        last_seen_at = NULL,
        deleted_at = now()
    WHERE id = p_user_id;

    UPDATE auth.users
    SET
      email = encode(gen_random_bytes(3), 'hex') || '@deleted',
      banned_until = NOW() + INTERVAL '100 years',
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || JSONB_BUILD_OBJECT('banned_until', (NOW() + INTERVAL '100 years')::TEXT),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "[Deleted User]", "avatar_url": null}'::jsonb
    WHERE id = p_user_id;

    DELETE FROM auth.refresh_tokens
    WHERE user_id = p_user_id::TEXT;

    UPDATE public.properties
    SET address_line_1 = '[Deleted]',
        address_line_2 = NULL,
        town_city = '[Deleted]',
        postcode = '[Deleted]',
        main_image_url = '[deleted]'
    WHERE host_id = p_user_id;

    UPDATE public.cleanings
    SET information = '[Deleted]'
    WHERE host_id = p_user_id;

    DELETE FROM public.notifications WHERE user_id = p_user_id;
    DELETE FROM public.notification_preferences WHERE user_id = p_user_id;
    DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;

    INSERT INTO public.audit_logs (actor_id, target_id, target_table, action_type, new_data)
    VALUES ((SELECT auth.uid()), p_user_id, 'user_account', 'PURGE_USER_PII',
            jsonb_build_object('purged_at', now()));
END;
$$;

REVOKE
EXECUTE ON FUNCTION public.purge_user_pii (UUID)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.purge_user_pii (UUID) TO authenticated;

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
SET
    search_path = public AS $$
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;
    RETURN QUERY SELECT al.id, al.actor_id, al.target_id, al.target_table, al.action_type, al.old_data, al.new_data, al.created_at, COALESCE(p.full_name, 'System')
    FROM public.audit_logs al LEFT JOIN public.profiles p ON al.actor_id = p.id
    WHERE (p_target_table IS NULL OR al.target_table = p_target_table)
      AND (p_action_type IS NULL OR al.action_type = p_action_type)
      AND (p_date_from IS NULL OR al.created_at >= p_date_from)
      AND (p_date_to IS NULL OR al.created_at <= p_date_to)
    ORDER BY al.created_at DESC LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_audit_logs
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_audit_logs TO authenticated;
