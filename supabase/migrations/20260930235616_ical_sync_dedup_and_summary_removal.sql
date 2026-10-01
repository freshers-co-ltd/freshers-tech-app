UPDATE public.cleanings AS target
SET status = 'cancelled', updated_at = NOW()
FROM public.ical_events AS event
WHERE event.cleaning_id = target.id
    AND event.summary ILIKE '%unavailable%'
    AND target.source <> 'manual'
    AND target.status = 'unverified'
    AND target.deleted_at IS NULL;

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY property_id, (CAST(scheduled_start AT TIME ZONE 'UTC' AS date))
            ORDER BY
                CASE status WHEN 'confirmed' THEN 0 WHEN 'requested' THEN 1 ELSE 2 END,
                created_at ASC
        ) AS position
    FROM public.cleanings
    WHERE source <> 'manual'
        AND status IN ('requested', 'confirmed', 'unverified')
        AND deleted_at IS NULL
)
UPDATE public.cleanings AS target
SET status = 'cancelled', updated_at = NOW()
FROM ranked
WHERE ranked.id = target.id AND ranked.position > 1;

UPDATE public.cleanings
SET status = 'cancelled', updated_at = NOW()
WHERE source <> 'manual'
    AND status = 'unverified'
    AND deleted_at IS NULL
    AND scheduled_start > NOW() + INTERVAL '365 days';

ALTER TABLE public.ical_events DROP COLUMN summary;

DROP INDEX IF EXISTS public.idx_unique_active_cleaning_per_date;

CREATE UNIQUE INDEX idx_unique_active_cleaning_per_date
ON public.cleanings (property_id, (CAST(scheduled_start AT TIME ZONE 'UTC' AS date)))
WHERE deleted_at IS NULL
    AND status IN ('requested', 'confirmed', 'unverified')
    AND source <> 'manual';
