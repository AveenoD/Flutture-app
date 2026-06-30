-- Optional link from a booking document to the quotation version sales had in mind when uploading.
ALTER TABLE lead_booking_documents
  ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES lead_quotations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_booking_documents_quotation_id
  ON lead_booking_documents(quotation_id)
  WHERE quotation_id IS NOT NULL;
