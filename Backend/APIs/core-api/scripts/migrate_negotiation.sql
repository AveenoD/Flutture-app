-- Migration: Negotiation stage (enum + columns). Idempotent; safe to run on existing DB.
-- Run: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/migrate_negotiation.sql

-- 1) Create enum if not exists
DO $$
BEGIN
  CREATE TYPE negotiation_status AS ENUM ('draft', 'submitted_for_approval', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 2) Add status to lead_negotiations (skip if column exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_negotiations' AND column_name = 'status'
  ) THEN
    ALTER TABLE lead_negotiations ADD COLUMN status negotiation_status NOT NULL DEFAULT 'draft';
  END IF;
END
$$;

-- 3) Add negotiation_id to lead_quotations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_quotations' AND column_name = 'negotiation_id'
  ) THEN
    ALTER TABLE lead_quotations ADD COLUMN negotiation_id UUID REFERENCES lead_negotiations(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_lead_negotiations_status ON lead_negotiations(status);
CREATE INDEX IF NOT EXISTS idx_lead_quotations_negotiation_id ON lead_quotations(negotiation_id) WHERE negotiation_id IS NOT NULL;
