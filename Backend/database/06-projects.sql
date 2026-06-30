-- ============================================
-- Projects, Project Units, and Project Addons Tables
-- ============================================

-- ============================================
-- Projects Table
-- ============================================

CREATE TABLE projects (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_title               VARCHAR(255) NOT NULL,
    project_type                project_type NOT NULL,
    area_type                   area_type,
    rera_number                 VARCHAR(100),
    project_status              project_status,
    project_state               project_state,
    start_date                  DATE,
    expected_possession_date    DATE,
    project_floor_count         INTEGER,
    full_address                TEXT,
    city                        VARCHAR(100),
    pincode                     VARCHAR(10),
    state                       VARCHAR(100),
    country                     VARCHAR(100) DEFAULT 'India',
    coordinates                 TEXT,  -- lat,long OR geo-json
    amenities                   TEXT[] DEFAULT ARRAY[]::TEXT[],  -- array of amenities (lift, gym, pool, parking, etc.)
    minimum_unit_price          DECIMAL(12, 2),
    maximum_unit_price          DECIMAL(12, 2),
    project_area_size           DECIMAL(12, 2),  -- total land / built-up size
    smallest_unit_size          DECIMAL(10, 2),
    biggest_unit_size           DECIMAL(10, 2),
    project_cover_photo_url     TEXT,
    project_exterior_images_urls    TEXT[] DEFAULT ARRAY[]::TEXT[],
    project_interior_images_urls    TEXT[] DEFAULT ARRAY[]::TEXT[],
    project_exterior_videos_urls    TEXT[] DEFAULT ARRAY[]::TEXT[],
    project_drone_videos_urls       TEXT[] DEFAULT ARRAY[]::TEXT[],
    project_interior_videos_urls    TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Project Units Table
-- ============================================

CREATE TABLE project_units (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                    VARCHAR(100) NOT NULL,  -- A-1203, Villa-7, Shop-12
    floor                   INTEGER,
    wing                    VARCHAR(50),
    unit_type               unit_type NOT NULL,
    carpet_area             DECIMAL(10, 2),
    builtup_area            DECIMAL(10, 2),
    facing_direction        facing_direction,
    status                  unit_status NOT NULL DEFAULT 'available',
    unit_code               VARCHAR(100),  -- internal / builder code
    base_price              DECIMAL(12, 2),
    parking_price           DECIMAL(12, 2),
    infrastructure_cost     DECIMAL(12, 2),
    development_charges     DECIMAL(12, 2),
    water_charges           DECIMAL(12, 2),
    mseb_charges            DECIMAL(12, 2),
    legal_charges           DECIMAL(12, 2),
    stamp_duty              DECIMAL(12, 2),
    registration_fee         DECIMAL(12, 2),
    gst                     DECIMAL(12, 2),
    vat                     DECIMAL(12, 2),
    one_time_maintenance    DECIMAL(12, 2),
    demand_score            INTEGER CHECK (demand_score >= 1 AND demand_score <= 10),  -- 1 (highest demand) → 10 (lowest)
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Project Addons Table
-- ============================================

CREATE TABLE project_addons (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    category                addon_category NOT NULL,
    price                   DECIMAL(12, 2) NOT NULL,
    image_url               TEXT,
    status                  addon_status NOT NULL DEFAULT 'active',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Projects
-- ============================================

CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_project_type ON projects(project_type);
CREATE INDEX idx_projects_area_type ON projects(area_type) WHERE area_type IS NOT NULL;
CREATE INDEX idx_projects_project_status ON projects(project_status) WHERE project_status IS NOT NULL;
CREATE INDEX idx_projects_project_state ON projects(project_state) WHERE project_state IS NOT NULL;
CREATE INDEX idx_projects_city ON projects(city) WHERE city IS NOT NULL;
CREATE INDEX idx_projects_state ON projects(state) WHERE state IS NOT NULL;
CREATE INDEX idx_projects_pincode ON projects(pincode) WHERE pincode IS NOT NULL;
CREATE INDEX idx_projects_minimum_unit_price ON projects(minimum_unit_price) WHERE minimum_unit_price IS NOT NULL;
CREATE INDEX idx_projects_maximum_unit_price ON projects(maximum_unit_price) WHERE maximum_unit_price IS NOT NULL;
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);

-- Composite indexes for common queries
CREATE INDEX idx_projects_org_type ON projects(organization_id, project_type);
CREATE INDEX idx_projects_org_status ON projects(organization_id, project_status) WHERE project_status IS NOT NULL;
CREATE INDEX idx_projects_city_state ON projects(city, state) WHERE city IS NOT NULL AND state IS NOT NULL;

-- ============================================
-- Indexes for Project Units
-- ============================================

CREATE INDEX idx_project_units_project_id ON project_units(project_id);
CREATE INDEX idx_project_units_unit_type ON project_units(unit_type);
CREATE INDEX idx_project_units_status ON project_units(status);
CREATE INDEX idx_project_units_unit_code ON project_units(unit_code) WHERE unit_code IS NOT NULL;
CREATE INDEX idx_project_units_name ON project_units(name);
CREATE INDEX idx_project_units_floor ON project_units(floor) WHERE floor IS NOT NULL;
CREATE INDEX idx_project_units_base_price ON project_units(base_price) WHERE base_price IS NOT NULL;
CREATE INDEX idx_project_units_demand_score ON project_units(demand_score) WHERE demand_score IS NOT NULL;
CREATE INDEX idx_project_units_created_at ON project_units(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_project_units_project_status ON project_units(project_id, status);
CREATE INDEX idx_project_units_project_type ON project_units(project_id, unit_type);

-- ============================================
-- Indexes for Project Addons
-- ============================================

CREATE INDEX idx_project_addons_project_id ON project_addons(project_id);
CREATE INDEX idx_project_addons_category ON project_addons(category);
CREATE INDEX idx_project_addons_status ON project_addons(status);
CREATE INDEX idx_project_addons_price ON project_addons(price);
CREATE INDEX idx_project_addons_created_at ON project_addons(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_project_addons_project_status ON project_addons(project_id, status);
CREATE INDEX idx_project_addons_project_category ON project_addons(project_id, category);

-- ============================================
-- Lead-Project link (leads table from 05-leads.sql)
-- ============================================
ALTER TABLE leads
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN leads.project_id IS 'Project the lead is interested in (optional)';

CREATE INDEX idx_leads_project_id ON leads(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_leads_org_project ON leads(organization_id, project_id) WHERE project_id IS NOT NULL;
