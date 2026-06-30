-- Migration: Booking stage - EMI and Extra Charges columns on lead_bookings. Idempotent.
-- Run: docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < scripts/migrate_booking.sql

-- EMI fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'loan_amount') THEN
    ALTER TABLE lead_bookings ADD COLUMN loan_amount DECIMAL(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'interest_rate') THEN
    ALTER TABLE lead_bookings ADD COLUMN interest_rate DECIMAL(5, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'tenure_months') THEN
    ALTER TABLE lead_bookings ADD COLUMN tenure_months INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'down_payment') THEN
    ALTER TABLE lead_bookings ADD COLUMN down_payment DECIMAL(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'monthly_emi') THEN
    ALTER TABLE lead_bookings ADD COLUMN monthly_emi DECIMAL(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'bank_name') THEN
    ALTER TABLE lead_bookings ADD COLUMN bank_name VARCHAR(255);
  END IF;
END
$$;

-- Extra Charges fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'maintenance_charges') THEN
    ALTER TABLE lead_bookings ADD COLUMN maintenance_charges DECIMAL(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'legal_charges') THEN
    ALTER TABLE lead_bookings ADD COLUMN legal_charges DECIMAL(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'stamp_duty') THEN
    ALTER TABLE lead_bookings ADD COLUMN stamp_duty DECIMAL(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_bookings' AND column_name = 'parking_charges') THEN
    ALTER TABLE lead_bookings ADD COLUMN parking_charges DECIMAL(12, 2);
  END IF;
END
$$;
