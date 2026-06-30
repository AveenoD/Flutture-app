-- Add 2 follow-ups for one lead: 1 in communication stage, 1 in site visit (property_visit) stage.
-- Run: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/seed_two_followups_communication_site_visit.sql

DO $$
DECLARE
  v_org_id       UUID;
  v_presales_id  UUID;
  v_lead_id      UUID;
  v_stage_comm   UUID;
  v_stage_pv     UUID;
BEGIN
  -- Presales user (madhu) so follow-ups show in dashboard
  SELECT id, organization_id INTO v_presales_id, v_org_id
  FROM users_presales
  WHERE email = 'madhu@bhoomiplots.com' AND deleted_at IS NULL
  LIMIT 1;
  IF v_presales_id IS NULL THEN
    RAISE NOTICE 'No presales user found (madhu@bhoomiplots.com). Aborting.';
    RETURN;
  END IF;

  -- One lead assigned to this presales (or with presales_user_id set)
  SELECT id INTO v_lead_id
  FROM leads
  WHERE organization_id = v_org_id AND deleted_at IS NULL
    AND (
      (assigned_to_user_id = v_presales_id AND assigned_to_user_type = 'presales')
      OR presales_user_id = v_presales_id
    )
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_lead_id IS NULL THEN
    RAISE NOTICE 'No lead assigned to presales. Aborting.';
    RETURN;
  END IF;

  -- Get or create communication stage for this lead
  SELECT id INTO v_stage_comm
  FROM lead_stages
  WHERE lead_id = v_lead_id AND organization_id = v_org_id AND stage_type = 'communication'
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_stage_comm IS NULL THEN
    INSERT INTO lead_stages (organization_id, lead_id, stage_type, user_id, user_type, status, created_at, updated_at)
    VALUES (v_org_id, v_lead_id, 'communication', v_presales_id, 'presales', 'completed', NOW(), NOW())
    RETURNING id INTO v_stage_comm;
  END IF;

  -- Get or create property_visit (site visit) stage for this lead
  SELECT id INTO v_stage_pv
  FROM lead_stages
  WHERE lead_id = v_lead_id AND organization_id = v_org_id AND stage_type = 'property_visit'
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_stage_pv IS NULL THEN
    INSERT INTO lead_stages (organization_id, lead_id, stage_type, user_id, user_type, status, created_at, updated_at)
    VALUES (v_org_id, v_lead_id, 'property_visit', v_presales_id, 'presales', 'completed', NOW(), NOW())
    RETURNING id INTO v_stage_pv;
  END IF;

  -- 1) Follow-up in communication stage (e.g. call)
  INSERT INTO lead_followups (organization_id, lead_id, lead_stage_id, user_id, user_type, followup_type, followup_date, remark, status, created_at)
  VALUES (v_org_id, v_lead_id, v_stage_comm, v_presales_id, 'presales', 'call', NOW() + INTERVAL '1 day', 'Follow-up in communication stage', 'pending', NOW());

  -- 2) Follow-up in site visit stage (e.g. visit)
  INSERT INTO lead_followups (organization_id, lead_id, lead_stage_id, user_id, user_type, followup_type, followup_date, remark, status, created_at)
  VALUES (v_org_id, v_lead_id, v_stage_pv, v_presales_id, 'presales', 'visit', NOW() + INTERVAL '2 days', 'Site visit follow-up', 'pending', NOW());

  RAISE NOTICE 'Added 2 follow-ups for lead %: 1 communication (call), 1 site visit (visit). Stages: comm=%, pv=%', v_lead_id, v_stage_comm, v_stage_pv;
END $$;
