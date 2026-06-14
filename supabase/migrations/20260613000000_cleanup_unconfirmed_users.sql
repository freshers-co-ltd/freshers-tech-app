CREATE
OR REPLACE FUNCTION public.cleanup_unconfirmed_users (days_threshold int DEFAULT 7) RETURNS int LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    deleted_count int := 0;
    ghost_record record;
BEGIN
    FOR ghost_record IN
        SELECT au.id
        FROM auth.users au
        WHERE (au.email_confirmed_at IS NULL
   OR (au.email_confirmed_at IS NOT NULL
       AND (au.raw_user_meta_data->>'password_set' IS NULL
            OR au.raw_user_meta_data->>'password_set' = 'false')))
          AND au.created_at < now() - (days_threshold || ' days')::interval
    LOOP
        DELETE FROM public.profiles WHERE id = ghost_record.id;
        DELETE FROM auth.users WHERE id = ghost_record.id;
        deleted_count := deleted_count + 1;
    END LOOP;

    RETURN deleted_count;
END;
$$;

SELECT
    cron.schedule ('cleanup-unconfirmed-users', '0 2 * * *', $$ SELECT public.cleanup_unconfirmed_users(); $$);

REVOKE
SELECT
    (id, full_name, avatar_url, role, deleted_at) ON public.profiles
FROM
    authenticated;

GRANT
SELECT
    (id, full_name, avatar_url, role, deleted_at, is_verified) ON public.profiles TO authenticated;

GRANT
SELECT
    ON public.properties TO authenticated;

GRANT
SELECT
    ON public.cleanings TO authenticated;

GRANT
SELECT
    ON public.cleaning_tasks TO authenticated;

GRANT
SELECT
    ON public.evidence_media TO authenticated;

GRANT
SELECT
    ON public.cleaning_reports TO authenticated;

GRANT
SELECT
    ON public.standard_tasks TO authenticated;

GRANT
SELECT
    ON public.notifications TO authenticated;

GRANT
SELECT
    ON public.notification_preferences TO authenticated;

GRANT
SELECT
    ON public.push_subscriptions TO authenticated;

GRANT
SELECT
    ON public.profiles_public TO authenticated;

GRANT
SELECT
    ON public.platform_stats TO authenticated;

GRANT
UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

GRANT INSERT,
UPDATE,
DELETE ON public.properties TO authenticated;

GRANT
UPDATE,
DELETE ON public.cleanings TO authenticated;

GRANT INSERT,
UPDATE,
DELETE ON public.cleaning_tasks TO authenticated;

GRANT INSERT,
DELETE ON public.evidence_media TO authenticated;

GRANT INSERT,
UPDATE ON public.cleaning_reports TO authenticated;

GRANT
UPDATE,
DELETE ON public.notifications TO authenticated;

GRANT
UPDATE ON public.notification_preferences TO authenticated;

GRANT INSERT,
DELETE ON public.push_subscriptions TO authenticated;