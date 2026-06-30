-- Seed sample data for communication stage: 1 call, 1 WhatsApp convo with messages, 2 follow-ups, stage remark
-- Uses existing lead and communication stage for lead 24c10f29-62b7-4c1f-93d3-91c0bcf549c9

DO $$
DECLARE
  v_org_id    UUID;
  v_lead_id   UUID := '24c10f29-62b7-4c1f-93d3-91c0bcf549c9';
  v_stage_id  UUID := 'f2c8aba4-29fa-4726-8f92-9d32e3e83087';
  v_conv_id   UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM lead_stages WHERE id = v_stage_id;

  -- 1) Sample call for communication stage (with recording)
  INSERT INTO lead_calls (organization_id, lead_id, lead_stage_id, call_status, call_outcome, call_started_at, call_ended_at, recording_url, recording_duration, created_at, updated_at)
  VALUES (v_org_id, v_lead_id, v_stage_id, 'answered', 'follow_up', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes', 'https://recordings.example.com/comm-call-1.mp3', 180, NOW(), NOW());

  -- 2) WhatsApp conversation for communication stage
  INSERT INTO whatsapp_conversations (organization_id, lead_id, lead_stage_id, status, conversation_started_at, last_message_at, created_at, updated_at)
  VALUES (v_org_id, v_lead_id, v_stage_id, 'active', NOW() - INTERVAL '1 day', NOW(), NOW(), NOW())
  RETURNING id INTO v_conv_id;

  -- 3) WhatsApp messages in that conversation
  INSERT INTO whatsapp_messages (conversation_id, direction, message_type, message_text, delivery_status, sent_at, created_at)
  VALUES
    (v_conv_id, 'outbound', 'text', 'Hi, this is regarding the property you inquired about.', 'delivered', NOW() - INTERVAL '23 hours', NOW()),
    (v_conv_id, 'inbound', 'text', 'Yes please share the details.', 'read', NOW() - INTERVAL '22 hours', NOW()),
    (v_conv_id, 'outbound', 'text', 'Sure. We have 2BHK available. When can we schedule a visit?', 'delivered', NOW() - INTERVAL '21 hours', NOW());

  -- 4) Follow-ups for communication stage
  INSERT INTO lead_followups (organization_id, lead_id, lead_stage_id, followup_type, followup_date, remark, status, created_at)
  VALUES
    (v_org_id, v_lead_id, v_stage_id, 'call', NOW() + INTERVAL '2 days', 'Schedule site visit after call', 'pending', NOW()),
    (v_org_id, v_lead_id, v_stage_id, 'whatsapp', NOW() + INTERVAL '1 day', 'Send brochure and pricing', 'pending', NOW());

  -- 5) Ensure stage has a remark (update if empty)
  UPDATE lead_stages SET remarks = COALESCE(NULLIF(TRIM(remarks), ''), 'Sample remark for communication stage – initial call done, follow-up scheduled.') WHERE id = v_stage_id AND (remarks IS NULL OR TRIM(remarks) = '');

  RAISE NOTICE 'Seeded: 1 call, 1 WhatsApp convo with 3 messages, 2 follow-ups for communication stage';
END $$;
