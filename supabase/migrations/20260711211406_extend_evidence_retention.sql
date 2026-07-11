CREATE
OR REPLACE FUNCTION public.delete_expired_evidence () RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT em.id, em.media_url
        FROM public.evidence_media em
        JOIN public.cleanings c ON em.cleaning_id = c.id
        WHERE c.status = 'completed'
          AND c.clock_out_time IS NOT NULL
          AND c.clock_out_time < NOW() - INTERVAL '20 days'
          AND em.deleted_at IS NULL
    LOOP
        DELETE FROM storage.objects
        WHERE bucket_id = 'cleaning-media'
          AND name = rec.media_url;

        UPDATE public.evidence_media
        SET deleted_at = NOW()
        WHERE id = rec.id;
    END LOOP;
END;
$$;
