CREATE TYPE public.property_type AS ENUM ('house', 'apartment', 'other');

CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    town_city TEXT NOT NULL,
    postcode TEXT NOT NULL,
    type public.property_type NOT NULL DEFAULT 'house',
    bedrooms SMALLINT NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
    bathrooms SMALLINT NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
    main_image_url TEXT NOT NULL,
    extra_images_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY host_manage_own_properties ON public.properties
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = host_id)
    WITH CHECK ((SELECT auth.uid()) = host_id);

CREATE TRIGGER set_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

CREATE POLICY "Hosts can manage their own folders"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'property-media' 
    AND (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-media' 
    AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Authenticated users can view property media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'property-media');