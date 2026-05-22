-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto
WITH
    SCHEMA extensions;

-- 2. AUTH SEEDING
SET
    session_replication_role = 'replica';

INSERT INTO
    auth.users (
        instance_id,
        id,
        aud,
        ROLE,
        email,
        encrypted_password,
        email_confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        phone_change_token,
        banned_until,
        reauthentication_token,
        is_sso_user,
        is_anonymous
    )
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'admin@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '140 days',
        NOW() - INTERVAL '2 hours',
        '{"provider": "email", "providers": ["email"], "role": "admin"}',
        '{"sub": "00000000-0000-0000-0000-000000000001", "role": "admin", "full_name": "Steve Admin", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '140 days',
        NOW() - INTERVAL '2 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000002',
        'authenticated',
        'authenticated',
        'host@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '100 days',
        NOW() - INTERVAL '4 hours',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000002", "role": "host", "full_name": "John Host", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '100 days',
        NOW() - INTERVAL '4 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000003',
        'authenticated',
        'authenticated',
        'cleaner@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '80 days',
        NOW() - INTERVAL '5 hours',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000003", "role": "cleaner", "full_name": "Mark Cleaner", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '80 days',
        NOW() - INTERVAL '5 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000004',
        'authenticated',
        'authenticated',
        'sarah@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '70 days',
        NOW() - INTERVAL '6 hours',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000004", "role": "host", "full_name": "Sarah Smith", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '70 days',
        NOW() - INTERVAL '6 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000005',
        'authenticated',
        'authenticated',
        'emily@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '3 hours',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000005", "role": "cleaner", "full_name": "Emily Johnson", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '3 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000006',
        'authenticated',
        'authenticated',
        'david@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '50 days',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000006", "role": "host", "full_name": "David Brown", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '50 days',
        NOW() - INTERVAL '1 day',
        '',
        '',
        '',
        '',
        '',
        '',
        NOW() + INTERVAL '1 year',
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000007',
        'authenticated',
        'authenticated',
        'lisa@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '7 hours',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000007", "role": "cleaner", "full_name": "Lisa Williams", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '7 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NOW() + INTERVAL '1 year',
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000008',
        'authenticated',
        'authenticated',
        'james@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '40 days',
        NOW() - INTERVAL '8 hours',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000008", "role": "host", "full_name": "James Wilson", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '40 days',
        NOW() - INTERVAL '8 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000009',
        'authenticated',
        'authenticated',
        'jessica@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '9 hours',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000009", "role": "cleaner", "full_name": "Jessica Taylor", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '9 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000010',
        'authenticated',
        'authenticated',
        'michael@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '10 hours',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000010", "role": "host", "full_name": "Michael Davis", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '10 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000011',
        'authenticated',
        'authenticated',
        'amanda@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '11 hours',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000011", "role": "cleaner", "full_name": "Amanda Martinez", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '11 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000012',
        'authenticated',
        'authenticated',
        'robert@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '12 hours',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000012", "role": "host", "full_name": "Robert Anderson", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '12 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000013',
        'authenticated',
        'authenticated',
        'rachel@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000013", "role": "cleaner", "full_name": "Rachel White", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '1 day',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000014',
        'authenticated',
        'authenticated',
        'chris@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000014", "role": "host", "full_name": "Chris Thompson", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '1 day',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000015',
        'authenticated',
        'authenticated',
        'sophie@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000015", "role": "cleaner", "full_name": "Sophie Garcia", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '1 day',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000016',
        'authenticated',
        'authenticated',
        'daniel@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000016", "role": "host", "full_name": "Daniel Lee", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '1 day',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000017',
        'authenticated',
        'authenticated',
        'natalie@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000017", "role": "cleaner", "full_name": "Natalie Clark", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '1 day',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000018',
        'authenticated',
        'authenticated',
        'paul@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000018", "role": "host", "full_name": "Paul Harris", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '1 day',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000019',
        'authenticated',
        'authenticated',
        'ashley@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '12 hours',
        '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
        '{"sub": "00000000-0000-0000-0000-000000000019", "role": "cleaner", "full_name": "Ashley Robinson", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '12 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000020',
        'authenticated',
        'authenticated',
        'kevin@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '6 hours',
        '{"provider": "email", "providers": ["email"], "role": "host"}',
        '{"sub": "00000000-0000-0000-0000-000000000020", "role": "host", "full_name": "Kevin Lewis", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '6 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000021',
        'authenticated',
        'authenticated',
        'bruce@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '3 hours',
        '{"provider": "email", "providers": ["email"], "role": "admin"}',
        '{"sub": "00000000-0000-0000-0000-000000000021", "role": "admin", "full_name": "Bruce Green", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '3 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000022',
        'authenticated',
        'authenticated',
        'linda@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '2 hours',
        '{"provider": "email", "providers": ["email"], "role": "admin"}',
        '{"sub": "00000000-0000-0000-0000-000000000022", "role": "admin", "full_name": "Linda Smith", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '2 hours',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000023',
        'authenticated',
        'authenticated',
        'marta@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '1 hour',
        '{"provider": "email", "providers": ["email"], "role": "admin"}',
        '{"sub": "00000000-0000-0000-0000-000000000023", "role": "admin", "full_name": "Marta Hansen", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '1 hour',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000024',
        'authenticated',
        'authenticated',
        'joe@test.com',
        extensions.crypt ('password1!', extensions.gen_salt ('bf', 10)),
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '30 minutes',
        '{"provider": "email", "providers": ["email"], "role": "admin"}',
        '{"sub": "00000000-0000-0000-0000-000000000024", "role": "admin", "full_name": "Joe Stu", "email_verified": true}',
        FALSE,
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '30 minutes',
        '',
        '',
        '',
        '',
        '',
        '',
        NULL,
        '',
        FALSE,
        FALSE
    );

-- 3. AUTH IDENTITIES
INSERT INTO
    auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000001',
        '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000001',
        NOW() - INTERVAL '180 days',
        NOW() - INTERVAL '180 days',
        NOW() - INTERVAL '180 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000002',
        '{"sub":"00000000-0000-0000-0000-000000000002","email":"host@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000002',
        NOW() - INTERVAL '175 days',
        NOW() - INTERVAL '175 days',
        NOW() - INTERVAL '175 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000003',
        '{"sub":"00000000-0000-0000-0000-000000000003","email":"cleaner@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000003',
        NOW() - INTERVAL '170 days',
        NOW() - INTERVAL '170 days',
        NOW() - INTERVAL '170 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000004',
        '{"sub":"00000000-0000-0000-0000-000000000004","email":"sarah@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000004',
        NOW() - INTERVAL '70 days',
        NOW() - INTERVAL '70 days',
        NOW() - INTERVAL '70 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000005',
        '{"sub":"00000000-0000-0000-0000-000000000005","email":"emily@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000005',
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '60 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000006',
        '{"sub":"00000000-0000-0000-0000-000000000006","email":"david@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000006',
        NOW() - INTERVAL '50 days',
        NOW() - INTERVAL '50 days',
        NOW() - INTERVAL '50 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000007',
        '{"sub":"00000000-0000-0000-0000-000000000007","email":"lisa@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000007',
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '45 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000008',
        '{"sub":"00000000-0000-0000-0000-000000000008","email":"james@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000008',
        NOW() - INTERVAL '40 days',
        NOW() - INTERVAL '40 days',
        NOW() - INTERVAL '40 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000009',
        '{"sub":"00000000-0000-0000-0000-000000000009","email":"jessica@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000009',
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '35 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000010',
        '{"sub":"00000000-0000-0000-0000-000000000010","email":"michael@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000010',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '30 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000011',
        '{"sub":"00000000-0000-0000-0000-000000000011","email":"amanda@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000011',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '25 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000012',
        '{"sub":"00000000-0000-0000-0000-000000000012","email":"robert@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000012',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '20 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000013',
        '{"sub":"00000000-0000-0000-0000-000000000013","email":"rachel@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000013',
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '18 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000014',
        '{"sub":"00000000-0000-0000-0000-000000000014","email":"chris@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000014',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '15 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000015',
        '{"sub":"00000000-0000-0000-0000-000000000015","email":"sophie@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000015',
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '12 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000016',
        '{"sub":"00000000-0000-0000-0000-000000000016","email":"daniel@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000016',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '10 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000017',
        '{"sub":"00000000-0000-0000-0000-000000000017","email":"natalie@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000017',
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '8 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000018',
        '{"sub":"00000000-0000-0000-0000-000000000018","email":"paul@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000018',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '6 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000019',
        '{"sub":"00000000-0000-0000-0000-000000000019","email":"ashley@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000019',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000020',
        '{"sub":"00000000-0000-0000-0000-000000000020","email":"kevin@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000020',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000021',
        '{"sub":"00000000-0000-0000-0000-000000000021","email":"bruce@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000021',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000022',
        '{"sub":"00000000-0000-0000-0000-000000000022","email":"linda@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000022',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000023',
        '{"sub":"00000000-0000-0000-0000-000000000023","email":"marta@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000023',
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '12 hours'
    ),
    (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000024',
        '{"sub":"00000000-0000-0000-0000-000000000024","email":"joe@test.com","email_verified":true}'::jsonb,
        'email',
        '00000000-0000-0000-0000-000000000024',
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '6 hours'
    );

-- 4. PUBLIC PROFILES
INSERT INTO
    public.profiles (id, email, ROLE, full_name, is_verified)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@test.com', 'admin', 'Steve Admin', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'host@test.com', 'host', 'John Host', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'cleaner@test.com', 'cleaner', 'Mark Cleaner', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'sarah@test.com', 'host', 'Sarah Smith', TRUE),
    ('00000000-0000-0000-0000-000000000005', 'emily@test.com', 'cleaner', 'Emily Johnson', TRUE),
    ('00000000-0000-0000-0000-000000000006', 'david@test.com', 'host', 'David Brown', TRUE),
    ('00000000-0000-0000-0000-000000000007', 'lisa@test.com', 'cleaner', 'Lisa Williams', TRUE),
    ('00000000-0000-0000-0000-000000000008', 'james@test.com', 'host', 'James Wilson', TRUE),
    ('00000000-0000-0000-0000-000000000009', 'jessica@test.com', 'cleaner', 'Jessica Taylor', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'michael@test.com', 'host', 'Michael Davis', TRUE),
    ('00000000-0000-0000-0000-000000000011', 'amanda@test.com', 'cleaner', 'Amanda Martinez', TRUE),
    ('00000000-0000-0000-0000-000000000012', 'robert@test.com', 'host', 'Robert Anderson', TRUE),
    ('00000000-0000-0000-0000-000000000013', 'rachel@test.com', 'cleaner', 'Rachel White', TRUE),
    ('00000000-0000-0000-0000-000000000014', 'chris@test.com', 'host', 'Chris Thompson', TRUE),
    ('00000000-0000-0000-0000-000000000015', 'sophie@test.com', 'cleaner', 'Sophie Garcia', TRUE),
    ('00000000-0000-0000-0000-000000000016', 'daniel@test.com', 'host', 'Daniel Lee', TRUE),
    ('00000000-0000-0000-0000-000000000017', 'natalie@test.com', 'cleaner', 'Natalie Clark', TRUE),
    ('00000000-0000-0000-0000-000000000018', 'paul@test.com', 'host', 'Paul Harris', TRUE),
    ('00000000-0000-0000-0000-000000000019', 'ashley@test.com', 'cleaner', 'Ashley Robinson', TRUE),
    ('00000000-0000-0000-0000-000000000020', 'kevin@test.com', 'host', 'Kevin Lewis', TRUE),
    ('00000000-0000-0000-0000-000000000021', 'bruce@test.com', 'admin', 'Bruce Green', TRUE),
    ('00000000-0000-0000-0000-000000000022', 'linda@test.com', 'admin', 'Linda Smith', TRUE),
    ('00000000-0000-0000-0000-000000000023', 'marta@test.com', 'admin', 'Marta Hansen', TRUE),
    ('00000000-0000-0000-0000-000000000024', 'joe@test.com', 'admin', 'Joe Stu', TRUE);

SET
    session_replication_role = 'origin';

-- 6. PROPERTIES
INSERT INTO
    public.properties (
        id,
        host_id,
        address_line_1,
        town_city,
        postcode,
        TYPE,
        bedrooms,
        bathrooms,
        main_image_url,
        extra_images_urls,
        price_per_cleaning
    )
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000002',
        'Flat 4, City Center',
        'Southampton',
        'SO15 1XY',
        'apartment',
        1,
        1,
        '00000000-0000-0000-0000-000000000002/property-1-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000002/property-1-img-2.jpg',
            '00000000-0000-0000-0000-000000000002/property-1-img-3.jpg',
            '00000000-0000-0000-0000-000000000002/property-1-img-4.jpg',
            '00000000-0000-0000-0000-000000000002/property-1-img-5.jpg'
        ],
        70.00
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000002',
        '123 Ocean View',
        'Southampton',
        'SE14 6RF',
        'house',
        2,
        2,
        '00000000-0000-0000-0000-000000000002/property-2-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000002/property-2-img-2.jpg',
            '00000000-0000-0000-0000-000000000002/property-2-img-3.jpg',
            '00000000-0000-0000-0000-000000000002/property-2-img-4.jpg',
            '00000000-0000-0000-0000-000000000002/property-2-img-5.jpg'
        ],
        85.00
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000004',
        '45 Riverside Drive',
        'Portsmouth',
        'PO5 2AB',
        'apartment',
        2,
        1,
        '00000000-0000-0000-0000-000000000004/property-3-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000004/property-3-img-2.jpg',
            '00000000-0000-0000-0000-000000000004/property-3-img-3.jpg',
            '00000000-0000-0000-0000-000000000004/property-3-img-4.jpg'
        ],
        85.00
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000004',
        '78 Garden Lane',
        'Portsmouth',
        'PO6 7CD',
        'house',
        3,
        2,
        '00000000-0000-0000-0000-000000000004/property-4-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000004/property-4-img-2.jpg',
            '00000000-0000-0000-0000-000000000004/property-4-img-3.jpg'
        ],
        100.00
    ),
    (
        '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000006',
        'Flat 2B, High Street',
        'Bournemouth',
        'BH8 1EF',
        'apartment',
        1,
        1,
        '00000000-0000-0000-0000-000000000006/property-5-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000006/property-5-img-2.jpg',
            '00000000-0000-0000-0000-000000000006/property-5-img-3.jpg',
            '00000000-0000-0000-0000-000000000006/property-5-img-4.jpg'
        ],
        70.00
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        '00000000-0000-0000-0000-000000000006',
        '15 Seaside Cottage',
        'Bournemouth',
        'BH11 9GH',
        'house',
        2,
        1,
        '00000000-0000-0000-0000-000000000006/property-6-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000006/property-6-img-2.jpg',
            '00000000-0000-0000-0000-000000000006/property-6-img-3.jpg'
        ],
        85.00
    ),
    (
        '77777777-7777-7777-7777-777777777777',
        '00000000-0000-0000-0000-000000000008',
        'Unit 5, Marina View',
        'Portsmouth',
        'PO1 2KL',
        'apartment',
        2,
        2,
        '00000000-0000-0000-0000-000000000008/property-7-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000008/property-7-img-2.jpg',
            '00000000-0000-0000-0000-000000000008/property-7-img-3.jpg',
            '00000000-0000-0000-0000-000000000008/property-7-img-4.jpg'
        ],
        85.00
    ),
    (
        '88888888-8888-8888-8888-888888888888',
        '00000000-0000-0000-0000-000000000008',
        '22 Hillside Terrace',
        'Portsmouth',
        'PO2 5MN',
        'house',
        4,
        3,
        '00000000-0000-0000-0000-000000000008/property-8-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000008/property-8-img-2.jpg',
            '00000000-0000-0000-0000-000000000008/property-8-img-3.jpg'
        ],
        120.00
    ),
    (
        '99999999-9999-9999-9999-999999999999',
        '00000000-0000-0000-0000-000000000010',
        'Top Floor Flat, Central',
        'Southampton',
        'SO14 3PQ',
        'apartment',
        1,
        1,
        '00000000-0000-0000-0000-000000000010/property-9-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000010/property-9-img-2.jpg',
            '00000000-0000-0000-0000-000000000010/property-9-img-3.jpg'
        ],
        70.00
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '00000000-0000-0000-0000-000000000010',
        '5 Beach Road',
        'Southampton',
        'SO19 7RS',
        'house',
        3,
        2,
        '00000000-0000-0000-0000-000000000010/property-10-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000010/property-10-img-2.jpg',
            '00000000-0000-0000-0000-000000000010/property-10-img-3.jpg',
            '00000000-0000-0000-0000-000000000010/property-10-img-4.jpg'
        ],
        100.00
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '00000000-0000-0000-0000-000000000012',
        'Flat 7, Harbour Court',
        'Portsmouth',
        'PO5 8TU',
        'apartment',
        2,
        1,
        '00000000-0000-0000-0000-000000000012/property-11-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000012/property-11-img-2.jpg',
            '00000000-0000-0000-0000-000000000012/property-11-img-3.jpg'
        ],
        85.00
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '00000000-0000-0000-0000-000000000012',
        '34 Pine Avenue',
        'Portsmouth',
        'PO3 6VW',
        'house',
        2,
        2,
        '00000000-0000-0000-0000-000000000012/property-12-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000012/property-12-img-2.jpg',
            '00000000-0000-0000-0000-000000000012/property-12-img-3.jpg',
            '00000000-0000-0000-0000-000000000012/property-12-img-4.jpg'
        ],
        85.00
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000014',
        'Flat 1, West End',
        'Bournemouth',
        'BH4 9XY',
        'apartment',
        1,
        1,
        '00000000-0000-0000-0000-000000000014/property-13-img-1.jpg',
        ARRAY['00000000-0000-0000-0000-000000000014/property-13-img-2.jpg'],
        70.00
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '00000000-0000-0000-0000-000000000014',
        '67 Summit Road',
        'Bournemouth',
        'BH8 0AB',
        'house',
        4,
        3,
        '00000000-0000-0000-0000-000000000014/property-14-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000014/property-14-img-2.jpg',
            '00000000-0000-0000-0000-000000000014/property-14-img-3.jpg'
        ],
        120.00
    ),
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '00000000-0000-0000-0000-000000000016',
        'Studio 12, City Center',
        'Southampton',
        'SO15 2CD',
        'apartment',
        0,
        1,
        '00000000-0000-0000-0000-000000000016/property-15-img-1.jpg',
        ARRAY['00000000-0000-0000-0000-000000000016/property-15-img-2.jpg'],
        60.00
    ),
    (
        '11111111-1111-1111-1111-111111111112',
        '00000000-0000-0000-0000-000000000016',
        '28 Oak Street',
        'Southampton',
        'SO16 7EF',
        'house',
        3,
        2,
        '00000000-0000-0000-0000-000000000016/property-16-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000016/property-16-img-2.jpg',
            '00000000-0000-0000-0000-000000000016/property-16-img-3.jpg'
        ],
        100.00
    ),
    (
        '11111111-1111-1111-1111-111111111113',
        '00000000-0000-0000-0000-000000000018',
        'Flat 3, Pine Valley',
        'Portsmouth',
        'PO7 8GH',
        'apartment',
        2,
        1,
        '00000000-0000-0000-0000-000000000018/property-17-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000018/property-17-img-2.jpg',
            '00000000-0000-0000-0000-000000000018/property-17-img-3.jpg'
        ],
        85.00
    ),
    (
        '11111111-1111-1111-1111-111111111114',
        '00000000-0000-0000-0000-000000000018',
        '9 Coastal Way',
        'Portsmouth',
        'PO12 3JK',
        'house',
        2,
        2,
        '00000000-0000-0000-0000-000000000018/property-18-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000018/property-18-img-2.jpg',
            '00000000-0000-0000-0000-000000000018/property-18-img-3.jpg',
            '00000000-0000-0000-0000-000000000018/property-18-img-4.jpg'
        ],
        85.00
    ),
    (
        '11111111-1111-1111-1111-111111111115',
        '00000000-0000-0000-0000-000000000020',
        'Flat 9, Seaview Tower',
        'Bournemouth',
        'BH2 5LM',
        'apartment',
        1,
        1,
        '00000000-0000-0000-0000-000000000020/property-19-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000020/property-19-img-2.jpg',
            '00000000-0000-0000-0000-000000000020/property-19-img-3.jpg'
        ],
        70.00
    ),
    (
        '11111111-1111-1111-1111-111111111116',
        '00000000-0000-0000-0000-000000000020',
        '42 Meadow Drive',
        'Bournemouth',
        'BH9 1NP',
        'house',
        3,
        2,
        '00000000-0000-0000-0000-000000000020/property-20-img-1.jpg',
        ARRAY[
            '00000000-0000-0000-0000-000000000020/property-20-img-2.jpg',
            '00000000-0000-0000-0000-000000000020/property-20-img-3.jpg',
            '00000000-0000-0000-0000-000000000020/property-20-img-4.jpg'
        ],
        100.00
    );

INSERT INTO
    public.cleanings (
        id,
        host_id,
        property_id,
        cleaner_id,
        status,
        scheduled_start,
        information,
        clock_in_time,
        clock_out_time
    )
VALUES
    -- Historical completed cleanings (5-6 months ago)
    (
        'c0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000003',
        'completed',
        NOW() - INTERVAL '165 days',
        'Keys in lockbox at front door. Code: 4321.',
        NOW() - INTERVAL '165 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '165 days' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000004',
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000005',
        'completed',
        NOW() - INTERVAL '160 days',
        NULL,
        NOW() - INTERVAL '160 days' + INTERVAL '9 hours',
        NOW() - INTERVAL '160 days' + INTERVAL '11 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000003',
        'completed',
        NOW() - INTERVAL '155 days',
        'Park in visitor bay #12. Entry code: 7722.',
        NOW() - INTERVAL '155 days' + INTERVAL '8 hours',
        NOW() - INTERVAL '155 days' + INTERVAL '11 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000006',
        '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000007',
        'completed',
        NOW() - INTERVAL '150 days',
        'Ring bell for caretaker to let you in.',
        NOW() - INTERVAL '150 days' + INTERVAL '14 hours',
        NOW() - INTERVAL '150 days' + INTERVAL '16 hours'
    ),
    -- 3-4 months ago
    (
        'c0000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000004',
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000009',
        'completed',
        NOW() - INTERVAL '120 days',
        'Spare keys under the third rock to the left of the gate.',
        NOW() - INTERVAL '120 days' + INTERVAL '9 hours',
        NOW() - INTERVAL '120 days' + INTERVAL '13 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000008',
        '77777777-7777-7777-7777-777777777777',
        '00000000-0000-0000-0000-000000000005',
        'completed',
        NOW() - INTERVAL '110 days',
        'Enter via rear garden gate - front door is rarely used.',
        NOW() - INTERVAL '110 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '110 days' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000007',
        '00000000-0000-0000-0000-000000000010',
        '99999999-9999-9999-9999-999999999999',
        '00000000-0000-0000-0000-000000000011',
        'completed',
        NOW() - INTERVAL '100 days',
        NULL,
        NOW() - INTERVAL '100 days' + INTERVAL '11 hours',
        NOW() - INTERVAL '100 days' + INTERVAL '13 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000008',
        '00000000-0000-0000-0000-000000000012',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '00000000-0000-0000-0000-000000000007',
        'completed',
        NOW() - INTERVAL '95 days',
        'Parking available on driveway. Do not block the garage.',
        NOW() - INTERVAL '95 days' + INTERVAL '9 hours',
        NOW() - INTERVAL '95 days' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000009',
        '00000000-0000-0000-0000-000000000014',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000013',
        'completed',
        NOW() - INTERVAL '90 days',
        'Key safe code: 5582. Please leave keys in safe when done.',
        NOW() - INTERVAL '90 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '90 days' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000016',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '00000000-0000-0000-0000-000000000015',
        'completed',
        NOW() - INTERVAL '105 days',
        NULL,
        NOW() - INTERVAL '105 days' + INTERVAL '14 hours',
        NOW() - INTERVAL '105 days' + INTERVAL '16 hours'
    ),
    -- 1-2 months ago
    (
        'c0000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000018',
        '11111111-1111-1111-1111-111111111113',
        '00000000-0000-0000-0000-000000000019',
        'completed',
        NOW() - INTERVAL '85 days',
        'Access code at reception desk. Bring ID.',
        NOW() - INTERVAL '85 days' + INTERVAL '9 hours',
        NOW() - INTERVAL '85 days' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000020',
        '11111111-1111-1111-1111-111111111115',
        '00000000-0000-0000-0000-000000000011',
        'completed',
        NOW() - INTERVAL '80 days',
        NULL,
        NOW() - INTERVAL '80 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '80 days' + INTERVAL '12 hours'
    ),
    -- Current month (0-30 days)
    (
        'c0000000-0000-0000-0000-000000000013',
        '00000000-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000003',
        'completed',
        NOW() - INTERVAL '28 days',
        NULL,
        NOW() - INTERVAL '28 days' + INTERVAL '9 hours',
        NOW() - INTERVAL '28 days' + INTERVAL '13 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000014',
        '00000000-0000-0000-0000-000000000004',
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000005',
        'completed',
        NOW() - INTERVAL '25 days',
        'Gate code: 7711. Park in space #3 marked "Visitor".',
        NOW() - INTERVAL '25 days' + INTERVAL '11 hours',
        NOW() - INTERVAL '25 days' + INTERVAL '14 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000015',
        '00000000-0000-0000-0000-000000000006',
        '66666666-6666-6666-6666-666666666666',
        '00000000-0000-0000-0000-000000000007',
        'completed',
        NOW() - INTERVAL '22 days',
        NULL,
        NOW() - INTERVAL '22 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '22 days' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000016',
        '00000000-0000-0000-0000-000000000008',
        '88888888-8888-8888-8888-888888888888',
        '00000000-0000-0000-0000-000000000009',
        'completed',
        NOW() - INTERVAL '18 days',
        'Use side entrance. Dog in back garden - do not let out.',
        NOW() - INTERVAL '18 days' + INTERVAL '8 hours',
        NOW() - INTERVAL '18 days' + INTERVAL '14 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000017',
        '00000000-0000-0000-0000-000000000010',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '00000000-0000-0000-0000-000000000011',
        'completed',
        NOW() - INTERVAL '15 days',
        'Keys with neighbour at #42.',
        NOW() - INTERVAL '15 days' + INTERVAL '9 hours',
        NOW() - INTERVAL '15 days' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000018',
        '00000000-0000-0000-0000-000000000012',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '00000000-0000-0000-0000-000000000013',
        'completed',
        NOW() - INTERVAL '12 days',
        'On-street parking free on this road. No permit needed.',
        NOW() - INTERVAL '12 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '12 days' + INTERVAL '13 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000019',
        '00000000-0000-0000-0000-000000000014',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '00000000-0000-0000-0000-000000000015',
        'completed',
        NOW() - INTERVAL '10 days',
        NULL,
        NOW() - INTERVAL '10 days' + INTERVAL '8 hours',
        NOW() - INTERVAL '10 days' + INTERVAL '13 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000020',
        '00000000-0000-0000-0000-000000000016',
        '11111111-1111-1111-1111-111111111112',
        '00000000-0000-0000-0000-000000000019',
        'completed',
        NOW() - INTERVAL '8 days',
        'Enter via main lobby, take lift to 4th floor. Flat 4B.',
        NOW() - INTERVAL '8 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '8 days' + INTERVAL '13 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000018',
        '11111111-1111-1111-1111-111111111114',
        '00000000-0000-0000-0000-000000000011',
        'completed',
        NOW() - INTERVAL '5 days',
        'Security code: 4499. Please reset the alarm once inside.',
        NOW() - INTERVAL '5 days' + INTERVAL '11 hours',
        NOW() - INTERVAL '5 days' + INTERVAL '14 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000020',
        '11111111-1111-1111-1111-111111111116',
        '00000000-0000-0000-0000-000000000013',
        'completed',
        NOW() - INTERVAL '3 days',
        NULL,
        NOW() - INTERVAL '3 days' + INTERVAL '9 hours',
        NOW() - INTERVAL '3 days' + INTERVAL '12 hours'
    ),
    -- Last few days / today
    (
        'c0000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000003',
        'completed',
        NOW() - INTERVAL '1 day',
        'Leave cleaning supplies in the cupboard under the stairs.',
        NOW() - INTERVAL '1 day' + INTERVAL '9 hours',
        NOW() - INTERVAL '1 day' + INTERVAL '12 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000024',
        '00000000-0000-0000-0000-000000000004',
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000005',
        'completed',
        NOW() - INTERVAL '2 days',
        NULL,
        NOW() - INTERVAL '2 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '2 days' + INTERVAL '13 hours'
    ),
    (
        'c0000000-0000-0000-0000-000000000025',
        '00000000-0000-0000-0000-000000000006',
        '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000007',
        'completed',
        NOW() - INTERVAL '12 hours',
        'Keypad at back door. Code: 3388. Turn off before leaving.',
        NOW() - INTERVAL '12 hours' + INTERVAL '14 hours',
        NOW() - INTERVAL '12 hours' + INTERVAL '16 hours'
    ),
    -- In progress (started today)
    (
        'c0000000-0000-0000-0000-000000000026',
        '00000000-0000-0000-0000-000000000008',
        '77777777-7777-7777-7777-777777777777',
        '00000000-0000-0000-0000-000000000009',
        'in_progress',
        NOW() - INTERVAL '2 hours',
        NULL,
        NOW() - INTERVAL '2 hours',
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000027',
        '00000000-0000-0000-0000-000000000010',
        '99999999-9999-9999-9999-999999999999',
        '00000000-0000-0000-0000-000000000011',
        'in_progress',
        NOW() - INTERVAL '1 hour',
        'Let yourself in with the code sent via text. Door code: 2233.',
        NOW() - INTERVAL '1 hour',
        NULL
    ),
    -- Confirmed (accepted, scheduled for future)
    (
        'c0000000-0000-0000-0000-000000000028',
        '00000000-0000-0000-0000-000000000012',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '00000000-0000-0000-0000-000000000013',
        'confirmed',
        NOW() + INTERVAL '1 day',
        'Park in the multi-storey on Market St. Bring change for the meter.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000029',
        '00000000-0000-0000-0000-000000000014',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000015',
        'confirmed',
        NOW() + INTERVAL '2 days',
        NULL,
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000030',
        '00000000-0000-0000-0000-000000000016',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '00000000-0000-0000-0000-000000000019',
        'confirmed',
        NOW() + INTERVAL '3 days',
        'Use stairs - lift is broken. 5th floor.',
        NULL,
        NULL
    ),
    -- Requested (no cleaner assigned yet)
    (
        'c0000000-0000-0000-0000-000000000031',
        '00000000-0000-0000-0000-000000000018',
        '11111111-1111-1111-1111-111111111113',
        NULL,
        'requested',
        NOW() + INTERVAL '4 days',
        'Alarm will be off. Code to re-arm: 6644.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000032',
        '00000000-0000-0000-0000-000000000020',
        '11111111-1111-1111-1111-111111111115',
        NULL,
        'requested',
        NOW() + INTERVAL '5 days',
        NULL,
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000033',
        '00000000-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'requested',
        NOW() + INTERVAL '6 days',
        'Key is with concierge on ground floor. Collect before starting.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000034',
        '00000000-0000-0000-0000-000000000004',
        '33333333-3333-3333-3333-333333333333',
        NULL,
        'requested',
        NOW() + INTERVAL '7 days',
        NULL,
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000035',
        '00000000-0000-0000-0000-000000000006',
        '66666666-6666-6666-6666-666666666666',
        NULL,
        'requested',
        NOW() + INTERVAL '8 days',
        'Wheelie bins are collected on Thursday - please move them back.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000036',
        '00000000-0000-0000-0000-000000000008',
        '88888888-8888-8888-8888-888888888888',
        NULL,
        'requested',
        NOW() + INTERVAL '9 days',
        'Cat is indoors - please do not let it outside.',
        NULL,
        NULL
    ),
    -- Some cancelled bookings (spread across past months)
    (
        'c0000000-0000-0000-0000-000000000037',
        '00000000-0000-0000-0000-000000000010',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '00000000-0000-0000-0000-000000000011',
        'cancelled',
        NOW() - INTERVAL '60 days',
        NULL,
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000038',
        '00000000-0000-0000-0000-000000000012',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '00000000-0000-0000-0000-000000000013',
        'cancelled',
        NOW() - INTERVAL '100 days',
        'Gate access code: 5511. Do not leave driveway gate open.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000039',
        '00000000-0000-0000-0000-000000000014',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000015',
        'cancelled',
        NOW() - INTERVAL '130 days',
        'Please text when finished so I can lock up remotely.',
        NULL,
        NULL
    ),
    -- More confirmed (future dates)
    (
        'c0000000-0000-0000-0000-000000000040',
        '00000000-0000-0000-0000-000000000018',
        '11111111-1111-1111-1111-111111111114',
        '00000000-0000-0000-0000-000000000019',
        'confirmed',
        NOW() + INTERVAL '10 days',
        'Coastal way confirmed.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000041',
        '00000000-0000-0000-0000-000000000020',
        '11111111-1111-1111-1111-111111111116',
        '00000000-0000-0000-0000-000000000011',
        'confirmed',
        NOW() + INTERVAL '11 days',
        'Meadow drive booked.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000042',
        '00000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000003',
        'confirmed',
        NOW() + INTERVAL '12 days',
        'Ocean view confirmed.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000043',
        '00000000-0000-0000-0000-000000000004',
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000005',
        'confirmed',
        NOW() + INTERVAL '13 days',
        'Garden lane confirmed.',
        NULL,
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000044',
        '00000000-0000-0000-0000-000000000006',
        '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000007',
        'confirmed',
        NOW() + INTERVAL '14 days',
        'High street scheduled.',
        NULL,
        NULL
    ),
    -- Keep original seed data too
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '00000000-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'requested',
        NOW() + INTERVAL '2 days',
        'Key is under the blue pot.',
        NULL,
        NULL
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '00000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000003',
        'confirmed',
        NOW() + INTERVAL '1 day',
        'Please focus on the balcony.',
        NULL,
        NULL
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '00000000-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000003',
        'in_progress',
        NOW() - INTERVAL '1 hour',
        'Standard clean plus oven.',
        NOW() - INTERVAL '45 minutes',
        NULL
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000003',
        'completed',
        NOW() - INTERVAL '1 day',
        'Check-out clean.',
        NOW() - INTERVAL '26 hours',
        NOW() - INTERVAL '23 hours'
    );

-- 8. CLEANING TASKS
INSERT INTO
    public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
SELECT
    c.id,
    t.description,
    FALSE,
    (c.status = 'completed')
FROM
    public.cleanings c,
    public.standard_tasks t;

INSERT INTO
    public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Focus on kitchen appliances and behind fridge', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'Scrub balcony tiles', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000005', 'Clean inside wardrobe', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000007', 'Polish wooden furniture', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000009', 'Wash curtains', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000010', 'Clean extractor fan', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000012', 'Descale kettle and coffee maker', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000014', 'Clean under sofa cushions', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000016', 'Clean light fixtures', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000018', 'Organise pantry shelves', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000019', 'Steam clean mattress', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000020', 'Clean heating vents', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000021', 'Wash throw pillows', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000022', 'Clean garbage bin', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000023', 'Clean door handles and light switches', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000024', 'Polish silverware', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000025', 'Clean washing machine seals', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000001', 'Vacuum mattress', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'Clean window tracks', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'Defrost freezer', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000004', 'Clean air conditioner filters', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000005', 'Dust ceiling fans', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000006', 'Clean radiators', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000007', 'Wash pet bowls', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000008', 'Clean smoke detectors', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000009', 'Organise utility cupboard', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000010', 'Clean bicycle', TRUE, TRUE);

-- 9. EVIDENCE MEDIA (For some completed jobs)
INSERT INTO
    public.evidence_media (
        cleaning_id,
        uploader_id,
        media_url,
        TYPE
    )
VALUES
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-1.jpg',
        'image'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-2.jpg',
        'image'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-3.jpg',
        'image'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-4.jpg',
        'image'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-5.jpg',
        'image'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/video-low.mp4',
        'video'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/video-high.mp4',
        'video'
    ),
    -- More evidence for other completed cleanings
    (
        'c0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000001/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000002/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000003/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000007',
        'c0000000-0000-0000-0000-000000000004/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000009',
        'c0000000-0000-0000-0000-000000000005/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000006/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000007',
        '00000000-0000-0000-0000-000000000011',
        'c0000000-0000-0000-0000-000000000007/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000009',
        '00000000-0000-0000-0000-000000000013',
        'c0000000-0000-0000-0000-000000000009/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000015',
        'c0000000-0000-0000-0000-000000000010/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000011',
        'c0000000-0000-0000-0000-000000000012/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000013',
        '00000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000013/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000015',
        '00000000-0000-0000-0000-000000000007',
        'c0000000-0000-0000-0000-000000000015/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000017',
        '00000000-0000-0000-0000-000000000011',
        'c0000000-0000-0000-0000-000000000017/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000018',
        '00000000-0000-0000-0000-000000000013',
        'c0000000-0000-0000-0000-000000000018/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000019',
        '00000000-0000-0000-0000-000000000015',
        'c0000000-0000-0000-0000-000000000019/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000020',
        '00000000-0000-0000-0000-000000000019',
        'c0000000-0000-0000-0000-000000000020/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000013',
        'c0000000-0000-0000-0000-000000000022/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000023/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000024',
        '00000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000024/cleaning-1.jpg',
        'image'
    ),
    (
        'c0000000-0000-0000-0000-000000000025',
        '00000000-0000-0000-0000-000000000007',
        'c0000000-0000-0000-0000-000000000025/cleaning-1.jpg',
        'image'
    );

INSERT INTO
    public.cleaning_reports (cleaning_id, cleaner_id, broken_items_report, low_supplies_report)
VALUES
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000003',
        'Small crack found on the master bedroom window pane.',
        'Running low on multi-surface cleaner and bathroom bleach.'
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000003',
        NULL,
        'Bathroom cleaner running low.'
    ),
    (
        'c0000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000009',
        'One curtain tieback is broken.',
        'Need more vacuum bags.'
    ),
    (
        'c0000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000015',
        'Kitchen tap is leaking slightly.',
        NULL
    ),
    (
        'c0000000-0000-0000-0000-000000000016',
        '00000000-0000-0000-0000-000000000009',
        NULL,
        'Running very low on cleaning supplies.'
    ),
    (
        'c0000000-0000-0000-0000-000000000018',
        '00000000-0000-0000-0000-000000000013',
        'Hairline crack in bathroom tile.',
        'Low on bathroom bleach.'
    ),
    (
        'c0000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000003',
        'Bedside lamp not working.',
        NULL
    );