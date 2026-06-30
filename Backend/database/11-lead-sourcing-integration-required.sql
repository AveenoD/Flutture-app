-- ============================================
-- Lead Sourcing Integration - Required Migration
-- ============================================
-- Purpose:
--   This script captures the minimum DB requirements for
--   lead sourcing integration so any developer can run it
--   on an existing database safely.
--
-- Includes:
--   1) Required enum values
--   2) Leads dedup support (external_lead_id + unique index)
--   3) Required tables:
--      - organization_apis
--      - lead_sourcing_api_configs
--      - external_project_mappings
--      - lead_sync_logs
--   4) Required indexes
--
-- Notes:
--   - Script is idempotent (IF NOT EXISTS where possible).
--   - Run this after base schema files:
--     01-enums.sql, 02-organizations.sql, 05-leads.sql, 06-projects.sql.
-- ============================================

-- --------------------------------------------
-- 1) Required enum values
-- --------------------------------------------
ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'housing';
ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'nobroker';
ALTER TYPE api_provider ADD VALUE IF NOT EXISTS 'magicbricks';

ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'housing';
ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'nobroker';
ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'magicbricks';
ALTER TYPE lead_source_tag ADD VALUE IF NOT EXISTS 'google_ads';

-- --------------------------------------------
-- 2) Leads dedup support for external providers
-- --------------------------------------------
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS external_lead_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_dedup
  ON leads (organization_id, source, external_lead_id)
  WHERE external_lead_id IS NOT NULL
    AND external_lead_id <> ''
    AND source IS NOT NULL
    AND source <> '';

-- --------------------------------------------
-- 3) Required lead-sourcing tables
-- --------------------------------------------

-- Per-organization provider credentials/config.
CREATE TABLE IF NOT EXISTS organization_apis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider              api_provider NOT NULL,
  api_category          api_category NOT NULL,
  auth_type             auth_type NOT NULL,
  api_key_encrypted     TEXT,
  username              VARCHAR(255),
  password_encrypted    TEXT,
  base_endpoint         VARCHAR(500),
  status                api_status NOT NULL DEFAULT 'active',
  last_health_check_at  TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Per-provider sync + mapping configuration.
CREATE TABLE IF NOT EXISTS lead_sourcing_api_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_api_id   UUID NOT NULL REFERENCES organization_apis(id) ON DELETE CASCADE,
  sync_mode             sync_mode NOT NULL,
  sync_interval_min     INTEGER,
  last_synced_at        TIMESTAMP WITH TIME ZONE,
  lead_source_tag       lead_source_tag NOT NULL,
  mapping_config_json   JSONB DEFAULT '{}',
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- External project id -> internal project id map.
CREATE TABLE IF NOT EXISTS external_project_mappings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider              api_provider NOT NULL,
  external_project_id   VARCHAR(255) NOT NULL,
  external_project_name VARCHAR(500),
  internal_project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, provider, external_project_id)
);

-- Sync observability logs.
CREATE TABLE IF NOT EXISTS lead_sync_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_sourcing_config_id UUID NOT NULL REFERENCES lead_sourcing_api_configs(id) ON DELETE CASCADE,
  started_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at            TIMESTAMP WITH TIME ZONE,
  status                  VARCHAR(20) NOT NULL DEFAULT 'running',
  leads_fetched           INTEGER DEFAULT 0,
  leads_created           INTEGER DEFAULT 0,
  leads_skipped           INTEGER DEFAULT 0,
  error_message           TEXT,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------
-- 4) Required indexes
-- --------------------------------------------

CREATE INDEX IF NOT EXISTS idx_organization_apis_organization_id
  ON organization_apis (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_apis_org_provider
  ON organization_apis (organization_id, provider);
CREATE INDEX IF NOT EXISTS idx_organization_apis_org_category
  ON organization_apis (organization_id, api_category);
CREATE INDEX IF NOT EXISTS idx_organization_apis_org_status
  ON organization_apis (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_lead_sourcing_api_configs_org_api_id
  ON lead_sourcing_api_configs (organization_api_id);
CREATE INDEX IF NOT EXISTS idx_lead_sourcing_api_configs_api_sync_mode
  ON lead_sourcing_api_configs (organization_api_id, sync_mode);
CREATE INDEX IF NOT EXISTS idx_lead_sourcing_api_configs_api_source_tag
  ON lead_sourcing_api_configs (organization_api_id, lead_source_tag);
CREATE INDEX IF NOT EXISTS idx_lead_sourcing_api_configs_last_synced_at
  ON lead_sourcing_api_configs (last_synced_at)
  WHERE last_synced_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ext_proj_map_org
  ON external_project_mappings (organization_id);
CREATE INDEX IF NOT EXISTS idx_ext_proj_map_provider
  ON external_project_mappings (organization_id, provider);
CREATE INDEX IF NOT EXISTS idx_ext_proj_map_internal
  ON external_project_mappings (internal_project_id)
  WHERE internal_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_sync_logs_config
  ON lead_sync_logs (lead_sourcing_config_id);
CREATE INDEX IF NOT EXISTS idx_lead_sync_logs_started
  ON lead_sync_logs (started_at);
CREATE INDEX IF NOT EXISTS idx_lead_sync_logs_status
  ON lead_sync_logs (status);

-- ============================================
-- End
-- ============================================
