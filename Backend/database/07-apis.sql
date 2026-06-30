-- ============================================
-- API Related Tables
-- ============================================
-- NOTE: For existing databases run the following one-by-one (outside transaction)
-- before applying this file, since ALTER TYPE ADD VALUE cannot run in a txn block:
--   ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'housing';
--   ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'nobroker';
--   ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'magicbricks';
--   ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'housing';
--   ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'nobroker';
--   ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'magicbricks';
--   ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'google_ads';
-- Fresh installs: 01-enums.sql already includes these values so no action needed.

-- ============================================
-- Organization APIs Table
-- ============================================

CREATE TABLE organization_apis (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider                api_provider NOT NULL,
    api_category            api_category NOT NULL,
    auth_type               auth_type NOT NULL,
    api_key_encrypted       TEXT,
    username                VARCHAR(255),
    password_encrypted       TEXT,
    base_endpoint           VARCHAR(500),
    status                  api_status NOT NULL DEFAULT 'active',
    last_health_check_at     TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Lead Sourcing API Configs Table
-- ============================================

CREATE TABLE lead_sourcing_api_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_api_id     UUID NOT NULL REFERENCES organization_apis(id) ON DELETE CASCADE,
    sync_mode               sync_mode NOT NULL,
    sync_interval_min       INTEGER,  -- in minutes
    last_synced_at          TIMESTAMP WITH TIME ZONE,
    lead_source_tag         lead_source_tag NOT NULL,
    mapping_config_json     JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WhatsApp Accounts Table
-- ============================================

CREATE TABLE whatsapp_accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number_id         VARCHAR(50) NOT NULL,
    display_phone_number    VARCHAR(20) NOT NULL,
    business_account_id     VARCHAR(50) NOT NULL,
    access_token            TEXT NOT NULL,
    webhook_verify_token    VARCHAR(255),
    status                  VARCHAR(20) DEFAULT 'active',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Organization APIs
-- ============================================

CREATE INDEX idx_organization_apis_organization_id ON organization_apis(organization_id);
CREATE INDEX idx_organization_apis_provider ON organization_apis(provider);
CREATE INDEX idx_organization_apis_api_category ON organization_apis(api_category);
CREATE INDEX idx_organization_apis_status ON organization_apis(status);
CREATE INDEX idx_organization_apis_auth_type ON organization_apis(auth_type);
CREATE INDEX idx_organization_apis_last_health_check_at ON organization_apis(last_health_check_at) WHERE last_health_check_at IS NOT NULL;
CREATE INDEX idx_organization_apis_created_at ON organization_apis(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_organization_apis_org_provider ON organization_apis(organization_id, provider);
CREATE INDEX idx_organization_apis_org_category ON organization_apis(organization_id, api_category);
CREATE INDEX idx_organization_apis_org_status ON organization_apis(organization_id, status);

-- ============================================
-- Indexes for Lead Sourcing API Configs
-- ============================================

CREATE INDEX idx_lead_sourcing_api_configs_org_api_id ON lead_sourcing_api_configs(organization_api_id);
CREATE INDEX idx_lead_sourcing_api_configs_sync_mode ON lead_sourcing_api_configs(sync_mode);
CREATE INDEX idx_lead_sourcing_api_configs_lead_source_tag ON lead_sourcing_api_configs(lead_source_tag);
CREATE INDEX idx_lead_sourcing_api_configs_last_synced_at ON lead_sourcing_api_configs(last_synced_at) WHERE last_synced_at IS NOT NULL;
CREATE INDEX idx_lead_sourcing_api_configs_created_at ON lead_sourcing_api_configs(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_sourcing_api_configs_api_sync_mode ON lead_sourcing_api_configs(organization_api_id, sync_mode);
CREATE INDEX idx_lead_sourcing_api_configs_api_source_tag ON lead_sourcing_api_configs(organization_api_id, lead_source_tag);

-- ============================================
-- Indexes for WhatsApp Accounts
-- ============================================

CREATE INDEX idx_whatsapp_accounts_organization_id ON whatsapp_accounts(organization_id);
CREATE INDEX idx_whatsapp_accounts_phone_number_id ON whatsapp_accounts(phone_number_id);
CREATE INDEX idx_whatsapp_accounts_business_account_id ON whatsapp_accounts(business_account_id);
CREATE INDEX idx_whatsapp_accounts_status ON whatsapp_accounts(status);
CREATE INDEX idx_whatsapp_accounts_display_phone_number ON whatsapp_accounts(display_phone_number);
CREATE INDEX idx_whatsapp_accounts_created_at ON whatsapp_accounts(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_whatsapp_accounts_org_status ON whatsapp_accounts(organization_id, status);

-- ============================================
-- External Project Mappings Table
-- Maps provider-specific project IDs (e.g. Housing project_id: 288969)
-- to internal projects.id UUIDs so imported leads can be linked to a project.
-- ============================================

CREATE TABLE external_project_mappings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider              api_provider NOT NULL,
    external_project_id   VARCHAR(255) NOT NULL,
    external_project_name VARCHAR(500),
    internal_project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, provider, external_project_id)
);

CREATE INDEX idx_ext_proj_map_org ON external_project_mappings(organization_id);
CREATE INDEX idx_ext_proj_map_provider ON external_project_mappings(organization_id, provider);
CREATE INDEX idx_ext_proj_map_internal ON external_project_mappings(internal_project_id) WHERE internal_project_id IS NOT NULL;

-- ============================================
-- Lead Sync Logs Table
-- Records the outcome of each scheduled/manual API sync run.
-- ============================================

CREATE TABLE lead_sync_logs (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_sourcing_config_id  UUID NOT NULL REFERENCES lead_sourcing_api_configs(id) ON DELETE CASCADE,
    started_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at             TIMESTAMP WITH TIME ZONE,
    status                   VARCHAR(20) NOT NULL DEFAULT 'running',
    leads_fetched            INTEGER DEFAULT 0,
    leads_created            INTEGER DEFAULT 0,
    leads_skipped            INTEGER DEFAULT 0,
    error_message            TEXT,
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_sync_logs_config ON lead_sync_logs(lead_sourcing_config_id);
CREATE INDEX idx_lead_sync_logs_started ON lead_sync_logs(started_at);
CREATE INDEX idx_lead_sync_logs_status ON lead_sync_logs(status);
