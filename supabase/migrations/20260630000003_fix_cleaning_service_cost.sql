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
    v_price_per_cleaning NUMERIC;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = (SELECT auth.uid()) AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
    END IF;
    
    SELECT p.host_id, p.type, p.bedrooms, p.price_per_cleaning INTO v_host_id, v_property_type, v_bedrooms, v_price_per_cleaning
    FROM public.properties p WHERE p.id = p_property_id;
    
    INSERT INTO public.cleanings (property_id, host_id, scheduled_start, status, information, stocks_included, service_cost) 
    VALUES (p_property_id, v_host_id, p_scheduled_start, 'requested', p_information, p_stocks_included, v_price_per_cleaning)
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
    v_price_per_cleaning NUMERIC;
BEGIN
    IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Unauthorised: Only admins can perform this action' USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = p_host_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Ownership mismatch';
    END IF;
    
    SELECT p.type, p.bedrooms, p.price_per_cleaning INTO v_property_type, v_bedrooms, v_price_per_cleaning
    FROM public.properties p WHERE p.id = p_property_id;
    
    INSERT INTO public.cleanings (host_id, property_id, scheduled_start, status, information, stocks_included, service_cost)
    VALUES (p_host_id, p_property_id, p_scheduled_start, 'requested', p_information, p_stocks_included, v_price_per_cleaning)
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
OR REPLACE FUNCTION public.backfill_cleaning_service_cost () RETURNS TRIGGER
SET
    search_path = public AS $$
BEGIN
  UPDATE public.cleanings
  SET service_cost = NEW.price_per_cleaning
  WHERE property_id = NEW.id
    AND service_cost IS NULL
    AND deleted_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_backfill_cleaning_cost
AFTER
UPDATE OF price_per_cleaning ON public.properties FOR EACH ROW
EXECUTE FUNCTION public.backfill_cleaning_service_cost ();