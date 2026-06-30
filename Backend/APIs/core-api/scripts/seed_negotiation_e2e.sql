-- Seed for Negotiation E2E: lead in negotiation stage (assigned to sales), project with available unit and addons.
-- Run after migrate_negotiation.sql. Use: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/seed_negotiation_e2e.sql
DO $$
DECLARE
  v_org_id     UUID;
  v_sales_id   UUID;
  v_lead_id    UUID;
  v_project_id UUID;
  v_unit_id    UUID;
  v_addon1_id  UUID;
  v_addon2_id  UUID;
  v_stage_id   UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM users_sales WHERE email = 'lokesh@bhoomiplots.com' AND deleted_at IS NULL LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_sales_id FROM users_sales WHERE organization_id = v_org_id AND email = 'lokesh@bhoomiplots.com' AND deleted_at IS NULL LIMIT 1;
  IF v_sales_id IS NULL THEN RETURN; END IF;

  -- Ensure project with unit and addons
  SELECT id INTO v_project_id FROM projects WHERE organization_id = v_org_id AND deleted_at IS NULL LIMIT 1;
  IF v_project_id IS NULL THEN
    INSERT INTO projects (organization_id, project_title, project_type, project_status, city, state, minimum_unit_price, maximum_unit_price, created_at, updated_at)
    VALUES (v_org_id, 'E2E Negotiation Project', 'residential', 'under_construction', 'Mumbai', 'Maharashtra', 3000000, 5000000, NOW(), NOW())
    RETURNING id INTO v_project_id;
  END IF;

  -- Unit (available) for this project
  SELECT id INTO v_unit_id FROM project_units WHERE project_id = v_project_id AND status = 'available' LIMIT 1;
  IF v_unit_id IS NULL THEN
    INSERT INTO project_units (project_id, name, floor, unit_type, status, base_price, parking_price, created_at, updated_at)
    VALUES (v_project_id, 'A-101', 1, 'flat', 'available', 3000000, 100000, NOW(), NOW())
    RETURNING id INTO v_unit_id;
  ELSE
    UPDATE project_units SET status = 'available', updated_at = NOW() WHERE id = v_unit_id;
  END IF;

  -- Addons
  SELECT id INTO v_addon1_id FROM project_addons WHERE project_id = v_project_id AND status = 'active' LIMIT 1;
  IF v_addon1_id IS NULL THEN
    INSERT INTO project_addons (project_id, title, category, price, status, created_at, updated_at)
    VALUES (v_project_id, 'Modular Kitchen', 'kitchen', 70000, 'active', NOW(), NOW())
    RETURNING id INTO v_addon1_id;
  END IF;
  SELECT id INTO v_addon2_id FROM project_addons WHERE project_id = v_project_id AND status = 'active' AND id != v_addon1_id LIMIT 1;
  IF v_addon2_id IS NULL THEN
    INSERT INTO project_addons (project_id, title, category, price, status, created_at, updated_at)
    VALUES (v_project_id, 'Luxury Washroom', 'sanitary', 90000, 'active', NOW(), NOW())
    RETURNING id INTO v_addon2_id;
  END IF;

  -- Lead: get one that we can assign to sales and put in negotiation stage
  SELECT id INTO v_lead_id FROM leads WHERE organization_id = v_org_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1;
  IF v_lead_id IS NULL THEN
    INSERT INTO leads (organization_id, name, phone, lead_temperature, status, stage, assigned_to_user_id, assigned_to_user_type, assigned_at, presales_user_id, sales_user_id, sales_accepted_at, created_at, updated_at)
    VALUES (v_org_id, 'E2E Negotiation Lead', '+919876543210', 'hot', 'qualified', 'negotiation', v_sales_id, 'sales', NOW(), NULL, v_sales_id, NOW(), NOW(), NOW())
    RETURNING id INTO v_lead_id;
  ELSE
    UPDATE leads SET stage = 'negotiation', status = 'qualified', assigned_to_user_id = v_sales_id, assigned_to_user_type = 'sales', assigned_at = NOW(), sales_user_id = v_sales_id, sales_accepted_at = NOW(), project_id = v_project_id, updated_at = NOW() WHERE id = v_lead_id;
  END IF;

  -- Remove any existing negotiation for this lead (so E2E can create one) and release unit
  UPDATE project_units SET status = 'available', updated_at = NOW() WHERE id IN (SELECT unit_id FROM lead_negotiations WHERE lead_id = v_lead_id AND unit_id IS NOT NULL);
  DELETE FROM lead_negotiations WHERE lead_id = v_lead_id;

  -- Mark any existing active stage for this lead as completed
  UPDATE lead_stages SET status = 'completed', updated_at = NOW() WHERE lead_id = v_lead_id AND organization_id = v_org_id AND status = 'active';

  -- Create active negotiation stage row
  INSERT INTO lead_stages (organization_id, lead_id, stage_type, user_id, user_type, status, created_at, updated_at)
  VALUES (v_org_id, v_lead_id, 'negotiation', v_sales_id, 'sales', 'active', NOW(), NOW())
  RETURNING id INTO v_stage_id;

  RAISE NOTICE 'Seed OK: lead_id=%, project_id=%, unit_id=%, addons=%,%', v_lead_id, v_project_id, v_unit_id, v_addon1_id, v_addon2_id;
END
$$;
