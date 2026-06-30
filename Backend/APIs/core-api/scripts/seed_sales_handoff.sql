-- Seed for sales handoff E2E: creates two FRESH leads so repeated runs always have a clean state.
-- Run: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/seed_sales_handoff.sql
DO $$
DECLARE
  v_org_id     UUID;
  v_project_id UUID;
  v_sales_id   UUID;
  v_presales_id UUID;
  v_lead_id    UUID;
  v_lead2_id   UUID;
BEGIN
  SELECT id, organization_id INTO v_presales_id, v_org_id FROM users_presales WHERE email = 'madhu@bhoomiplots.com' AND deleted_at IS NULL LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_project_id FROM projects WHERE organization_id = v_org_id AND deleted_at IS NULL LIMIT 1;
  IF v_project_id IS NULL THEN
    INSERT INTO projects (organization_id, project_title, project_type, status, created_at, updated_at)
    VALUES (v_org_id, 'E2E Handoff Project', 'residential', 'active', NOW(), NOW())
    RETURNING id INTO v_project_id;
  END IF;

  SELECT id INTO v_sales_id FROM users_sales WHERE organization_id = v_org_id AND deleted_at IS NULL AND email = 'lokesh@bhoomiplots.com' LIMIT 1;
  IF v_sales_id IS NULL THEN RETURN; END IF;

  UPDATE users_sales SET project_assigned_ids = COALESCE(project_assigned_ids, ARRAY[]::UUID[]) || ARRAY[v_project_id]
    WHERE id = v_sales_id AND (project_assigned_ids IS NULL OR NOT (v_project_id = ANY(project_assigned_ids)));

  -- Always create TWO fresh leads so test always has clean directly-assigned presales leads
  INSERT INTO leads (organization_id, phone, status, stage, assigned_to_user_id, assigned_to_user_type, assigned_at, project_id, created_at, updated_at)
  VALUES (v_org_id, '9' || floor(random()*900000000+100000000)::TEXT, 'new', 'qualification', v_presales_id, 'presales', NOW(), v_project_id, NOW(), NOW())
  RETURNING id INTO v_lead_id;

  INSERT INTO leads (organization_id, phone, status, stage, assigned_to_user_id, assigned_to_user_type, assigned_at, project_id, created_at, updated_at)
  VALUES (v_org_id, '9' || floor(random()*900000000+100000000)::TEXT, 'new', 'qualification', v_presales_id, 'presales', NOW(), v_project_id, NOW(), NOW())
  RETURNING id INTO v_lead2_id;

  RAISE NOTICE 'Seeded leads: lead1=%, lead2=%', v_lead_id, v_lead2_id;
END $$;
