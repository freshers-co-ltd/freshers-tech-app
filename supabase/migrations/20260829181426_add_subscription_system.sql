ALTER TABLE public.profiles
ADD COLUMN is_invited BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'past_due',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'paused'
);

CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    status public.subscription_status NOT NULL DEFAULT 'incomplete',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    pending_cancellation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_host_id ON public.subscriptions(host_id);
CREATE UNIQUE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
ADD COLUMN host_subscription_status public.subscription_status;

CREATE POLICY "Hosts can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (host_id = auth.uid());

CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE OR REPLACE FUNCTION public.sync_subscription_status_to_profile()
RETURNS TRIGGER SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    UPDATE public.profiles
    SET host_subscription_status = NEW.status
    WHERE id = NEW.host_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscription_status_change
    AFTER INSERT OR UPDATE OF status ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_subscription_status_to_profile();

CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

CREATE OR REPLACE FUNCTION public.notification_exists(
    p_user_id UUID,
    p_type public.notification_type,
    p_interval INTERVAL DEFAULT INTERVAL '5 minutes'
) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_user_id
          AND type = p_type
          AND created_at > NOW() - p_interval
    );
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'subscription_active';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'subscription_payment_failed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'subscription_canceled';

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.handle_new_user_after()
RETURNS TRIGGER SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_invited)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        (NEW.raw_user_meta_data->>'role')::public.user_role,
        COALESCE((NEW.raw_user_meta_data->>'is_invited')::boolean, FALSE)
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created_after ON auth.users;
CREATE TRIGGER on_auth_user_created_after
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_after();

CREATE OR REPLACE FUNCTION public.purge_user_pii(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
BEGIN
    IF (SELECT auth.uid()) != p_user_id
       AND ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin')
    THEN
        RAISE EXCEPTION 'Unauthorised: Only admins or the user themselves can purge PII' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.subscriptions
    SET pending_cancellation = TRUE,
        status = 'canceled',
        canceled_at = NOW()
    WHERE host_id = p_user_id
      AND status IN ('active', 'past_due', 'unpaid');

    BEGIN
        PERFORM net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/stripe-billing/cancel-subscription',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := jsonb_build_object('host_id', p_user_id)
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not invoke Stripe cancellation via pg_net: %', SQLERRM;
    END;

    UPDATE public.profiles
    SET email = encode(gen_random_bytes(3), 'hex') || '@deleted',
        full_name = '[Deleted User]',
        avatar_url = NULL,
        last_seen_at = NULL,
        deleted_at = now()
    WHERE id = p_user_id;

    UPDATE auth.users
    SET
      email = encode(gen_random_bytes(3), 'hex') || '@deleted',
      banned_until = NOW() + INTERVAL '100 years',
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || JSONB_BUILD_OBJECT('banned_until', (NOW() + INTERVAL '100 years')::TEXT),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "[Deleted User]", "avatar_url": null}'::jsonb
    WHERE id = p_user_id;

    DELETE FROM auth.refresh_tokens
    WHERE user_id = p_user_id::TEXT;

    UPDATE public.properties
    SET address_line_1 = '[Deleted]',
        address_line_2 = NULL,
        town_city = '[Deleted]',
        postcode = '[Deleted]',
        main_image_url = '[deleted]'
    WHERE host_id = p_user_id;

    UPDATE public.cleanings
    SET information = '[Deleted]'
    WHERE host_id = p_user_id;

    DELETE FROM public.notifications WHERE user_id = p_user_id;
    DELETE FROM public.notification_preferences WHERE user_id = p_user_id;
    DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
    DELETE FROM public.subscriptions WHERE host_id = p_user_id;

    INSERT INTO public.audit_logs (actor_id, target_id, target_table, action_type, new_data)
    VALUES ((SELECT auth.uid()), p_user_id, 'user_account', 'PURGE_USER_PII',
            jsonb_build_object('purged_at', now()));
END;
$$;

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, role, deleted_at, is_verified, is_invited, host_subscription_status) ON public.profiles TO authenticated;
