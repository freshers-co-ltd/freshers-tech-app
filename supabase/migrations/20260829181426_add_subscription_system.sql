ALTER TABLE public.profiles
ADD COLUMN is_invited BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TYPE public.subscription_status AS ENUM('active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused');

CREATE TABLE
    public.subscriptions (
        id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
        host_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
        stripe_customer_id TEXT NOT NULL,
        stripe_subscription_id TEXT NOT NULL UNIQUE,
        stripe_price_id TEXT NOT NULL,
        status public.subscription_status NOT NULL DEFAULT 'incomplete',
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at TIMESTAMP WITH TIME ZONE,
        canceled_at TIMESTAMP WITH TIME ZONE,
        pending_cancellation BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE INDEX idx_subscriptions_host_id ON public.subscriptions (host_id);

CREATE UNIQUE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions (stripe_customer_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
ADD COLUMN host_subscription_status public.subscription_status;

CREATE POLICY "Hosts can view own subscription" ON public.subscriptions FOR
SELECT
    USING (host_id = auth.uid ());

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL USING (auth.role () = 'service_role');

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR
SELECT
    USING (
        (
            SELECT
                role
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
        ) = 'admin'
    );

CREATE
OR REPLACE FUNCTION public.sync_subscription_status_to_profile () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    UPDATE public.profiles
    SET host_subscription_status = NEW.status
    WHERE id = NEW.host_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscription_status_change
AFTER INSERT
OR
UPDATE OF status ON public.subscriptions FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_status_to_profile ();

CREATE
OR REPLACE FUNCTION public.sync_subscription_status_on_delete () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    UPDATE public.profiles
    SET host_subscription_status = (
        SELECT status FROM public.subscriptions
        WHERE host_id = OLD.host_id
        ORDER BY created_at DESC
        LIMIT 1
    )
    WHERE id = OLD.host_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscription_deleted
AFTER DELETE ON public.subscriptions FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_status_on_delete ();

CREATE TRIGGER set_subscriptions_updated_at BEFORE
UPDATE ON public.subscriptions FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column ();

CREATE
OR REPLACE FUNCTION public.notification_exists (p_user_id UUID, p_type public.notification_type, p_interval INTERVAL DEFAULT INTERVAL '5 minutes') RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_user_id
          AND type = p_type
          AND created_at > NOW() - p_interval
    );
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TYPE public.notification_type
ADD VALUE IF NOT EXISTS 'subscription_active';

ALTER TYPE public.notification_type
ADD VALUE IF NOT EXISTS 'subscription_payment_failed';

ALTER TYPE public.notification_type
ADD VALUE IF NOT EXISTS 'subscription_canceled';

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE
OR REPLACE FUNCTION public.handle_new_user_after () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_invited)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        (NEW.raw_user_meta_data->>'role')::public.user_role,
        COALESCE((NEW.raw_user_meta_data->>'is_invited')::boolean, FALSE)
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created_after ON auth.users;

CREATE TRIGGER on_auth_user_created_after
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_after ();

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
    DELETE FROM public.subscriptions WHERE host_id = p_user_id;

    INSERT INTO public.audit_logs (actor_id, target_id, target_table, action_type, new_data)
    VALUES ((SELECT auth.uid()), p_user_id, 'user_account', 'PURGE_USER_PII',
            jsonb_build_object('purged_at', now()));
END;
$$;

REVOKE
SELECT
    ON public.profiles
FROM
    authenticated;

GRANT
SELECT
    (
        id,
        email,
        full_name,
        avatar_url,
        role,
        deleted_at,
        is_verified,
        is_invited,
        host_subscription_status
    ) ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.admin_get_users (TEXT, TEXT, INT, INT, TEXT, TEXT);

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
    total_user_count INT,
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
        (SELECT count(*)::INT FROM public.profiles p2 WHERE p2.deleted_at IS NULL AND (p_role IS NULL OR p2.role::TEXT = p_role) AND (p_search IS NULL OR p2.full_name ILIKE '%' || p_search || '%' OR p2.email ILIKE '%' || p_search || '%')),
        p.is_invited,
        p.host_subscription_status::TEXT
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.deleted_at IS NULL
        AND (p_role IS NULL OR p.role::TEXT = p_role)
        AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
    GROUP BY p.id, p.email, p.full_name, p.role, p.is_verified, p.avatar_url, p.last_seen_at, p.deleted_at, au.banned_until, p.is_invited, p.host_subscription_status
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

DROP FUNCTION IF EXISTS public.admin_get_host_detail (UUID, TEXT, TEXT, TEXT, TEXT);

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
    cleaning_stats JSONB,
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
                    'id', pr.id,
                    'address_line_1', pr.address_line_1,
                    'postcode', pr.postcode,
                    'town_city', pr.town_city,
                    'type', pr.type,
                    'bedrooms', pr.bedrooms,
                    'bathrooms', pr.bathrooms,
                    'main_image_url', pr.main_image_url,
                    'extra_images_urls', pr.extra_images_urls,
                    'price_per_cleaning', pr.price_per_cleaning,
                    'cleaner_pay_override', pr.cleaner_pay_override,
                    'main_cleaner_id', pr.main_cleaner_id,
                    'main_cleaner_name', mc.full_name,
                    'created_at', pr.created_at
                ) AS row
                FROM public.properties pr
                LEFT JOIN public.profiles mc ON mc.id = pr.main_cleaner_id
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
                            WHEN 'cleaner_pay_override' THEN pr.cleaner_pay_override::text
                            WHEN 'main_cleaner_name' THEN mc.full_name
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
                            WHEN 'cleaner_pay_override' THEN pr.cleaner_pay_override::text
                            WHEN 'main_cleaner_name' THEN mc.full_name
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
        ),
        p.is_invited,
        p.host_subscription_status::TEXT
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.id = p_host_id AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.admin_get_host_detail (uuid, text, text, text, text)
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.admin_get_host_detail (uuid, text, text, text, text) TO authenticated;

-- Make existing hosts have is_invited = TRUE, since they were invited to the platform by default
UPDATE public.profiles
SET
    is_invited = TRUE
WHERE
    role = 'host'
    AND is_invited = FALSE;