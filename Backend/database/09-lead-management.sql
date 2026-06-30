-- ============================================
-- Lead Management Tables
-- ============================================

-- ============================================
-- Lead Stages Table (created first as other tables reference it)
-- ============================================

CREATE TABLE lead_stages (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    stage_type             lead_stage_type NOT NULL,
    user_id                 UUID,  -- Polymorphic reference to users (presales/sales/postsales)
    user_type               user_type,
    remarks                 TEXT,  -- manual note
    ai_summary              TEXT,  -- AI generated stage summary
    status                  stage_status NOT NULL DEFAULT 'active',
    ai_bullet_points        JSONB DEFAULT '[]',  -- JSON (AI extracted key points)
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Lead Followups Table
-- ============================================

CREATE TABLE lead_followups (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    lead_stage_id           UUID REFERENCES lead_stages(id) ON DELETE SET NULL,
    lead_call_id            UUID REFERENCES lead_calls(id) ON DELETE SET NULL,
    user_id                 UUID,  -- jisne follow-up kiya / assign hai (polymorphic)
    user_type               user_type,
    followup_type           followup_type NOT NULL,
    followup_date           TIMESTAMP WITH TIME ZONE NOT NULL,  -- kab karna hai (date + time)
    remark                  TEXT,  -- manual note by user
    status                  followup_status NOT NULL DEFAULT 'pending',
    outcome                 followup_outcome,
    ai_bullet_points        JSONB DEFAULT '[]',  -- JSON (AI extracted key points)
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at            TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Lead Property Visits Table
-- ============================================

CREATE TABLE lead_property_visits (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    project_id              UUID REFERENCES projects(id) ON DELETE SET NULL,  -- interested project
    created_by_user_id      UUID,  -- Polymorphic reference to users
    created_by_user_type    user_type,
    scheduled_at            TIMESTAMP WITH TIME ZONE,
    visit_type              visit_type NOT NULL,
    visit_date              DATE,
    visit_time              TIME,
    status                  visit_status NOT NULL DEFAULT 'scheduled',
    delay_reason            delay_reason,
    outcome                 visit_outcome,
    remarks                 TEXT,
    location_city           VARCHAR(100),
    location_area            VARCHAR(100),
    location_coordinates    TEXT,  -- lat,long OR geo-json
    site_visit_images       TEXT[] DEFAULT ARRAY[]::TEXT[],  -- array of URLs
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Lead Negotiations Table
-- ============================================

CREATE TABLE lead_negotiations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id                 UUID,  -- jis sales agent ne negotiate kiya (polymorphic)
    user_type               user_type,
    stage_id                UUID REFERENCES lead_stages(id) ON DELETE SET NULL,  -- lead_stages.id (negotiation stage)
    project_id               UUID REFERENCES projects(id) ON DELETE SET NULL,  -- selected property / project
    unit_id                  UUID REFERENCES project_units(id) ON DELETE SET NULL,  -- selected flat / villa / plot
    addon_ids                UUID[] DEFAULT ARRAY[]::UUID[],  -- array of addon IDs (parking, club, etc.)
    price_offered            DECIMAL(12, 2),  -- client offer
    approval_required        BOOLEAN DEFAULT false,  -- from manager
    final_price_agreed       DECIMAL(12, 2),  -- mutually agreed price
    user_commission          DECIMAL(12, 2),  -- sales / broker commission
    discount_amount          DECIMAL(12, 2),
    discount_title           VARCHAR(255),
    status                   negotiation_status NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Lead Bookings Table
-- ============================================

CREATE TABLE lead_bookings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id                 UUID,  -- Polymorphic reference to users
    user_type               user_type,
    stage_id                UUID REFERENCES lead_stages(id) ON DELETE SET NULL,  -- lead_stages.id (booking stage)
    project_id               UUID REFERENCES projects(id) ON DELETE SET NULL,
    unit_id                  UUID REFERENCES project_units(id) ON DELETE SET NULL,
    addon_ids                UUID[] DEFAULT ARRAY[]::UUID[],  -- array of addon IDs
    final_total_price        DECIMAL(12, 2),
    token_amount             DECIMAL(12, 2),
    token_date               DATE,
    payment_mode             payment_mode,
    payment_transaction_id   VARCHAR(255),
    payment_proof_images     TEXT[] DEFAULT ARRAY[]::TEXT[],  -- array of image URLs
    emi_applicable           BOOLEAN DEFAULT false,
    extra_charges_applicable BOOLEAN DEFAULT false,
    loan_amount              DECIMAL(12, 2),
    interest_rate            DECIMAL(5, 2),
    tenure_months            INTEGER,
    down_payment             DECIMAL(12, 2),
    monthly_emi              DECIMAL(12, 2),
    bank_name                VARCHAR(255),
    maintenance_charges       DECIMAL(12, 2),
    legal_charges            DECIMAL(12, 2),
    stamp_duty               DECIMAL(12, 2),
    parking_charges          DECIMAL(12, 2),
    booking_status           booking_status NOT NULL DEFAULT 'initiated',
    possession_date_expected DATE,
    remarks                  TEXT,
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Lead Booking Documents Table
-- ============================================

CREATE TABLE lead_booking_documents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_booking_id          UUID NOT NULL REFERENCES lead_bookings(id) ON DELETE CASCADE,
    quotation_id             UUID REFERENCES lead_quotations(id) ON DELETE SET NULL,
    document_name            VARCHAR(255) NOT NULL,
    document_type            document_type NOT NULL,
    document_number          VARCHAR(255),
    document_front_photo_url TEXT,
    document_back_photo_url  TEXT,
    remarks                  TEXT,
    uploaded_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Lead Quotations Table
-- ============================================

CREATE TABLE lead_quotations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    negotiation_id          UUID REFERENCES lead_negotiations(id) ON DELETE SET NULL,
    user_id                 UUID,  -- Polymorphic reference to users
    user_type               user_type,
    channel_partner_id      UUID,  -- optional (broker / CP) - can be added as FK later if needed
    project_id              UUID REFERENCES projects(id) ON DELETE SET NULL,
    unit_id                 UUID REFERENCES project_units(id) ON DELETE SET NULL,
    addon_ids               UUID[] DEFAULT ARRAY[]::UUID[],  -- array of addon IDs
    base_price              DECIMAL(12, 2),
    parking_price            DECIMAL(12, 2),
    infrastructure_cost      DECIMAL(12, 2),
    development_charges      DECIMAL(12, 2),
    water_charges            DECIMAL(12, 2),
    mseb_charges             DECIMAL(12, 2),
    legal_charges            DECIMAL(12, 2),
    stamp_duty               DECIMAL(12, 2),
    registration_fee         DECIMAL(12, 2),
    gst                      DECIMAL(12, 2),
    vat                      DECIMAL(12, 2),
    one_time_maintenance     DECIMAL(12, 2),
    additional_charges       JSONB DEFAULT '{}',  -- JSON { label, amount }
    discount_name            VARCHAR(255),
    discount_price           DECIMAL(12, 2),
    customer_name            VARCHAR(255),
    customer_contact         VARCHAR(20),
    customer_email           VARCHAR(255),
    quotation_status         quotation_status NOT NULL DEFAULT 'draft',
    quotation_version        INTEGER DEFAULT 1,  -- 1,2,3 (revision tracking)
    valid_till               DATE,  -- expiry date
    shared_via               shared_via,
    rejection_reason         TEXT,  -- manager note when rejecting (shown to sales)
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Add Foreign Key Constraint for whatsapp_conversations.lead_stage_id
-- (Now that lead_stages is created)
-- ============================================

ALTER TABLE whatsapp_conversations 
ADD CONSTRAINT fk_whatsapp_conversations_lead_stage_id 
FOREIGN KEY (lead_stage_id) 
REFERENCES lead_stages(id) 
ON DELETE SET NULL;

ALTER TABLE lead_calls 
ADD CONSTRAINT fk_lead_calls_lead_stage_id 
FOREIGN KEY (lead_stage_id) 
REFERENCES lead_stages(id) 
ON DELETE SET NULL;

-- ============================================
-- Indexes for Lead Stages
-- ============================================

CREATE INDEX idx_lead_stages_organization_id ON lead_stages(organization_id);
CREATE INDEX idx_lead_stages_lead_id ON lead_stages(lead_id);
CREATE INDEX idx_lead_stages_stage_type ON lead_stages(stage_type);
CREATE INDEX idx_lead_stages_status ON lead_stages(status);
CREATE INDEX idx_lead_stages_user_id ON lead_stages(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_lead_stages_user_type ON lead_stages(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX idx_lead_stages_created_at ON lead_stages(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_stages_lead_stage_type ON lead_stages(lead_id, stage_type);
CREATE INDEX idx_lead_stages_lead_status ON lead_stages(lead_id, status);
CREATE INDEX idx_lead_stages_org_lead ON lead_stages(organization_id, lead_id);

-- ============================================
-- Indexes for Lead Followups
-- ============================================

CREATE INDEX idx_lead_followups_organization_id ON lead_followups(organization_id);
CREATE INDEX idx_lead_followups_lead_id ON lead_followups(lead_id);
CREATE INDEX idx_lead_followups_lead_stage_id ON lead_followups(lead_stage_id) WHERE lead_stage_id IS NOT NULL;
CREATE INDEX idx_lead_followups_lead_call_id ON lead_followups(lead_call_id) WHERE lead_call_id IS NOT NULL;
CREATE INDEX idx_lead_followups_user_id ON lead_followups(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_lead_followups_user_type ON lead_followups(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX idx_lead_followups_followup_type ON lead_followups(followup_type);
CREATE INDEX idx_lead_followups_status ON lead_followups(status);
CREATE INDEX idx_lead_followups_outcome ON lead_followups(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX idx_lead_followups_followup_date ON lead_followups(followup_date);
CREATE INDEX idx_lead_followups_created_at ON lead_followups(created_at);
CREATE INDEX idx_lead_followups_completed_at ON lead_followups(completed_at) WHERE completed_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_lead_followups_lead_status ON lead_followups(lead_id, status);
CREATE INDEX idx_lead_followups_org_lead ON lead_followups(organization_id, lead_id);
CREATE INDEX idx_lead_followups_user_status ON lead_followups(user_id, status) WHERE user_id IS NOT NULL;

-- ============================================
-- Indexes for Lead Property Visits
-- ============================================

CREATE INDEX idx_lead_property_visits_organization_id ON lead_property_visits(organization_id);
CREATE INDEX idx_lead_property_visits_lead_id ON lead_property_visits(lead_id);
CREATE INDEX idx_lead_property_visits_project_id ON lead_property_visits(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_lead_property_visits_created_by_user_id ON lead_property_visits(created_by_user_id) WHERE created_by_user_id IS NOT NULL;
CREATE INDEX idx_lead_property_visits_created_by_user_type ON lead_property_visits(created_by_user_type) WHERE created_by_user_type IS NOT NULL;
CREATE INDEX idx_lead_property_visits_visit_type ON lead_property_visits(visit_type);
CREATE INDEX idx_lead_property_visits_status ON lead_property_visits(status);
CREATE INDEX idx_lead_property_visits_outcome ON lead_property_visits(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX idx_lead_property_visits_scheduled_at ON lead_property_visits(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_lead_property_visits_visit_date ON lead_property_visits(visit_date) WHERE visit_date IS NOT NULL;
CREATE INDEX idx_lead_property_visits_location_city ON lead_property_visits(location_city) WHERE location_city IS NOT NULL;
CREATE INDEX idx_lead_property_visits_created_at ON lead_property_visits(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_property_visits_lead_status ON lead_property_visits(lead_id, status);
CREATE INDEX idx_lead_property_visits_org_lead ON lead_property_visits(organization_id, lead_id);
CREATE INDEX idx_lead_property_visits_project_status ON lead_property_visits(project_id, status) WHERE project_id IS NOT NULL;

-- ============================================
-- Indexes for Lead Negotiations
-- ============================================

CREATE INDEX idx_lead_negotiations_organization_id ON lead_negotiations(organization_id);
CREATE INDEX idx_lead_negotiations_lead_id ON lead_negotiations(lead_id);
CREATE INDEX idx_lead_negotiations_user_id ON lead_negotiations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_lead_negotiations_user_type ON lead_negotiations(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX idx_lead_negotiations_stage_id ON lead_negotiations(stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX idx_lead_negotiations_project_id ON lead_negotiations(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_lead_negotiations_unit_id ON lead_negotiations(unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX idx_lead_negotiations_approval_required ON lead_negotiations(approval_required) WHERE approval_required = true;
CREATE INDEX idx_lead_negotiations_status ON lead_negotiations(status);
CREATE INDEX idx_lead_negotiations_created_at ON lead_negotiations(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_negotiations_lead_project ON lead_negotiations(lead_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_lead_negotiations_org_lead ON lead_negotiations(organization_id, lead_id);

-- ============================================
-- Indexes for Lead Bookings
-- ============================================

CREATE INDEX idx_lead_bookings_organization_id ON lead_bookings(organization_id);
CREATE INDEX idx_lead_bookings_lead_id ON lead_bookings(lead_id);
CREATE INDEX idx_lead_bookings_user_id ON lead_bookings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_lead_bookings_user_type ON lead_bookings(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX idx_lead_bookings_stage_id ON lead_bookings(stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX idx_lead_bookings_project_id ON lead_bookings(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_lead_bookings_unit_id ON lead_bookings(unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX idx_lead_bookings_booking_status ON lead_bookings(booking_status);
CREATE INDEX idx_lead_bookings_payment_mode ON lead_bookings(payment_mode) WHERE payment_mode IS NOT NULL;
CREATE INDEX idx_lead_bookings_token_date ON lead_bookings(token_date) WHERE token_date IS NOT NULL;
CREATE INDEX idx_lead_bookings_created_at ON lead_bookings(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_bookings_lead_status ON lead_bookings(lead_id, booking_status);
CREATE INDEX idx_lead_bookings_org_lead ON lead_bookings(organization_id, lead_id);
CREATE INDEX idx_lead_bookings_project_status ON lead_bookings(project_id, booking_status) WHERE project_id IS NOT NULL;

-- ============================================
-- Indexes for Lead Booking Documents
-- ============================================

CREATE INDEX idx_lead_booking_documents_lead_booking_id ON lead_booking_documents(lead_booking_id);
CREATE INDEX idx_lead_booking_documents_document_type ON lead_booking_documents(document_type);
CREATE INDEX idx_lead_booking_documents_uploaded_at ON lead_booking_documents(uploaded_at);

-- ============================================
-- Indexes for Lead Quotations
-- ============================================

CREATE INDEX idx_lead_quotations_organization_id ON lead_quotations(organization_id);
CREATE INDEX idx_lead_quotations_lead_id ON lead_quotations(lead_id);
CREATE INDEX idx_lead_quotations_negotiation_id ON lead_quotations(negotiation_id) WHERE negotiation_id IS NOT NULL;
CREATE INDEX idx_lead_quotations_user_id ON lead_quotations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_lead_quotations_user_type ON lead_quotations(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX idx_lead_quotations_project_id ON lead_quotations(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_lead_quotations_unit_id ON lead_quotations(unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX idx_lead_quotations_quotation_status ON lead_quotations(quotation_status);
CREATE INDEX idx_lead_quotations_shared_via ON lead_quotations(shared_via) WHERE shared_via IS NOT NULL;
CREATE INDEX idx_lead_quotations_valid_till ON lead_quotations(valid_till) WHERE valid_till IS NOT NULL;
CREATE INDEX idx_lead_quotations_quotation_version ON lead_quotations(quotation_version);
CREATE INDEX idx_lead_quotations_created_at ON lead_quotations(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_quotations_lead_status ON lead_quotations(lead_id, quotation_status);
CREATE INDEX idx_lead_quotations_org_lead ON lead_quotations(organization_id, lead_id);
CREATE INDEX idx_lead_quotations_project_status ON lead_quotations(project_id, quotation_status) WHERE project_id IS NOT NULL;

-- Enforce at most one approved quotation per lead.
CREATE UNIQUE INDEX idx_lead_quotations_one_approved ON lead_quotations(lead_id) WHERE quotation_status = 'approved';
