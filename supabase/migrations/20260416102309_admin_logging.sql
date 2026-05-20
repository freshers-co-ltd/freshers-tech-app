CREATE TABLE
    public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        actor_id UUID REFERENCES auth.users (id),
        target_id UUID NOT NULL,
        target_table TEXT NOT NULL,
        action_type TEXT NOT NULL,
        old_data jsonb,
        new_data jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE INDEX idx_audit_logs_target_id ON public.audit_logs (target_id);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only" ON public.audit_logs FOR
SELECT
    TO authenticated USING (
        public.is_not_banned ()
        AND (
            (
                (
                    SELECT
                        auth.jwt ()
                ) -> 'app_metadata' ->> 'role'
            ) = 'admin'
        )
    );

CREATE
OR REPLACE FUNCTION public.log_admin_action () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_action text;
    v_old_meaningful jsonb;
    v_new_meaningful jsonb;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'INSERT';
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        v_old_meaningful := to_jsonb(OLD) - 'updated_at' - 'created_at';
        v_new_meaningful := to_jsonb(NEW) - 'updated_at' - 'created_at';
        IF v_old_meaningful = v_new_meaningful THEN
            RETURN NEW;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        target_id,
        target_table,
        action_type,
        old_data,
        new_data
    )
    VALUES (
        auth.uid(),
        COALESCE(NEW.id, OLD.id),
        TG_TABLE_NAME,
        v_action,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.log_admin_action() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_profiles_trigger
AFTER INSERT
OR
UPDATE
OR DELETE ON public.profiles FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action ();

CREATE TRIGGER audit_properties_trigger
AFTER INSERT
OR
UPDATE
OR DELETE ON public.properties FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action ();

CREATE TRIGGER audit_cleanings_trigger
AFTER INSERT
OR
UPDATE
OR DELETE ON public.cleanings FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action ();

CREATE TRIGGER audit_standard_tasks_trigger
AFTER INSERT
OR
UPDATE
OR DELETE ON public.standard_tasks FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action ();

CREATE TRIGGER audit_cleaning_tasks_trigger
AFTER INSERT
OR
UPDATE
OR DELETE ON public.cleaning_tasks FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action ();

CREATE TRIGGER audit_evidence_media_trigger
AFTER INSERT
OR
UPDATE
OR DELETE ON public.evidence_media FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action ();

CREATE TRIGGER audit_cleaning_reports_trigger
AFTER INSERT
OR
UPDATE
OR DELETE ON public.cleaning_reports FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action ();

REVOKE SELECT ON TABLE public.audit_logs FROM authenticated;