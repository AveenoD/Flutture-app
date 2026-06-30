-- Optional manager note when a quotation is rejected (shown to sales).
-- Idempotent. Run against crownco-db.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_quotations'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_quotations' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE lead_quotations ADD COLUMN rejection_reason TEXT;
  END IF;
END
$$;
