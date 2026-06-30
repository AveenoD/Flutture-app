-- ============================================
-- Users and Teams Tables
-- ============================================

-- ============================================
-- Teams Table (created first due to FK dependencies)
-- ============================================

CREATE TABLE teams (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    manager_user_id         UUID, -- FK added later after users_managers is created
    team_title              VARCHAR(255) NOT NULL,
    team_description        TEXT,
    team_type               team_type NOT NULL,
    project_assigned_ids    UUID[] DEFAULT ARRAY[]::UUID[],
    labels                  team_label[] DEFAULT ARRAY[]::team_label[],
    team_rating_score       INTEGER CHECK (team_rating_score >= 1 AND team_rating_score <= 10),
    team_logo_url           TEXT,
    team_status             team_status NOT NULL DEFAULT 'active',
    working_region          TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Users Presales Table
-- ============================================

CREATE TABLE users_presales (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    phone                   VARCHAR(20) NOT NULL,
    gender                  gender,
    dob                     DATE,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    avatar_url              TEXT,
    employee_id             VARCHAR(50) UNIQUE,
    team_id                 UUID REFERENCES teams(id) ON DELETE SET NULL,
    permissions             user_permission[] DEFAULT ARRAY[]::user_permission[],
    status                  user_status NOT NULL DEFAULT 'active',
    last_login_at           TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);

-- ============================================
-- Users Sales Table
-- ============================================

CREATE TABLE users_sales (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    phone                   VARCHAR(20) NOT NULL,
    gender                  gender,
    dob                     DATE,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    avatar_url              TEXT,
    employee_id             VARCHAR(50) UNIQUE,
    team_id                 UUID REFERENCES teams(id) ON DELETE SET NULL,
    permissions             user_permission[] DEFAULT ARRAY[]::user_permission[],
    status                  user_status NOT NULL DEFAULT 'active',
    project_assigned_ids    UUID[] DEFAULT ARRAY[]::UUID[],  -- projects this sales person is allotted to (for lead routing)
    last_login_at           TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);

-- ============================================
-- Users Managers Table
-- ============================================

CREATE TABLE users_managers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    phone                   VARCHAR(20) NOT NULL,
    gender                  gender,
    dob                     DATE,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    avatar_url              TEXT,
    employee_id             VARCHAR(50) UNIQUE,
    team_id                 UUID REFERENCES teams(id) ON DELETE SET NULL,
    permissions             user_permission[] DEFAULT ARRAY[]::user_permission[],
    status                  user_status NOT NULL DEFAULT 'active',
    last_login_at           TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);

-- ============================================
-- Users General Managers Table
-- ============================================

CREATE TABLE users_general_managers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    phone                   VARCHAR(20) NOT NULL,
    gender                  gender,
    dob                     DATE,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    avatar_url              TEXT,
    employee_id             VARCHAR(50) UNIQUE,
    team_id                 UUID REFERENCES teams(id) ON DELETE SET NULL,
    permissions             user_permission[] DEFAULT ARRAY[]::user_permission[],
    status                  user_status NOT NULL DEFAULT 'active',
    last_login_at           TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);

-- ============================================
-- Add Foreign Key Constraint for Teams.manager_user_id
-- ============================================

ALTER TABLE teams 
ADD CONSTRAINT fk_teams_manager_user_id 
FOREIGN KEY (manager_user_id) 
REFERENCES users_managers(id) 
ON DELETE SET NULL;

-- ============================================
-- Indexes for Users Presales
-- ============================================

CREATE INDEX idx_users_presales_organization_id ON users_presales(organization_id);
CREATE INDEX idx_users_presales_email ON users_presales(email);
CREATE INDEX idx_users_presales_phone ON users_presales(phone);
CREATE INDEX idx_users_presales_employee_id ON users_presales(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_users_presales_team_id ON users_presales(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_users_presales_status ON users_presales(status);
CREATE INDEX idx_users_presales_deleted_at ON users_presales(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- Indexes for Users Sales
-- ============================================

CREATE INDEX idx_users_sales_organization_id ON users_sales(organization_id);
CREATE INDEX idx_users_sales_email ON users_sales(email);
CREATE INDEX idx_users_sales_phone ON users_sales(phone);
CREATE INDEX idx_users_sales_employee_id ON users_sales(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_users_sales_team_id ON users_sales(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_users_sales_status ON users_sales(status);
CREATE INDEX idx_users_sales_deleted_at ON users_sales(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- Indexes for Users Managers
-- ============================================

CREATE INDEX idx_users_managers_organization_id ON users_managers(organization_id);
CREATE INDEX idx_users_managers_email ON users_managers(email);
CREATE INDEX idx_users_managers_phone ON users_managers(phone);
CREATE INDEX idx_users_managers_employee_id ON users_managers(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_users_managers_team_id ON users_managers(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_users_managers_status ON users_managers(status);
CREATE INDEX idx_users_managers_deleted_at ON users_managers(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- Indexes for Users General Managers
-- ============================================

CREATE INDEX idx_users_general_managers_organization_id ON users_general_managers(organization_id);
CREATE INDEX idx_users_general_managers_email ON users_general_managers(email);
CREATE INDEX idx_users_general_managers_phone ON users_general_managers(phone);
CREATE INDEX idx_users_general_managers_employee_id ON users_general_managers(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_users_general_managers_team_id ON users_general_managers(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_users_general_managers_status ON users_general_managers(status);
CREATE INDEX idx_users_general_managers_deleted_at ON users_general_managers(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- Indexes for Teams
-- ============================================

CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_teams_manager_user_id ON teams(manager_user_id) WHERE manager_user_id IS NOT NULL;
CREATE INDEX idx_teams_team_type ON teams(team_type);
CREATE INDEX idx_teams_team_status ON teams(team_status);
CREATE INDEX idx_teams_created_at ON teams(created_at);

-- For existing databases: add project_assigned_ids to users_sales if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users_sales' AND column_name = 'project_assigned_ids') THEN
    ALTER TABLE users_sales ADD COLUMN project_assigned_ids UUID[] DEFAULT ARRAY[]::UUID[];
  END IF;
END $$;
