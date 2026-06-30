-- ============================================
-- Leads Table
-- ============================================

CREATE TABLE leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    phone                   VARCHAR(20) NOT NULL,
    email                   VARCHAR(255),
    alternate_phone         VARCHAR(20),
    address                 TEXT,
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    pincode                 VARCHAR(10),
    source                  lead_source,
    source_detail           TEXT,  -- Additional source information
    budget_min              DECIMAL(12, 2),
    budget_max              DECIMAL(12, 2),
    lead_temperature        lead_temperature NOT NULL DEFAULT 'warm',
    status                  lead_status NOT NULL DEFAULT 'unqualified',
    stage                   lead_stage DEFAULT 'qualification',
    assigned_to_user_id     UUID,  -- Can reference any user table (polymorphic)
    assigned_to_user_type   VARCHAR(20) CHECK (assigned_to_user_type IN ('presales', 'sales', 'manager')),
    assigned_at             TIMESTAMP WITH TIME ZONE,
    priority                lead_priority DEFAULT 'medium',
    tags                    TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Custom tags for filtering
    notes                   TEXT,
    imported_data_id        UUID REFERENCES imported_data(id) ON DELETE SET NULL,
    presales_user_id        UUID,  -- Presales who owned lead at handoff (for visibility up to stage 3)
    sales_user_id           UUID,  -- Sales assigned (pending or accepted)
    sales_accepted_at       TIMESTAMP WITH TIME ZONE,  -- NULL = not accepted; set when sales accepts
    external_lead_id        VARCHAR(255),  -- Provider-specific lead ID for deduplication during API sync
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);

-- ============================================
-- Indexes for Leads
-- ============================================

-- Organization and basic lookups
CREATE INDEX idx_leads_organization_id ON leads(organization_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;

-- Status and stage filtering
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_lead_temperature ON leads(lead_temperature);

-- Source filtering
CREATE INDEX idx_leads_source ON leads(source);

-- Assignment related
CREATE INDEX idx_leads_assigned_to_user_id ON leads(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX idx_leads_assigned_to_user_type ON leads(assigned_to_user_type) WHERE assigned_to_user_type IS NOT NULL;
CREATE INDEX idx_leads_assigned_at ON leads(assigned_at) WHERE assigned_at IS NOT NULL;

-- Imported data reference
CREATE INDEX idx_leads_imported_data_id ON leads(imported_data_id) WHERE imported_data_id IS NOT NULL;

-- Priority and dates
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_updated_at ON leads(updated_at);

-- Soft delete
CREATE INDEX idx_leads_deleted_at ON leads(deleted_at) WHERE deleted_at IS NULL;

-- Budget range queries
CREATE INDEX idx_leads_budget_min ON leads(budget_min) WHERE budget_min IS NOT NULL;
CREATE INDEX idx_leads_budget_max ON leads(budget_max) WHERE budget_max IS NOT NULL;

-- Location based queries
CREATE INDEX idx_leads_city ON leads(city) WHERE city IS NOT NULL;
CREATE INDEX idx_leads_state ON leads(state) WHERE state IS NOT NULL;
CREATE INDEX idx_leads_pincode ON leads(pincode) WHERE pincode IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_leads_org_status ON leads(organization_id, status);
CREATE INDEX idx_leads_org_stage ON leads(organization_id, stage);
CREATE INDEX idx_leads_status_stage ON leads(status, stage);
CREATE INDEX idx_leads_org_assigned ON leads(organization_id, assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;

-- Sales handoff (presales/sales visibility and pending accept)
CREATE INDEX idx_leads_presales_user_id ON leads(presales_user_id) WHERE presales_user_id IS NOT NULL;
CREATE INDEX idx_leads_sales_user_id ON leads(sales_user_id) WHERE sales_user_id IS NOT NULL;
CREATE INDEX idx_leads_sales_accepted_at ON leads(sales_accepted_at) WHERE sales_accepted_at IS NOT NULL;

-- External lead ID deduplication for API-sourced leads
CREATE UNIQUE INDEX idx_leads_external_dedup
    ON leads(organization_id, source, external_lead_id)
    WHERE external_lead_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================
-- Imported Data Table
-- ============================================

CREATE TABLE imported_data (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    imported_by             UUID NOT NULL,  -- User ID (polymorphic - can be any user type)
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);

-- ============================================
-- Indexes for Imported Data
-- ============================================

-- Organization and basic lookups
CREATE INDEX idx_imported_data_organization_id ON imported_data(organization_id);
CREATE INDEX idx_imported_data_imported_by ON imported_data(imported_by);

-- Soft delete
CREATE INDEX idx_imported_data_deleted_at ON imported_data(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX idx_imported_data_org_imported_by ON imported_data(organization_id, imported_by);
CREATE INDEX idx_imported_data_created_at ON imported_data(created_at);

-- ============================================
-- For existing databases: add sales handoff columns to leads if missing
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'presales_user_id') THEN
    ALTER TABLE leads ADD COLUMN presales_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'sales_user_id') THEN
    ALTER TABLE leads ADD COLUMN sales_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'sales_accepted_at') THEN
    ALTER TABLE leads ADD COLUMN sales_accepted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_presales_user_id ON leads(presales_user_id) WHERE presales_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sales_user_id ON leads(sales_user_id) WHERE sales_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sales_accepted_at ON leads(sales_accepted_at) WHERE sales_accepted_at IS NOT NULL;
