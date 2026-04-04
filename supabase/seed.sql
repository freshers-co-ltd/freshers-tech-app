-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. AUTH SEEDING
SET session_replication_role = 'replica';

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, last_sign_in_at, raw_app_meta_data, 
    raw_user_meta_data, is_super_admin, created_at, updated_at, 
    confirmation_token, recovery_token, email_change_token_new, email_change, 
    phone_change, phone_change_token, reauthentication_token, 
    is_sso_user, is_anonymous
)
VALUES
(
    '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'admin@test.com',
    extensions.crypt('password1!', extensions.gen_salt('bf', 10)),
    now(), now(),
    '{"provider": "email", "providers": ["email"], "role": "admin"}',
    '{"sub": "00000000-0000-0000-0000-000000000001", "role": "admin", "full_name": "Steve Admin", "email_verified": true}',
    false, now(), now(), '', '', '', '', '', '', '', false, false
),
(
    '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'host@test.com',
    extensions.crypt('password1!', extensions.gen_salt('bf', 10)),
    now(), now(),
    '{"provider": "email", "providers": ["email"], "role": "host"}',
    '{"sub": "00000000-0000-0000-0000-000000000002", "role": "host", "full_name": "John Host", "email_verified": true}',
    false, now(), now(), '', '', '', '', '', '', '', false, false
),
(
    '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'cleaner@test.com',
    extensions.crypt('password1!', extensions.gen_salt('bf', 10)),
    now(), now(),
    '{"provider": "email", "providers": ["email"], "role": "cleaner"}',
    '{"sub": "00000000-0000-0000-0000-000000000003", "role": "cleaner", "full_name": "Mark Cleaner", "email_verified": true}',
    false, now(), now(), '', '', '', '', '', '', '', false, false
);

-- 3. AUTH IDENTITIES
INSERT INTO auth.identities (
    id, 
    user_id, 
    identity_data, 
    provider, 
    provider_id, 
    last_sign_in_at, 
    created_at, 
    updated_at
) 
VALUES 
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@test.com","email_verified":true}'::jsonb, 'email', '00000000-0000-0000-0000-000000000001', now(), now(), now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"host@test.com","email_verified":true}'::jsonb, 'email', '00000000-0000-0000-0000-000000000002', now(), now(), now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '{"sub":"00000000-0000-0000-0000-000000000003","email":"cleaner@test.com","email_verified":true}'::jsonb, 'email', '00000000-0000-0000-0000-000000000003', now(), now(), now());

-- 4. PUBLIC PROFILES
INSERT INTO public.profiles (id, email, role, full_name, is_verified) 
VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@test.com', 'admin', 'Steve Admin', true), 
('00000000-0000-0000-0000-000000000002', 'host@test.com', 'host', 'John Host', true), 
('00000000-0000-0000-0000-000000000003', 'cleaner@test.com', 'cleaner', 'Mark Cleaner', true);

SET session_replication_role = 'origin';

-- 5. STANDARD TASKS
INSERT INTO public.standard_tasks (description)
VALUES 
  ('Vacuum all carpets'),
  ('Mop hard floors'),
  ('Clean bathroom surfaces'),
  ('Change bed linens');

-- 6. PROPERTIES
INSERT INTO public.properties (id, host_id, address_line_1, town_city, postcode, type, bedrooms, bathrooms, main_image_url, extra_images_urls)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111', 
    '00000000-0000-0000-0000-000000000002', 
    'Flat 4, City Center', 'Southampton', 'SO15 1XY', 'apartment', 1, 1,
    '00000000-0000-0000-0000-000000000002/property-1-img-1.jpg',
    ARRAY[
      '00000000-0000-0000-0000-000000000002/property-1-img-2.jpg',
      '00000000-0000-0000-0000-000000000002/property-1-img-3.jpg',
      '00000000-0000-0000-0000-000000000002/property-1-img-4.jpg',
      '00000000-0000-0000-0000-000000000002/property-1-img-5.jpg'
    ]
  ),
  (
    '22222222-2222-2222-2222-222222222222', 
    '00000000-0000-0000-0000-000000000002', 
    '123 Ocean View', 'Southampton', 'SO14 0AB', 'house', 2, 2,
    '00000000-0000-0000-0000-000000000002/property-2-img-1.jpg',
    ARRAY[
      '00000000-0000-0000-0000-000000000002/property-2-img-2.jpg',
      '00000000-0000-0000-0000-000000000002/property-2-img-3.jpg',
      '00000000-0000-0000-0000-000000000002/property-2-img-4.jpg',
      '00000000-0000-0000-0000-000000000002/property-2-img-5.jpg'
    ]
  );
 
INSERT INTO public.cleanings (id, host_id, property_id, cleaner_id, status, scheduled_start, service_cost, instructions, clock_in_time, clock_out_time)
VALUES 
  -- 1. Requested: No cleaner assigned yet
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', NULL, 'requested', now() + interval '2 days', 45.00, 'Key is under the blue pot.', NULL, NULL),
  
  -- 2. Assigned: Cleaner linked, but not started
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000003', 'confirmed', now() + interval '1 day', 30.00, 'Please focus on the balcony.', NULL, NULL),
  
  -- 3. In Progress: Cleaner has clocked in
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', 'in_progress', now() - interval '1 hour', 45.00, 'Standard clean plus oven.', now() - interval '45 minutes', NULL),
  
  -- 4. Completed: Cleaner has clocked out and uploaded evidence
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000003', 'completed', now() - interval '1 day', 60.00, 'Check-out clean.', now() - interval '26 hours', now() - interval '23 hours');

-- 8. CLEANING TASKS
INSERT INTO public.cleaning_tasks (cleaning_id, description, is_custom, is_completed)
SELECT c.id, t.description, false, (c.status = 'completed')
FROM public.cleanings c, public.standard_tasks t;

-- 9. EVIDENCE MEDIA (For the completed job 'dddddddd')
INSERT INTO public.evidence_media (cleaning_id, uploader_id, media_url, type)
VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-1.jpg', 'image'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-2.jpg', 'image'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-3.jpg', 'image'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-4.jpg', 'image'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd/cleaning-5.jpg', 'image');

INSERT INTO public.cleaning_reports (cleaning_id, cleaner_id, broken_items_report, low_supplies_report)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 
    '00000000-0000-0000-0000-000000000003', 
    'Small crack found on the master bedroom window pane.', 
    'Running low on multi-surface cleaner and bathroom bleach.'
);