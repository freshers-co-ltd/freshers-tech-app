CREATE TABLE cleaner_pay_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 14.00,
  target_times JSONB NOT NULL DEFAULT '{"studio": 1.5, "1_bed": 2, "2_bed": 2.5, "3_bed": 3.5, "4_bed": 4.5}',
  host_multipliers JSONB NOT NULL DEFAULT '{"studio": 1, "1_bed": 1, "2_bed": 1, "3_bed": 1, "4_bed": 1}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cleaner_pay_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to cleaner_pay_config" ON cleaner_pay_config FOR ALL TO authenticated USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

INSERT INTO cleaner_pay_config (hourly_rate, target_times, host_multipliers) 
VALUES (14.00, '{"studio": 1.5, "1_bed": 2, "2_bed": 2.5, "3_bed": 3.5, "4_bed": 4.5}', '{"studio": 1, "1_bed": 1, "2_bed": 1, "3_bed": 1, "4_bed": 1}');

CREATE OR REPLACE FUNCTION public.get_cleaner_pay_config()
RETURNS TABLE (hourly_rate NUMERIC, target_times JSONB, host_multipliers JSONB, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT c.hourly_rate, c.target_times, c.host_multipliers, c.updated_at FROM cleaner_pay_config c WHERE c.id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_cleaner_pay_config(
  p_hourly_rate NUMERIC,
  p_target_times JSONB,
  p_host_multipliers JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE cleaner_pay_config 
  SET hourly_rate = p_hourly_rate, 
      target_times = p_target_times,
      host_multipliers = p_host_multipliers,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;