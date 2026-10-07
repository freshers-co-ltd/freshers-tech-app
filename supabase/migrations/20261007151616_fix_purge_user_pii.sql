CREATE
OR REPLACE FUNCTION public.purge_user_pii (p_user_id UUID) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public,
    extensions AS $$
BEGIN
    PERFORM set_config('app.purge_pii', 'on', true);

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
        main_image_url = '[deleted]',
        deleted_at = now()
    WHERE host_id = p_user_id;

    UPDATE public.cleanings
    SET information = '[Deleted]',
        deleted_at = now()
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

CREATE
OR REPLACE FUNCTION public.enforce_property_immutability () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF current_setting('app.purge_pii', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('host', 'cleaner')) THEN
        IF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at) THEN
            RAISE EXCEPTION 'Cannot modify a soft-deleted record' USING ERRCODE = '42501';
        END IF;

        IF (
            NEW.id IS DISTINCT FROM OLD.id OR
            NEW.host_id IS DISTINCT FROM OLD.host_id OR
            NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.enforce_cleaning_immutability () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF current_setting('app.purge_pii', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') THEN
        RETURN NEW;
    END IF;

    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('host', 'cleaner')) THEN
        IF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at) THEN
            RAISE EXCEPTION 'Cannot modify a soft-deleted record' USING ERRCODE = '42501';
        END IF;

        IF (
            NEW.id IS DISTINCT FROM OLD.id OR
            NEW.host_id IS DISTINCT FROM OLD.host_id OR
            NEW.property_id IS DISTINCT FROM OLD.property_id OR
            NEW.cleaner_id IS DISTINCT FROM OLD.cleaner_id OR
            NEW.service_cost IS DISTINCT FROM OLD.service_cost OR
            NEW.source IS DISTINCT FROM OLD.source OR
            NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
            RAISE EXCEPTION 'Immutable column violation' USING ERRCODE = '42501';
        END IF;

        IF ((SELECT auth.uid()) = OLD.cleaner_id AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
            RAISE EXCEPTION 'Cleaner immutable column violation' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;