-- ============================================
-- Lead Routing and Rejection Tables
-- ============================================

-- ============================================
-- Lead Routing Rules Table
-- ============================================

CREATE TABLE lead_routing_rules (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    manager_user_id             UUID REFERENCES users_managers(id) ON DELETE SET NULL,
    rule_name                   VARCHAR(255) NOT NULL,
    priority                    INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5),  -- 1 (highest) to 5 (lowest)
    affected_lead_sources       routing_lead_source[] DEFAULT ARRAY[]::routing_lead_source[],
    affected_areas              TEXT[] DEFAULT ARRAY[]::TEXT[],  -- array of city / zone / locality
    languages                   language[] DEFAULT ARRAY[]::language[],
    minimum_budget_range        DECIMAL(12, 2),
    maximum_budget_range        DECIMAL(12, 2),
    affected_lead_statuses      routing_lead_status[] DEFAULT ARRAY[]::routing_lead_status[],
    affected_user_ids           UUID[] DEFAULT ARRAY[]::UUID[],  -- array of user IDs (FK)
    affected_team_ids           UUID[] DEFAULT ARRAY[]::UUID[],  -- array of team IDs (FK)
    max_pending_leads_per_user  INTEGER,
    max_pending_followups_per_user INTEGER,
    rule_status                rule_status NOT NULL DEFAULT 'active',
    flow_type_order             flow_type_order NOT NULL DEFAULT 'round-robin',
    target_role                 VARCHAR(20) NOT NULL DEFAULT 'presales' CHECK (target_role IN ('presales', 'sales')),
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Lead Rejections Table
-- ============================================

CREATE TABLE lead_rejections (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    rejected_by_user_id     UUID,  -- Polymorphic reference to users
    rejected_by_user_type    user_type,
    stage_id                UUID REFERENCES lead_stages(id) ON DELETE SET NULL,  -- lead_stages.id (kis stage pe reject hui)
    questions_response      JSONB DEFAULT '[]',  -- JSON array
    -- {
    --   question_id,
    --   question_text,
    --   answer,
    --   category,
    --   interest_score (1–10)
    -- }
    ai_summary              TEXT,
    ai_bullet_points        JSONB DEFAULT '[]',  -- JSON array
    rejected_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Rejection Questions Table
-- ============================================

CREATE TABLE rejection_questions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text           TEXT NOT NULL,
    options                 TEXT[] NOT NULL,  -- array of 4 text options
    category                rejection_category NOT NULL,
    status                  question_status NOT NULL DEFAULT 'active',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Lead Routing Rules
-- ============================================

CREATE INDEX idx_lead_routing_rules_organization_id ON lead_routing_rules(organization_id);
CREATE INDEX idx_lead_routing_rules_manager_user_id ON lead_routing_rules(manager_user_id) WHERE manager_user_id IS NOT NULL;
CREATE INDEX idx_lead_routing_rules_priority ON lead_routing_rules(priority);
CREATE INDEX idx_lead_routing_rules_rule_status ON lead_routing_rules(rule_status);
CREATE INDEX idx_lead_routing_rules_flow_type_order ON lead_routing_rules(flow_type_order);
CREATE INDEX idx_lead_routing_rules_created_at ON lead_routing_rules(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_routing_rules_org_status ON lead_routing_rules(organization_id, rule_status);
CREATE INDEX idx_lead_routing_rules_org_priority ON lead_routing_rules(organization_id, priority);
CREATE INDEX idx_lead_routing_rules_manager_status ON lead_routing_rules(manager_user_id, rule_status) WHERE manager_user_id IS NOT NULL;
CREATE INDEX idx_lead_routing_rules_target_role ON lead_routing_rules(target_role);

-- ============================================
-- Indexes for Lead Rejections
-- ============================================

CREATE INDEX idx_lead_rejections_organization_id ON lead_rejections(organization_id);
CREATE INDEX idx_lead_rejections_lead_id ON lead_rejections(lead_id);
CREATE INDEX idx_lead_rejections_rejected_by_user_id ON lead_rejections(rejected_by_user_id) WHERE rejected_by_user_id IS NOT NULL;
CREATE INDEX idx_lead_rejections_rejected_by_user_type ON lead_rejections(rejected_by_user_type) WHERE rejected_by_user_type IS NOT NULL;
CREATE INDEX idx_lead_rejections_stage_id ON lead_rejections(stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX idx_lead_rejections_rejected_at ON lead_rejections(rejected_at);
CREATE INDEX idx_lead_rejections_created_at ON lead_rejections(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_rejections_org_lead ON lead_rejections(organization_id, lead_id);
CREATE INDEX idx_lead_rejections_lead_rejected_at ON lead_rejections(lead_id, rejected_at);
CREATE INDEX idx_lead_rejections_user_rejected_at ON lead_rejections(rejected_by_user_id, rejected_at) WHERE rejected_by_user_id IS NOT NULL;

-- ============================================
-- Indexes for Rejection Questions
-- ============================================

CREATE INDEX idx_rejection_questions_category ON rejection_questions(category);
CREATE INDEX idx_rejection_questions_status ON rejection_questions(status);
CREATE INDEX idx_rejection_questions_created_at ON rejection_questions(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_rejection_questions_category_status ON rejection_questions(category, status);

-- For existing databases: add target_role to lead_routing_rules if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_routing_rules' AND column_name = 'target_role') THEN
    ALTER TABLE lead_routing_rules ADD COLUMN target_role VARCHAR(20) NOT NULL DEFAULT 'presales' CHECK (target_role IN ('presales', 'sales'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_lead_routing_rules_target_role ON lead_routing_rules(target_role);
