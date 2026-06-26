CREATE
OR REPLACE FUNCTION public.create_cleaning_request (
    p_property_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE
) RETURNS UUID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_cleaning_id UUID;
    v_host_id UUID;
    v_property_type TEXT;
    v_bedrooms INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = (SELECT auth.uid()) AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
    END IF;
    
    SELECT p.host_id, p.type, p.bedrooms INTO v_host_id, v_property_type, v_bedrooms
    FROM public.properties p WHERE p.id = p_property_id;
    
    INSERT INTO public.cleanings (property_id, host_id, scheduled_start, status, information, stocks_included) 
    VALUES (p_property_id, v_host_id, p_scheduled_start, 'requested', p_information, p_stocks_included)
    RETURNING id INTO v_cleaning_id;
    INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
    SELECT v_cleaning_id, description, false, false FROM standard_tasks WHERE is_active = true;
    IF p_custom_tasks IS NOT NULL THEN
        INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
        SELECT v_cleaning_id, task_desc, true, false FROM unnest(p_custom_tasks) AS task_desc;
    END IF;
    RETURN v_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.create_cleaning_request
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.create_cleaning_request TO authenticated;

CREATE
OR REPLACE FUNCTION public.update_cleaning_request (
    p_cleaning_id UUID,
    p_custom_tasks TEXT[],
    p_information TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_stocks_included BOOLEAN DEFAULT FALSE
) RETURNS UUID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.cleanings WHERE id = p_cleaning_id AND host_id = (SELECT auth.uid()) AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.cleanings
    SET scheduled_start = p_scheduled_start, information = p_information, stocks_included = p_stocks_included
    WHERE id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.cleaning_tasks SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND is_custom = true;
    IF p_custom_tasks IS NOT NULL THEN
        INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
        SELECT p_cleaning_id, task_desc, true, false FROM unnest(p_custom_tasks) AS task_desc WHERE task_desc <> '';
    END IF;
    RETURN p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.update_cleaning_request
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.update_cleaning_request TO authenticated;

CREATE
OR REPLACE FUNCTION public.handle_cleaning_status_transitions () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF OLD.cleaner_id IS NULL AND NEW.cleaner_id IS NOT NULL THEN
        NEW.status := 'confirmed';
    END IF;
    IF OLD.clock_in_time IS NULL AND NEW.clock_in_time IS NOT NULL THEN
        IF NEW.clock_in_time::DATE != NEW.scheduled_start::DATE THEN
            RAISE EXCEPTION 'Cannot clock in: must be on the same day as the scheduled cleaning.';
        END IF;
        IF NEW.clock_in_time < NEW.scheduled_start - INTERVAL '10 minutes' THEN
            RAISE EXCEPTION 'Cannot clock in: can only clock in up to 10 minutes before the scheduled start time.';
        END IF;
        NEW.status := 'in_progress';
    END IF;
    IF OLD.clock_out_time IS NULL AND NEW.clock_out_time IS NOT NULL THEN
        NEW.status := 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_cleaning_timestamp_update BEFORE
UPDATE ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.handle_cleaning_status_transitions ();

REVOKE
EXECUTE ON FUNCTION public.handle_cleaning_status_transitions ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.soft_delete_cleaning (p_cleaning_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_status public.cleaning_status;
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';

    IF NOT v_is_admin THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.cleanings 
            WHERE id = p_cleaning_id 
            AND host_id = (SELECT auth.uid()) 
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
        END IF;

        SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id;
        IF v_status NOT IN ('completed', 'cancelled') THEN
            RAISE EXCEPTION 'Soft delete not allowed for this status. Use cancel instead.' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    UPDATE public.cleanings SET deleted_at = now() WHERE id = p_cleaning_id;
    UPDATE public.cleaning_tasks SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.evidence_media SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
    UPDATE public.cleaning_reports SET deleted_at = now() WHERE cleaning_id = p_cleaning_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_cleaning
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_cleaning TO authenticated;

CREATE
OR REPLACE FUNCTION public.host_cancel_cleaning (p_cleaning_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_status public.cleaning_status;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.cleanings 
        WHERE id = p_cleaning_id 
        AND host_id = (SELECT auth.uid()) 
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Unauthorised or cleaning not found' USING ERRCODE = 'P0001';
    END IF;

    SELECT status INTO v_status FROM public.cleanings WHERE id = p_cleaning_id;

    IF v_status != 'requested' THEN
        RAISE EXCEPTION 'Cannot cancel a cleaning that is already in progress, confirmed, or completed' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleanings SET status = 'cancelled', updated_at = now() WHERE id = p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.host_cancel_cleaning
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.host_cancel_cleaning TO authenticated;

CREATE
OR REPLACE FUNCTION public.soft_delete_cleaning_task (p_task_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.cleaning_tasks t
        JOIN public.cleanings c ON t.cleaning_id = c.id
        WHERE t.id = p_task_id 
        AND c.host_id = (SELECT auth.uid()) 
        AND t.deleted_at IS NULL
    ) AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleaning_tasks SET deleted_at = now() WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_cleaning_task
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_cleaning_task TO authenticated;

CREATE
OR REPLACE FUNCTION public.soft_delete_evidence_media (p_evidence_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.evidence_media 
        WHERE id = p_evidence_id 
        AND uploader_id = (SELECT auth.uid()) 
        AND deleted_at IS NULL
    ) AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.evidence_media SET deleted_at = now() WHERE id = p_evidence_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_evidence_media
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_evidence_media TO authenticated;

CREATE
OR REPLACE FUNCTION public.soft_delete_cleaning_report (p_report_id UUID) RETURNS VOID SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.cleaning_reports 
        WHERE id = p_report_id 
        AND cleaner_id = (SELECT auth.uid()) 
        AND deleted_at IS NULL
    ) AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorised or record already deleted' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.cleaning_reports SET deleted_at = now() WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql;

REVOKE
EXECUTE ON FUNCTION public.soft_delete_cleaning_report
FROM
    PUBLIC,
    anon;

GRANT
EXECUTE ON FUNCTION public.soft_delete_cleaning_report TO authenticated;
