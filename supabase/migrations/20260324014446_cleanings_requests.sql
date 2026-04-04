CREATE TYPE public.cleaning_status AS ENUM ('draft', 'requested', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.media_type AS ENUM ('image', 'video');

CREATE TABLE public.standard_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.standard_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standard tasks are viewable by all authenticated users"
ON public.standard_tasks
FOR SELECT
TO authenticated
USING (true);

CREATE TABLE public.cleanings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    cleaner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status public.cleaning_status NOT NULL DEFAULT 'draft',
    scheduled_start TIMESTAMPTZ NOT NULL,
    service_cost NUMERIC(10, 2) NOT NULL CHECK (service_cost > 0),
    instructions TEXT,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_cleanings_host_id ON public.cleanings(host_id);
CREATE INDEX idx_cleanings_property_id ON public.cleanings(property_id);
CREATE INDEX idx_cleanings_cleaner_id ON public.cleanings(cleaner_id);

ALTER TABLE public.cleanings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant cleanings"
ON public.cleanings
FOR SELECT
TO authenticated
USING (
    host_id = (SELECT auth.uid()) OR 
    cleaner_id = (SELECT auth.uid()) OR 
    (status = 'requested' AND cleaner_id IS NULL)
);

CREATE POLICY "Hosts can insert their own cleaning requests"
ON public.cleanings
FOR INSERT
TO authenticated
WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can delete their own cleaning requests"
ON public.cleanings
FOR DELETE
TO authenticated
USING (host_id = (SELECT auth.uid()));

CREATE POLICY "Users can update cleanings"
ON public.cleanings
FOR UPDATE
TO authenticated
USING (
    host_id = (SELECT auth.uid()) OR 
    cleaner_id = (SELECT auth.uid())
)
WITH CHECK (
    (host_id = (SELECT auth.uid())) OR 
    (
        cleaner_id = (SELECT auth.uid()) AND
        host_id = host_id AND
        property_id = property_id AND
        service_cost = service_cost AND
        scheduled_start = scheduled_start AND
        status = status
    )
);

CREATE TABLE public.cleaning_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleaning_id UUID NOT NULL REFERENCES public.cleanings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false NOT NULL,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_cleaning_tasks_cleaning_id ON public.cleaning_tasks(cleaning_id);

ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks for accessible cleanings"
ON public.cleaning_tasks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cleanings 
        WHERE cleanings.id = cleaning_tasks.cleaning_id 
        AND (
            cleanings.host_id = (SELECT auth.uid()) OR 
            cleanings.cleaner_id = (SELECT auth.uid()) OR 
            (cleanings.status = 'requested' AND cleanings.cleaner_id IS NULL)
        )
    )
);

CREATE POLICY "Hosts can insert tasks for their cleanings"
ON public.cleaning_tasks
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cleanings 
        WHERE cleanings.id = cleaning_tasks.cleaning_id 
        AND cleanings.host_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Hosts can delete tasks for their cleanings"
ON public.cleaning_tasks
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cleanings 
        WHERE cleanings.id = cleaning_tasks.cleaning_id 
        AND cleanings.host_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Users can update cleaning tasks"
ON public.cleaning_tasks
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cleanings 
        WHERE cleanings.id = cleaning_tasks.cleaning_id 
        AND (
            cleanings.host_id = (SELECT auth.uid()) OR 
            (cleanings.cleaner_id = (SELECT auth.uid()) AND cleanings.status = 'in_progress')
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cleanings 
        WHERE cleanings.id = cleaning_tasks.cleaning_id 
        AND (
            cleanings.host_id = (SELECT auth.uid()) OR 
            (cleanings.cleaner_id = (SELECT auth.uid()) AND cleanings.status = 'in_progress')
        )
    )
);

CREATE TABLE public.evidence_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleaning_id UUID NOT NULL REFERENCES public.cleanings(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id),
    media_url TEXT NOT NULL,
    type public.media_type NOT NULL DEFAULT 'image',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evidence_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant cleaning evidence"
ON public.evidence_media
FOR SELECT
TO authenticated
USING (
    uploader_id = (SELECT auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.cleanings
        WHERE cleanings.id = evidence_media.cleaning_id
        AND cleanings.host_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Cleaners can insert their own cleaning evidence"
ON public.evidence_media
FOR INSERT
TO authenticated
WITH CHECK (uploader_id = (SELECT auth.uid()));

CREATE POLICY "Cleaners can update their own cleaning evidence"
ON public.evidence_media
FOR UPDATE
TO authenticated
USING (uploader_id = (SELECT auth.uid()))
WITH CHECK (uploader_id = (SELECT auth.uid()));

CREATE POLICY "Cleaners can delete their own cleaning evidence"
ON public.evidence_media
FOR DELETE
TO authenticated
USING (uploader_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.create_cleaning_request(
    p_property_id UUID,
    p_service_cost NUMERIC,
    p_scheduled_start TIMESTAMPTZ,
    p_custom_tasks TEXT[]
) 
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cleaning_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND host_id = (SELECT auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.cleanings (property_id, host_id, service_cost, scheduled_start, status) 
    VALUES (p_property_id, (SELECT auth.uid()), p_service_cost, p_scheduled_start, 'requested')
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

GRANT EXECUTE ON FUNCTION public.create_cleaning_request TO authenticated;

CREATE OR REPLACE FUNCTION public.update_cleaning_request(
    p_cleaning_id UUID,
    p_custom_tasks TEXT[],
    p_instructions TEXT,
    p_scheduled_start TIMESTAMPTZ
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.cleanings WHERE id = p_cleaning_id AND host_id = (SELECT auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorised' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.cleanings
    SET scheduled_start = p_scheduled_start, instructions = p_instructions
    WHERE id = p_cleaning_id;
    DELETE FROM public.cleaning_tasks WHERE cleaning_id = p_cleaning_id AND is_custom = true;
    IF p_custom_tasks IS NOT NULL THEN
        INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
        SELECT p_cleaning_id, task_desc, true, false FROM unnest(p_custom_tasks) AS task_desc WHERE task_desc <> '';
    END IF;
    RETURN p_cleaning_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.update_cleaning_request TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_cleaning_status_transitions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.clock_in_time IS NULL AND NEW.clock_in_time IS NOT NULL THEN
        NEW.status := 'in_progress';
    END IF;
    IF OLD.clock_out_time IS NULL AND NEW.clock_out_time IS NOT NULL THEN
        NEW.status := 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_cleaning_timestamp_update
    BEFORE UPDATE ON public.cleanings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cleaning_status_transitions();

CREATE POLICY "Cleaners can upload evidence to assigned cleaning folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'cleaning-media' AND EXISTS (
        SELECT 1 FROM public.cleanings
        WHERE cleanings.id::text = (storage.foldername(name))[1]
        AND cleanings.cleaner_id = (SELECT auth.uid())
    )
);

CREATE TABLE public.cleaning_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleaning_id UUID NOT NULL REFERENCES public.cleanings(id) ON DELETE CASCADE UNIQUE,
    cleaner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    broken_items_report TEXT,
    low_supplies_report TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_cleaning_reports_cleaning_id ON public.cleaning_reports(cleaning_id);
CREATE INDEX idx_cleaning_reports_cleaner_id ON public.cleaning_reports(cleaner_id);

ALTER TABLE public.cleaning_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant cleaning reports"
ON public.cleaning_reports
FOR SELECT
TO authenticated
USING (
    cleaner_id = (SELECT auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.cleanings
        WHERE cleanings.id = cleaning_reports.cleaning_id
        AND cleanings.host_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Cleaners can insert their own cleaning reports"
ON public.cleaning_reports
FOR INSERT
TO authenticated
WITH CHECK (
    cleaner_id = (SELECT auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.cleanings
        WHERE cleanings.id = cleaning_reports.cleaning_id
        AND cleanings.cleaner_id = (SELECT auth.uid())
        AND cleanings.status = 'in_progress'
    )
);

CREATE POLICY "Cleaners can update their own cleaning reports"
ON public.cleaning_reports
FOR UPDATE
TO authenticated
USING (cleaner_id = (SELECT auth.uid()))
WITH CHECK (cleaner_id = (SELECT auth.uid()));