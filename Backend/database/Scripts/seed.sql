-- ============================================
-- Seed Data for Plans
-- ============================================

-- Trial Plan (base plan for all organizations)
INSERT INTO plans (
    id,
    name,
    description,
    lead_limit,
    user_limit,
    features,
    monthly_price_per_user,
    quarterly_price_per_user,
    yearly_price_per_user,
    currency,
    is_active,
    trial_days,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Trial',
    '15-day free trial with limited AI and CRM features',
    200,
    5,
    '{
      "call_recording": true,
      "call_recording_storage_gb": 5,
      "ai_call_summary": "basic",
      "max_lead_routing_rule": 5,
      "ai_lead_routing": true,
      "max_projects": 3,
      "max_units_per_project": 10,
      "ai_campaign_creator": true,
      "max_ai_campaign": 2,
      "ai_lead_scoring": "basic",
      "analytics_level": "basic",
      "export_enabled": false,
      "ai_chat_bot": true,
      "ai_agent": true,
      "post_sales": true
    }'::jsonb,
    0.00,
    0.00,
    0.00,
    'INR',
    true,
    15,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Starter with AI Plan
INSERT INTO plans (
    id,
    name,
    description,
    lead_limit,
    user_limit,
    features,
    monthly_price_per_user,
    quarterly_price_per_user,
    yearly_price_per_user,
    currency,
    is_active,
    trial_days,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Starter with AI',
    'AI-powered CRM for growing sales teams',
    20000,
    20,
    '{
      "call_recording": true,
      "call_recording_storage_gb": 50,
      "ai_call_summary": "basic",
      "max_lead_routing_rule": 10,
      "ai_lead_routing": true,
      "max_projects": 10,
      "max_units_per_project": 50,
      "ai_campaign_creator": true,
      "max_ai_campaign": 2,
      "ai_lead_scoring": "basic",
      "analytics_level": "basic",
      "export_enabled": false,
      "ai_chat_bot": true,
      "ai_agent": true,
      "post_sales": true
    }'::jsonb,
    499.00,
    NULL,
    399.00,
    'INR',
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ============================================
-- Seed Data for Bhoomi Plots & Lands Organization
-- ============================================

-- Organization: Bhoomi Plots & Lands
WITH org_insert AS (
    INSERT INTO organizations (
        id, name, email, phone, address, city, state, country, pincode,
        type, company_size, status, website, tax_id, gstin,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        'Bhoomi Plots & Lands',
        'admin@bhoomiplots.com',
        '01111111112',
        'Shree Hari Krushna Complex Shop Number 13 and 14 Old Adgaon Naka Panchavati',
        'Nashik',
        'Maharashtra',
        'India',
        '422003',
        'broker',
        'medium',
        'active',
        'https://bhoomiplots.com',
        'BHOOMI123456',
        '27ABAFB0749E1ZT',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id
),
trial_plan AS (
    SELECT id FROM plans WHERE name = 'Trial' LIMIT 1
),
org_id AS (
    SELECT id FROM org_insert
),
gm_insert AS (
    INSERT INTO users_general_managers (
        id, organization_id, name, phone, email, password_hash,
        gender, dob, employee_id, status, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(),
        org_id.id,
        'Jadish',
        '01111111113',
        'jadish@bhoomiplots.com',
        '$2b$10$PBvCtmGfyUgNRmFeS5YtH.vqcRIpbJzf5mF4WmfYeCu4nTJhthWK.', -- Test@123456
        'male',
        '1985-01-15'::DATE,
        'BHOOMI-GM001',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM org_id
    RETURNING id, organization_id
),
manager_insert AS (
    INSERT INTO users_managers (
        id, organization_id, name, phone, email, password_hash,
        gender, dob, employee_id, permissions, status, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(),
        gm_insert.organization_id,
        'Aparna',
        '01111111114',
        'aparna@bhoomiplots.com',
        '$2b$10$PBvCtmGfyUgNRmFeS5YtH.vqcRIpbJzf5mF4WmfYeCu4nTJhthWK.', -- Test@123456
        'female',
        '1990-05-20'::DATE,
        'BHOOMI-MGR001',
        ARRAY['view_leads', 'create_leads', 'manage_employees', 'create_teams']::user_permission[],
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM gm_insert
    RETURNING id, organization_id
),
presales_insert AS (
    INSERT INTO users_presales (
        id, organization_id, name, phone, email, password_hash,
        gender, dob, employee_id, permissions, status, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(),
        manager_insert.organization_id,
        'Madhu',
        '01111111115',
        'madhu@bhoomiplots.com',
        '$2b$10$PBvCtmGfyUgNRmFeS5YtH.vqcRIpbJzf5mF4WmfYeCu4nTJhthWK.', -- Test@123456
        'female',
        '1992-08-10'::DATE,
        'BHOOMI-PS001',
        ARRAY['view_leads', 'create_leads', 'edit_leads']::user_permission[],
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM manager_insert
    RETURNING id, organization_id
),
sales_insert AS (
    INSERT INTO users_sales (
        id, organization_id, name, phone, email, password_hash,
        gender, dob, employee_id, permissions, status, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(),
        presales_insert.organization_id,
        'Lokesh',
        '01111111116',
        'lokesh@bhoomiplots.com',
        '$2b$10$PBvCtmGfyUgNRmFeS5YtH.vqcRIpbJzf5mF4WmfYeCu4nTJhthWK.', -- Test@123456
        'male',
        '1993-03-25'::DATE,
        'BHOOMI-SLS001',
        ARRAY['view_leads', 'create_leads', 'close_deals']::user_permission[],
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM presales_insert
    RETURNING id, organization_id
)
INSERT INTO subscriptions (
    organization_id, plan_id, status, start_date, end_date,
    billing_cycle, auto_renew, created_at, updated_at
)
SELECT 
    sales_insert.organization_id,
    trial_plan.id,
    'trial',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '15 days',
    'monthly',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM sales_insert, trial_plan;

-- ============================================
-- REJECTION QUESTIONS SEED DATA
-- ============================================
-- 20 Questions across 5 categories (each question has 4 multiple-choice options)

-- Budget Category (4 questions)
INSERT INTO rejection_questions (id, question_text, options, category, status) VALUES
(gen_random_uuid(), 'Is the property price beyond your budget?', 
 ARRAY['Yes, significantly over budget', 'Yes, slightly over budget', 'No, it is within budget', 'Not sure yet'], 
 'budget', 'active'),

(gen_random_uuid(), 'Are you unable to arrange financing/home loan?', 
 ARRAY['Yes, loan was rejected', 'Yes, insufficient documentation', 'No, loan approved', 'Still in process'], 
 'budget', 'active'),

(gen_random_uuid(), 'Do you find the additional charges (parking, maintenance, etc.) too high?', 
 ARRAY['Yes, very high', 'Yes, somewhat high', 'No, reasonable', 'Not a concern'], 
 'budget', 'active'),

(gen_random_uuid(), 'Are you looking for a more affordable option?', 
 ARRAY['Yes, seeking cheaper alternatives', 'Yes, considering smaller units', 'No, happy with current', 'Undecided'], 
 'budget', 'active');

-- Area/Location Category (4 questions)
INSERT INTO rejection_questions (id, question_text, options, category, status) VALUES
(gen_random_uuid(), 'Is the property too far from your workplace?', 
 ARRAY['Yes, very far (>30km)', 'Yes, moderately far (15-30km)', 'No, close enough (<15km)', 'Not a factor'], 
 'area', 'active'),

(gen_random_uuid(), 'Are you concerned about connectivity and transportation?', 
 ARRAY['Yes, poor public transport', 'Yes, traffic congestion', 'No, connectivity is good', 'Not a concern'], 
 'area', 'active'),

(gen_random_uuid(), 'Is the neighborhood not suitable for your family?', 
 ARRAY['Yes, safety concerns', 'Yes, not family-friendly', 'No, it is suitable', 'Need more time to decide'], 
 'area', 'active'),

(gen_random_uuid(), 'Are basic amenities (schools, hospitals, markets) too far?', 
 ARRAY['Yes, very far', 'Yes, somewhat far', 'No, nearby', 'Not a priority'], 
 'area', 'active');

-- Timeline Category (4 questions)
INSERT INTO rejection_questions (id, question_text, options, category, status) VALUES
(gen_random_uuid(), 'Is the possession date too far in the future?', 
 ARRAY['Yes, need within 6 months', 'Yes, need within 1 year', 'No, timeline is fine', 'Flexible on timeline'], 
 'timeline', 'active'),

(gen_random_uuid(), 'Do you need immediate possession and this is under construction?', 
 ARRAY['Yes, need ready-to-move', 'Yes, prefer move-in within 3 months', 'No, can wait', 'Not decided yet'], 
 'timeline', 'active'),

(gen_random_uuid(), 'Are you concerned about project delays?', 
 ARRAY['Yes, builder has history of delays', 'Yes, worried about RERA compliance', 'No, confident in timeline', 'Need more information'], 
 'timeline', 'active'),

(gen_random_uuid(), 'Has your purchase timeline changed?', 
 ARRAY['Yes, postponed indefinitely', 'Yes, postponed by 6-12 months', 'No, timeline unchanged', 'Accelerated purchase plan'], 
 'timeline', 'active');

-- Project Quality Category (4 questions)
INSERT INTO rejection_questions (id, question_text, options, category, status) VALUES
(gen_random_uuid(), 'Is the property size/area not suitable for your needs?', 
 ARRAY['Yes, too small', 'Yes, too large', 'No, size is perfect', 'Flexible on size'], 
 'project_quality', 'active'),

(gen_random_uuid(), 'Is the property layout or design not appealing?', 
 ARRAY['Yes, poor layout', 'Yes, outdated design', 'No, design is good', 'Open to modifications'], 
 'project_quality', 'active'),

(gen_random_uuid(), 'Are the amenities (gym, pool, parking) not adequate?', 
 ARRAY['Yes, missing important amenities', 'Yes, poor quality amenities', 'No, amenities are good', 'Amenities not priority'], 
 'project_quality', 'active'),

(gen_random_uuid(), 'Do you have concerns about construction quality or builder reputation?', 
 ARRAY['Yes, quality concerns', 'Yes, negative reviews about builder', 'No, satisfied with quality', 'Need more information'], 
 'project_quality', 'active');

-- Loan Rejected Category (2 questions)
INSERT INTO rejection_questions (id, question_text, options, category, status) VALUES
(gen_random_uuid(), 'Was your home loan application rejected?', 
 ARRAY['Yes, by bank', 'Yes, by NBFC', 'No, approved', 'Not applied yet'], 
 'loan_rejected', 'active'),

(gen_random_uuid(), 'Is the loan amount insufficient for this property?', 
 ARRAY['Yes, significant shortfall', 'Yes, minor shortfall', 'No, adequate loan amount', 'Not applicable'], 
 'loan_rejected', 'active');

-- Plan Dropped Category (2 questions)
INSERT INTO rejection_questions (id, question_text, options, category, status) VALUES
(gen_random_uuid(), 'Have you decided not to purchase property at this time?', 
 ARRAY['Yes, financial reasons', 'Yes, personal reasons', 'No, still interested', 'Undecided'], 
 'plan_dropped', 'active'),

(gen_random_uuid(), 'Have you found a better investment opportunity?', 
 ARRAY['Yes, another property', 'Yes, non-real estate investment', 'No', 'Exploring options'], 
 'plan_dropped', 'active');

-- ============================================
-- Seed Data for Lead Sourcing: Housing.com API Config
-- ============================================

WITH bhoomi_org AS (
    SELECT id FROM organizations WHERE name = 'Bhoomi Plots & Lands' LIMIT 1
),
housing_api AS (
    INSERT INTO organization_apis (
        id, organization_id, provider, api_category, auth_type,
        api_key_encrypted, username, base_endpoint, status,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid(),
        bhoomi_org.id,
        'housing',
        'lead_sourcing',
        'api_key',
        '2c6f9b9c693e91afdf5a45786c2a7ca8',   -- encryptionKey from housing-leads-fetcher.js
        '24039743',                              -- profileId
        'https://pahal.housing.com/api/v0/get-builder-leads',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM bhoomi_org
    RETURNING id, organization_id
)
INSERT INTO lead_sourcing_api_configs (
    id, organization_api_id, sync_mode, sync_interval_min,
    lead_source_tag, mapping_config_json,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    housing_api.id,
    'scheduled',
    60,
    'housing',
    '{
      "response_leads_path": "data",
      "field_map": {
        "name": "lead_name",
        "phone": "lead_phone",
        "email": "lead_email",
        "city": "locality",
        "source_detail": "project_name",
        "external_project_id": "project_id",
        "external_lead_id": "lead_date",
        "external_created_at": "lead_date"
      },
      "provider_config": {
        "profile_id": "24039743",
        "fetch_lookback_days": "30"
      }
    }'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM housing_api;

-- Housing lead sourcing for any other organization that does not have it yet
-- (e.g. local dev users outside Bhoomi seed). Idempotent.
INSERT INTO organization_apis (
    id, organization_id, provider, api_category, auth_type,
    api_key_encrypted, username, base_endpoint, status,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    o.id,
    'housing',
    'lead_sourcing',
    'api_key',
    '2c6f9b9c693e91afdf5a45786c2a7ca8',
    '24039743',
    'https://pahal.housing.com/api/v0/get-builder-leads',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM organization_apis oa
    WHERE oa.organization_id = o.id AND oa.provider = 'housing'
);

INSERT INTO lead_sourcing_api_configs (
    id, organization_api_id, sync_mode, sync_interval_min,
    lead_source_tag, mapping_config_json,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    oa.id,
    'scheduled',
    60,
    'housing',
    '{
      "response_leads_path": "data",
      "field_map": {
        "name": "lead_name",
        "phone": "lead_phone",
        "email": "lead_email",
        "city": "locality",
        "source_detail": "project_name",
        "external_project_id": "project_id",
        "external_lead_id": "lead_date",
        "external_created_at": "lead_date"
      },
      "provider_config": {
        "profile_id": "24039743",
        "fetch_lookback_days": "30"
      }
    }'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM organization_apis oa
WHERE oa.provider = 'housing'
  AND NOT EXISTS (
    SELECT 1 FROM lead_sourcing_api_configs lsc
    WHERE lsc.organization_api_id = oa.id
  );

-- ============================================
-- Seed Sample Source Leads (for Sources tab)
-- ============================================
-- 5 new unqualified leads assigned to presales user "Madhu"
-- These will appear in Sources tab (status=unqualified) with budget filled.

WITH ps AS (
  SELECT id AS presales_id, organization_id
  FROM users_presales
  WHERE email = 'madhu@bhoomiplots.com'
  LIMIT 1
)
INSERT INTO leads (
  id,
  organization_id,
  name,
  phone,
  email,
  alternate_phone,
  address,
  city,
  state,
  pincode,
  source,
  source_detail,
  budget_min,
  budget_max,
  lead_temperature,
  status,
  stage,
  assigned_to_user_id,
  assigned_to_user_type,
  assigned_at,
  priority,
  tags,
  notes,
  imported_data_id,
  presales_user_id,
  sales_user_id,
  sales_accepted_at,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  gen_random_uuid(),
  ps.organization_id,
  l.name,
  l.phone,
  NULL,
  NULL,
  NULL,
  l.city,
  l.state,
  NULL,
  l.source::lead_source,
  NULL,
  l.budget_min,
  l.budget_max,
  l.lead_temperature::lead_temperature,
  'unqualified'::lead_status,
  'qualification'::lead_stage,
  ps.presales_id,
  'presales',
  CURRENT_TIMESTAMP,
  'medium'::lead_priority,
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
FROM ps,
LATERAL (VALUES
  ('Megha Patel',  '9999888885', 'Ahmedabad', 'Gujarat',  20.0, 25.0, 'warm', 'magicbricks'),
  ('Priya Singh',  '9999888883', 'Pune',      'Maharashtra', 30.0, 40.0, 'warm', 'housing'),
  ('Rahul Verma',  '9999888877', 'Mumbai',    'Maharashtra', 40.0, 50.0, 'hot', 'magicbricks'),
  ('Saurabh Jain', '9999888884', 'Jaipur',    'Rajasthan',   25.0, 35.0, 'cold', '99acres'),
  ('Ayesha Khan',  '9999888879', 'Delhi',     'Delhi',       35.0, 45.0, 'warm', '99acres')
) AS l(name, phone, city, state, budget_min, budget_max, lead_temperature, source);
