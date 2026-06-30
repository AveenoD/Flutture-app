-- ============================================
-- Organizations Table
-- ============================================

CREATE TABLE organizations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    phone                   VARCHAR(20),
    address                 TEXT,
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    country                 VARCHAR(100) DEFAULT 'India',
    pincode                 VARCHAR(10),
    type                    organization_type NOT NULL,
    company_size            company_size,
    status                  organization_status NOT NULL DEFAULT 'active',
    logo_url                TEXT,
    website                 VARCHAR(255),
    tax_id                  VARCHAR(100),
    gstin                   TEXT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);

-- Create index on email for faster lookups
CREATE INDEX idx_organizations_email ON organizations(email);

-- Create index on name for name-based searches
CREATE INDEX idx_organizations_name ON organizations(name);

-- Create index on status for filtering
CREATE INDEX idx_organizations_status ON organizations(status);

-- Create index on type for filtering
CREATE INDEX idx_organizations_type ON organizations(type);

-- Create index on deleted_at for soft delete queries
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Create index on city for location-based filtering
CREATE INDEX idx_organizations_city ON organizations(city);

-- Create index on state for location-based filtering
CREATE INDEX idx_organizations_state ON organizations(state);

-- Create index on created_at for sorting and date range queries
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Create index on phone for phone number lookups
CREATE INDEX idx_organizations_phone ON organizations(phone) WHERE phone IS NOT NULL;

-- Composite index on status and type for common filtering combinations
CREATE INDEX idx_organizations_status_type ON organizations(status, type);
