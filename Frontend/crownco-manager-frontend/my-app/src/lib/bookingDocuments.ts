import { apiFetch } from "./apiClient";

export type BookingDocumentRow = {
  id: string;
  lead_booking_id: string;
  quotation_id?: string | null;
  document_name: string;
  document_type: string;
  document_number?: string | null;
  document_front_photo_url?: string | null;
  document_back_photo_url?: string | null;
  remarks?: string | null;
  uploaded_at: string;
};

type ApiEnvelope<T> = { data?: T; success?: boolean; message?: string };

export async function listBookingDocuments(
  leadId: string
): Promise<BookingDocumentRow[]> {
  const res = await apiFetch<ApiEnvelope<{ documents?: BookingDocumentRow[] }>>(
    `/api/v1/leads/${encodeURIComponent(leadId)}/booking/documents`
  );
  return res.data?.documents ?? [];
}
