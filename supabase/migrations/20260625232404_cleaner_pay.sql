CREATE TABLE cleaner_pay_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 14.00,
  target_times JSONB NOT NULL DEFAULT '{"studio": 1.5, "1_bed": 2, "2_bed": 2.5, "3_bed": 3.5, "4_bed": 4.5}',
  bathroom_time NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cleaner_pay_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to cleaner_pay_config" ON cleaner_pay_config FOR ALL TO authenticated USING (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

INSERT INTO cleaner_pay_config (hourly_rate, target_times) 
VALUES (14.00, '{"studio": 1.5, "1_bed": 2, "2_bed": 2.5, "3_bed": 3.5, "4_bed": 4.5}');

CREATE OR REPLACE FUNCTION public.get_cleaner_pay_config()
RETURNS TABLE (hourly_rate NUMERIC, target_times JSONB, bathroom_time NUMERIC, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY SELECT c.hourly_rate, c.target_times, c.bathroom_time, c.updated_at FROM cleaner_pay_config c WHERE c.id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_cleaner_pay_config(
  p_hourly_rate NUMERIC,
  p_target_times JSONB,
  p_bathroom_time NUMERIC DEFAULT 0.5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin') THEN
    RAISE EXCEPTION 'Unauthorised: Only admins can perform this action';
  END IF;
  
  UPDATE cleaner_pay_config 
  SET hourly_rate = p_hourly_rate, 
      target_times = p_target_times,
      bathroom_time = p_bathroom_time,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cleaner_pay_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cleaner_pay_config() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_cleaner_pay_config FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_cleaner_pay_config TO authenticated;

CREATE
OR REPLACE FUNCTION public.set_cleaner_pay_on_cleaning_insert () RETURNS TRIGGER
SET
    search_path = public AS $$
DECLARE
    v_property_type TEXT;
    v_bedrooms INT;
    v_bathrooms INT;
    v_hourly_rate NUMERIC;
    v_target_times JSONB;
    v_bathroom_time NUMERIC;
    v_target_hours NUMERIC;
BEGIN
    SELECT p.type, p.bedrooms, p.bathrooms INTO v_property_type, v_bedrooms, v_bathrooms
    FROM public.properties p WHERE p.id = NEW.property_id;

    SELECT c.hourly_rate, c.target_times, c.bathroom_time INTO v_hourly_rate, v_target_times, v_bathroom_time
    FROM cleaner_pay_config c WHERE c.id = 1;

    IF v_property_type = 'studio' THEN
        v_target_hours := (v_target_times->>'studio')::NUMERIC;
    ELSE
        v_target_hours := (v_target_times->>CONCAT(v_bedrooms, '_bed'))::NUMERIC;
        IF v_target_hours IS NULL THEN
            SELECT (v_target_times->>key)::NUMERIC INTO v_target_hours
            FROM jsonb_object_keys(v_target_times) AS key
            WHERE key ~ '^[0-9]+_bed$'
            ORDER BY LENGTH(key) DESC, key DESC
            LIMIT 1;
        END IF;
    END IF;

    v_target_hours := v_target_hours + GREATEST(0, v_bathrooms - 1) * COALESCE(v_bathroom_time, 0.5);

    NEW.cleaner_pay := ROUND(v_hourly_rate * COALESCE(v_target_hours, 0), 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_cleaner_pay_on_cleaning_insert BEFORE INSERT ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.set_cleaner_pay_on_cleaning_insert ();

REVOKE
EXECUTE ON FUNCTION public.set_cleaner_pay_on_cleaning_insert ()
FROM
    PUBLIC,
    anon,
    authenticated;

CREATE
OR REPLACE FUNCTION public.set_service_cost_on_cleaning_insert () RETURNS TRIGGER
SET
    search_path = public AS $$
DECLARE
    v_price NUMERIC;
BEGIN
    SELECT price_per_cleaning INTO v_price
    FROM public.properties WHERE id = NEW.property_id;

    NEW.service_cost := v_price;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_service_cost_on_cleaning_insert BEFORE INSERT ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.set_service_cost_on_cleaning_insert ();

REVOKE
EXECUTE ON FUNCTION public.set_service_cost_on_cleaning_insert ()
FROM
    PUBLIC,
    anon,
    authenticated;

REVOKE SELECT ON TABLE public.cleaner_pay_config FROM authenticated;

COMMENT ON TABLE public.cleaner_pay_config IS '@omit';
