DROP TRIGGER IF EXISTS before_update_prevent_existing_email_signup ON auth.users;

CREATE
OR REPLACE FUNCTION public.prevent_existing_email_signup () RETURNS TRIGGER SECURITY DEFINER
SET
    search_path = auth,
    public AS $$
BEGIN
    IF OLD.confirmation_token IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.email_confirmed_at IS NULL
       AND NEW.email_confirmed_at IS NULL
       AND NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password
    THEN
        RAISE EXCEPTION 'Signup blocked for existing unconfirmed account'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_update_prevent_existing_email_signup BEFORE
UPDATE ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.prevent_existing_email_signup ();

REVOKE
EXECUTE ON FUNCTION public.prevent_existing_email_signup ()
FROM
    PUBLIC,
    anon,
    authenticated;