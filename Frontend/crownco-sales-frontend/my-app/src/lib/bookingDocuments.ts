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

function fileExtensionForApi(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  if (name.endsWith(".webp")) return "webp";
  return "jpg";
}

export async function listBookingDocuments(
  leadId: string
): Promise<BookingDocumentRow[]> {
  const res = (await apiFetch(
    `/api/v1/leads/${encodeURIComponent(leadId)}/booking/documents`
  )) as ApiEnvelope<{ documents?: BookingDocumentRow[] }>;
  const docs = res.data?.documents;
  return Array.isArray(docs) ? docs : [];
}

export async function deleteBookingDocument(
  leadId: string,
  documentId: string
): Promise<void> {
  await apiFetch(
    `/api/v1/leads/${encodeURIComponent(leadId)}/booking/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" }
  );
}

/**
 * Presigned PUT to B2, then POST metadata with object key (same pattern as backend booking handler).
 */
export async function uploadBookingDocumentToB2(params: {
  leadId: string;
  file: File;
  documentType: string;
  documentName?: string;
  remarks?: string;
  quotationId?: string | null;
}): Promise<BookingDocumentRow> {
  const { leadId, file, documentType, remarks, quotationId } = params;
  const ext = fileExtensionForApi(file);

  const urlRes = await apiFetch<
    ApiEnvelope<{ upload_url?: string; object_key?: string }>
  >(`/api/v1/leads/${encodeURIComponent(leadId)}/booking/documents/upload-url`, {
    method: "POST",
    body: { file_extension: ext },
  });

  const uploadUrl = urlRes.data?.upload_url;
  const objectKey = urlRes.data?.object_key;
  if (!uploadUrl || !objectKey) {
    throw new Error("Could not get upload URL. Is B2 configured on the API?");
  }

  // Cross-origin PUT to B2/S3. If the bucket CORS rules don't allow this origin,
  // the browser throws TypeError: Failed to fetch (nothing appears in core-api logs).
  let put: Response;
  try {
    put = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
  } catch (err) {
    const hint =
      "Upload URL was created on the server, but the browser could not PUT the file to storage. " +
      "Configure CORS on the B2/S3 bucket to allow PUT from your app origin (e.g. http://localhost:3005), " +
      "or use a server-side upload proxy.";
    const base =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Network error";
    if (
      base.includes("Failed to fetch") ||
      base.includes("NetworkError") ||
      base.includes("Load failed")
    ) {
      throw new Error(hint);
    }
    throw new Error(`${hint} (${base})`);
  }
  if (!put.ok) {
    throw new Error(
      `File upload to storage failed (HTTP ${put.status}). Check bucket CORS and permissions.`
    );
  }

  const body: Record<string, unknown> = {
    document_name: params.documentName?.trim() || file.name,
    document_type: documentType,
    document_front_photo_url: objectKey,
  };
  if (remarks?.trim()) body.remarks = remarks.trim();
  if (quotationId) body.quotation_id = quotationId;

  const addRes = await apiFetch<ApiEnvelope<{ document?: BookingDocumentRow }>>(
    `/api/v1/leads/${encodeURIComponent(leadId)}/booking/documents`,
    { method: "POST", body }
  );
  const doc = addRes.data?.document;
  if (!doc) {
    throw new Error("Document metadata was not saved.");
  }
  return doc;
}
