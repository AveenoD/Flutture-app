-- Stage 3 (Property Visit) sample: 5 visits, 5 calls, 5 messages, 5 follow-ups, stage remark
-- Run: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < Backend/Database/Scripts/seed_stage3_pv_sample.sql

DO $$
DECLARE
  v_lead_id UUID;
  v_org_id UUID;
  v_stage_id UUID;
  v_user_id UUID;
  v_conv_id UUID;
  i INT;
BEGIN
  -- Pick first lead that has assigned_to (presales) and get org
  SELECT l.id, l.organization_id INTO v_lead_id, v_org_id
  FROM leads l
  WHERE l.deleted_at IS NULL AND l.assigned_to_user_id IS NOT NULL
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'No lead found. Seed leads first.';
  END IF;

  SELECT id INTO v_user_id FROM users_presales WHERE organization_id = v_org_id LIMIT 1;
  IF v_user_id IS NULL THEN
    v_user_id := (SELECT id FROM users_managers WHERE organization_id = v_org_id LIMIT 1);
  END IF;

  -- Ensure property_visit stage exists for this lead
  INSERT INTO lead_stages (organization_id, lead_id, stage_type, remarks, status)
  SELECT v_org_id, v_lead_id, 'property_visit'::lead_stage_type, 'Stage 3 PV sample: site visits and follow-ups.', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM lead_stages WHERE lead_id = v_lead_id AND organization_id = v_org_id AND stage_type = 'property_visit');

  SELECT id INTO v_stage_id FROM lead_stages WHERE lead_id = v_lead_id AND organization_id = v_org_id AND stage_type = 'property_visit' LIMIT 1;

  -- 5 Property Visits (with remark and outcome)
  INSERT INTO lead_property_visits (organization_id, lead_id, created_by_user_id, created_by_user_type, scheduled_at, visit_type, visit_date, visit_time, status, outcome, remarks, location_city)
  VALUES
  (v_org_id, v_lead_id, v_user_id, 'presales', NOW() + INTERVAL '1 day', 'first_visit', CURRENT_DATE + 1, '09:00', 'completed', 'interested'::visit_outcome, 'PV sample visit 1 remark.', 'City1'),
  (v_org_id, v_lead_id, v_user_id, 'presales', NOW() + INTERVAL '2 days', 'revisit', CURRENT_DATE + 2, '10:00', 'completed', 'not_interested'::visit_outcome, 'PV sample visit 2 remark.', 'City2'),
  (v_org_id, v_lead_id, v_user_id, 'presales', NOW() + INTERVAL '3 days', 'first_visit', CURRENT_DATE + 3, '11:00', 'completed', 'follow_up'::visit_outcome, 'PV sample visit 3 remark.', 'City3'),
  (v_org_id, v_lead_id, v_user_id, 'presales', NOW() + INTERVAL '4 days', 'revisit', CURRENT_DATE + 4, '14:00', 'completed', 'negotiation_started'::visit_outcome, 'PV sample visit 4 remark.', 'City4'),
  (v_org_id, v_lead_id, v_user_id, 'presales', NOW() + INTERVAL '5 days', 'first_visit', CURRENT_DATE + 5, '15:30', 'completed', 'interested'::visit_outcome, 'PV sample visit 5 remark.', 'City5');

  -- 5 Calls (linked to property_visit stage)
  INSERT INTO lead_calls (organization_id, lead_id, lead_stage_id, caller_user_id, caller_user_type, call_status, call_started_at, call_ended_at, recording_url, recording_duration, call_outcome)
  VALUES
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'answered', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '10 min', 'https://rec.example.com/call1.mp3', 610, 'interested'::call_outcome),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'answered', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '12 min', 'https://rec.example.com/call2.mp3', 620, 'follow_up'::call_outcome),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'answered', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '8 min', 'https://rec.example.com/call3.mp3', 630, 'not_interested'::call_outcome),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'answered', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '15 min', 'https://rec.example.com/call4.mp3', 640, 'interested'::call_outcome),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'answered', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '9 min', 'https://rec.example.com/call5.mp3', 650, 'follow_up'::call_outcome);

  -- 1 WhatsApp conversation + 5 messages
  INSERT INTO whatsapp_conversations (organization_id, lead_id, lead_stage_id, status, conversation_started_at, last_message_at)
  VALUES (v_org_id, v_lead_id, v_stage_id, 'active', NOW() - INTERVAL '2 days', NOW())
  RETURNING id INTO v_conv_id;

  INSERT INTO whatsapp_messages (conversation_id, direction, message_type, message_text, delivery_status, sent_at)
  VALUES
  (v_conv_id, 'outbound', 'text', 'PV sample message 1: When can we schedule site visit?', 'delivered', NOW() - INTERVAL '2 days'),
  (v_conv_id, 'inbound', 'text', 'PV sample message 2: How about tomorrow 10 AM?', 'delivered', NOW() - INTERVAL '2 days' + INTERVAL '5 min'),
  (v_conv_id, 'outbound', 'text', 'PV sample message 3: Done. See you tomorrow.', 'delivered', NOW() - INTERVAL '2 days' + INTERVAL '10 min'),
  (v_conv_id, 'inbound', 'text', 'PV sample message 4: Thank you!', 'read', NOW() - INTERVAL '1 day'),
  (v_conv_id, 'outbound', 'text', 'PV sample message 5: You are welcome.', 'delivered', NOW() - INTERVAL '1 day' + INTERVAL '2 min');

  -- 5 Follow-ups (with remark), linked to property_visit stage
  INSERT INTO lead_followups (organization_id, lead_id, lead_stage_id, user_id, user_type, followup_type, followup_date, remark, status, outcome)
  VALUES
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'call', NOW() + INTERVAL '1 day', 'PV follow-up remark 1', 'completed', 'interested'::followup_outcome),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'whatsapp', NOW() + INTERVAL '2 days', 'PV follow-up remark 2', 'completed', 'follow_up'::followup_outcome),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'visit', NOW() + INTERVAL '3 days', 'PV follow-up remark 3', 'pending', NULL),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'meeting', NOW() + INTERVAL '4 days', 'PV follow-up remark 4', 'pending', NULL),
  (v_org_id, v_lead_id, v_stage_id, v_user_id, 'presales', 'document', NOW() + INTERVAL '5 days', 'PV follow-up remark 5', 'pending', NULL);

  RAISE NOTICE 'Stage 3 PV sample seeded. lead_id=%, stage_id=%, visits=5, calls=5, messages=5, follow_ups=5', v_lead_id, v_stage_id;
END $$;
