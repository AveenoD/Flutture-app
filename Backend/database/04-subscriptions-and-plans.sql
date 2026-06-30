-- ============================================
-- Plans and Subscriptions Tables
-- ============================================

-- ============================================
-- Plans Table
-- ============================================

CREATE TABLE plans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL UNIQUE,
    description             TEXT,
    lead_limit              INTEGER NOT NULL DEFAULT 0,  -- 0 = unlimited
    user_limit              INTEGER NOT NULL DEFAULT 0,  -- 0 = unlimited
    features                JSONB DEFAULT '{}',
    -- Example: {"call_recording": true, "ai_scoring": true, "api_access": false}
    monthly_price_per_user  DECIMAL(10, 2) NOT NULL,
    quarterly_price_per_user DECIMAL(10, 2),
    yearly_price_per_user   DECIMAL(10, 2),
    currency                VARCHAR(3) DEFAULT 'INR',
    is_active               BOOLEAN DEFAULT true,
    trial_days              INTEGER DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Subscriptions Table
-- ============================================

CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id                 UUID NOT NULL REFERENCES plans(id),
    status                  subscription_status NOT NULL DEFAULT 'active',
    start_date              DATE NOT NULL,
    end_date                DATE,
    renewal_date            DATE,
    auto_renew              BOOLEAN DEFAULT true,
    payment_method          VARCHAR(50),  -- 'credit_card', 'bank_transfer', 'upi', etc.
    billing_cycle           billing_cycle DEFAULT 'monthly',
    amount_paid             DECIMAL(10, 2),
    last_payment_at         TIMESTAMP WITH TIME ZONE,
    next_billing_at         TIMESTAMP WITH TIME ZONE,
    cancelled_at            TIMESTAMP WITH TIME ZONE,
    cancellation_reason     TEXT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Plans
-- ============================================

CREATE INDEX idx_plans_name ON plans(name);
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_plans_created_at ON plans(created_at);

-- ============================================
-- Indexes for Subscriptions
-- ============================================

CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX idx_subscriptions_renewal_date ON subscriptions(renewal_date) WHERE renewal_date IS NOT NULL;
CREATE INDEX idx_subscriptions_next_billing_at ON subscriptions(next_billing_at) WHERE next_billing_at IS NOT NULL;
CREATE INDEX idx_subscriptions_billing_cycle ON subscriptions(billing_cycle);
CREATE INDEX idx_subscriptions_auto_renew ON subscriptions(auto_renew) WHERE auto_renew = true;
