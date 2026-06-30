-- Seed for Booking E2E: lead in booking stage with existing lead_bookings row.
-- Run after migrate_booking.sql. Use: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/seed_booking_e2e.sql
DO $$
DECLARE
  v_org_id     UUID;
  v_sales_id   UUID;
  v_lead_id    UUID;
  v_project_id UUID;
  v_unit_id    UUID;
  v_stage_id   UUID;
  v_booking_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM users_sales WHERE email = 'lokesh@bhoomiplots.com' AND deleted_at IS NULL LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_sales_id FROM users_sales WHERE organization_id = v_org_id AND email = 'lokesh@bhoomiplots.com' AND deleted_at IS NULL LIMIT 1;
  IF v_sales_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_project_id FROM projects WHERE organization_id = v_org_id AND deleted_at IS NULL LIMIT 1;
  IF v_project_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_unit_id FROM project_units WHERE project_id = v_project_id LIMIT 1;
  IF v_unit_id IS NULL THEN RETURN; END IF;

  -- Use existing lead or create one; put in booking stage
  SELECT id INTO v_lead_id FROM leads WHERE organization_id = v_org_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1;
  IF v_lead_id IS NULL THEN
    INSERT INTO leads (organization_id, name, phone, lead_temperature, status, stage, assigned_to_user_id, assigned_to_user_type, assigned_at, sales_user_id, sales_accepted_at, created_at, updated_at)
    VALUES (v_org_id, 'E2E Booking Lead', '+919876543211', 'hot', 'negotiation', 'booking', v_sales_id, 'sales', NOW(), v_sales_id, NOW(), NOW(), NOW())
    RETURNING id INTO v_lead_id;
  ELSE
    UPDATE leads SET stage = 'booking', status = 'negotiation', assigned_to_user_id = v_sales_id, assigned_to_user_type = 'sales', assigned_at = NOW(), sales_user_id = v_sales_id, sales_accepted_at = NOW(), updated_at = NOW() WHERE id = v_lead_id;
  END IF;

  -- Mark any existing active stage as completed
  UPDATE lead_stages SET status = 'completed', updated_at = NOW() WHERE lead_id = v_lead_id AND organization_id = v_org_id AND status = 'active';

  -- Create active booking stage row
  INSERT INTO lead_stages (organization_id, lead_id, stage_type, user_id, user_type, status, created_at, updated_at)
  VALUES (v_org_id, v_lead_id, 'booking', v_sales_id, 'sales', 'active', NOW(), NOW())
  RETURNING id INTO v_stage_id;

  -- Remove any existing booking for this lead (so E2E starts fresh)
  DELETE FROM lead_booking_documents WHERE lead_booking_id IN (SELECT id FROM lead_bookings WHERE lead_id = v_lead_id);
  DELETE FROM lead_bookings WHERE lead_id = v_lead_id;

  -- Create lead_bookings row (initiated)
  INSERT INTO lead_bookings (organization_id, lead_id, user_id, user_type, stage_id, project_id, unit_id, addon_ids, final_total_price, booking_status, created_at, updated_at)
  VALUES (v_org_id, v_lead_id, v_sales_id, 'sales', v_stage_id, v_project_id, v_unit_id, ARRAY[]::UUID[], 3500000, 'initiated', NOW(), NOW())
  RETURNING id INTO v_booking_id;

  -- Unit can stay available or under_negotiation; for booking flow it was locked during negotiation
  UPDATE project_units SET status = 'under_negotiation', updated_at = NOW() WHERE id = v_unit_id;

  RAISE NOTICE 'Seed OK: lead_id=%, booking_id=%, project_id=%, unit_id=%, stage_id=%', v_lead_id, v_booking_id, v_project_id, v_unit_id, v_stage_id;
END
$$;
