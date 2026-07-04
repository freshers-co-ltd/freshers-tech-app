DROP FUNCTION IF EXISTS public.admin_update_cleaning (uuid, text[], text, timestamp with time zone, boolean, numeric);

CREATE
OR REPLACE FUNCTION public.admin_update_cleaning (
    p_cleaning_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE,
    p_cleaner_pay NUMERIC(10, 2) DEFAULT NULL,
    p_service_cost NUMERIC(10, 2) DEFAULT NULL
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
        cleaner_pay = COALESCE(p_cleaner_pay, cleaner_pay),
        service_cost = COALESCE(p_service_cost, service_cost),
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
