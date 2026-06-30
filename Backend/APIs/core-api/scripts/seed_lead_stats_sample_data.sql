-- Seed sample data for Lead Stats E2E: one lead assigned to first presales user,
-- with 2 calls (3:45 hrs total), 3 outbound WhatsApp messages, 1 completed site visit.
-- Run: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/seed_lead_stats_sample_data.sql

DO $$
DECLARE
  v_org_id     UUID;
  v_user_id    UUID;
  v_lead_id    UUID;
  v_conv_id    UUID;
  v_dur_1      INT := 9000;   -- 2:30 hrs in seconds
  v_dur_2      INT := 4500;   -- 1:15 hrs -> total 13500 = 3:45 hrs
BEGIN
  -- Use presales user with email madhu@bhoomiplots.com (same as E2E login), else first presales
  SELECT id, organization_id INTO v_user_id, v_org_id
  FROM users_presales
  WHERE deleted_at IS NULL AND email = 'madhu@bhoomiplots.com'
  LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id, organization_id INTO v_user_id, v_org_id
    FROM users_presales
    WHERE deleted_at IS NULL
    LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No presales user found. Create a presales user first.';
  END IF;

  -- Create one qualified lead assigned to this presales user (for stats cards)
  INSERT INTO leads (
    organization_id, name, phone, city, source, lead_temperature, status, stage,
    assigned_to_user_id, assigned_to_user_type, assigned_at, created_at, updated_at
  ) VALUES (
    v_org_id, 'Wasim', '9999888877', 'Pune', 'website', 'warm', 'qualified', 'qualification',
    v_user_id, 'presales', NOW(), NOW(), NOW()
  )
  RETURNING id INTO v_lead_id;

  -- Create multiple unqualified leads for Sources tab (no stage yet)
  INSERT INTO leads (
    organization_id, name, phone, city, source, lead_temperature, status, stage,
    assigned_to_user_id, assigned_to_user_type, assigned_at, created_at, updated_at
  ) VALUES
    (v_org_id, 'Wasim (Source 1)', '9999888878', 'Pune',        'magicbricks', 'cold', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Ayesha Khan',      '9999888879', 'Mumbai',      'housing',     'warm', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Rahul Sharma',     '9999888880', 'Delhi',       '99acres',     'cold', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Neha Verma',       '9999888881', 'Bengaluru',   'nobroker',    'hot',  'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Imran Shaikh',     '9999888882', 'Hyderabad',   'magicbricks', 'cold', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Priya Singh',      '9999888883', 'Pune',        'housing',     'warm', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Saurabh Jain',     '9999888884', 'Jaipur',      '99acres',     'cold', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Megha Patel',      '9999888885', 'Ahmedabad',   'magicbricks', 'warm', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Aditya Rao',       '9999888886', 'Chennai',     'website',     'cold', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW()),
    (v_org_id, 'Sneha Kulkarni',   '9999888887', 'Nagpur',      'referral',    'warm', 'unqualified', NULL, v_user_id, 'presales', NOW(), NOW(), NOW());

  -- 2 lead_calls with recording_duration (total 13500 sec = 3:45 hrs)
  INSERT INTO lead_calls (organization_id, lead_id, call_status, call_started_at, call_ended_at, recording_duration, created_at, updated_at)
  VALUES
    (v_org_id, v_lead_id, 'answered', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 second', v_dur_1, NOW(), NOW()),
    (v_org_id, v_lead_id, 'answered', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 second', v_dur_2, NOW(), NOW());

  -- 1 WhatsApp conversation
  INSERT INTO whatsapp_conversations (organization_id, lead_id, status, created_at, updated_at)
  VALUES (v_org_id, v_lead_id, 'active', NOW(), NOW())
  RETURNING id INTO v_conv_id;

  -- 3 outbound messages (message_sent = 3)
  INSERT INTO whatsapp_messages (conversation_id, direction, message_type, message_text, delivery_status, sent_at, created_at)
  VALUES
    (v_conv_id, 'outbound', 'text', 'Hi, sharing property details.', 'sent', NOW(), NOW()),
    (v_conv_id, 'outbound', 'text', 'When can we schedule a visit?', 'sent', NOW(), NOW()),
    (v_conv_id, 'outbound', 'text', 'Thanks for your interest.', 'sent', NOW(), NOW());

  -- 1 completed site visit (site_visit_done = 1)
  INSERT INTO lead_property_visits (
    organization_id, lead_id, created_by_user_id, created_by_user_type,
    visit_type, visit_date, visit_time, status, created_at, updated_at
  ) VALUES (
    v_org_id, v_lead_id, v_user_id, 'presales',
    'first_visit', CURRENT_DATE, '14:30', 'completed', NOW(), NOW()
  );

  RAISE NOTICE 'Seeded lead stats: lead_id=%, 2 calls (3:45 hrs), 3 outbound messages, 1 completed visit', v_lead_id;
  -- Output lead_id for scripts (optional): \echo LEAD_ID_START % \echo v_lead_id \echo LEAD_ID_END
END $$;
