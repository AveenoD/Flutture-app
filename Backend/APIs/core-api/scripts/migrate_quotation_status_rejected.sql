-- Ensure quotation_status enum includes 'rejected' (matches database/01-enums.sql).
-- Older DBs may have been created without this label → ERROR: invalid input value for enum quotation_status: "rejected"
-- Idempotent. Run:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate_quotation_status_rejected.sql
-- Or: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/migrate_quotation_status_rejected.sql

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e
       JOIN pg_type t ON e.enumtypid = t.oid
       WHERE t.typname = 'quotation_status' AND e.enumlabel = 'rejected'
     ) THEN
    -- Place before 'expired' when present so order matches repo enums file
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'quotation_status' AND e.enumlabel = 'expired'
    ) THEN
      ALTER TYPE quotation_status ADD VALUE 'rejected' BEFORE 'expired';
    ELSE
      ALTER TYPE quotation_status ADD VALUE 'rejected';
    END IF;
  END IF;
END
$$;
