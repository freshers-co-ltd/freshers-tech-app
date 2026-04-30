CREATE TYPE public.notification_type AS ENUM (
    'cleaning_requested',
    'cleaning_confirmed',
    'cleaning_started',
    'cleaning_completed',
    'cleaning_cancelled',
    'cleaning_assigned',
    'cleaning_reassigned',
    'cleaning_updated'
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND public.is_not_banned()
        )
    );

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE TABLE public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_or_create_notification_preferences()
RETURNS TABLE (
    pref_user_id UUID,
    pref_enabled BOOLEAN,
    pref_created_at TIMESTAMPTZ,
    pref_updated_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    INSERT INTO notification_preferences (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN QUERY
    SELECT np.user_id, np.enabled, np.created_at, np.updated_at
    FROM notification_preferences np
    WHERE np.user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_notification_preferences() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_notification_for_user(
    p_user_id UUID,
    p_type public.notification_type,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data, link)
    VALUES (p_user_id, p_type, p_title, p_message, p_data, p_link)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification_for_user TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cleanings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cleaning_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cleaning_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;