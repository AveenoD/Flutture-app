import { apiFetch } from "./apiClient";

export interface ImportedLeadInfo {
  lead_id: string;
  name: string;
  phone: string;
}

export interface ImportDataResponse {
  imported_data_id: string;
  title: string;
  total_rows: number;
  successful: number;
  failed: number;
  errors?: string[];
  leads_created?: ImportedLeadInfo[];
}

export interface AssignUsersResponse {
  imported_data_id: string;
  assigned_users_count: number;
  leads_assigned: number;
  assignment_summary: Record<string, number>;
}

interface ImportDataApiResponse {
  success: boolean;
  message: string;
  data: ImportDataResponse;
}

export async function importLeadsFromCsv(payload: {
  title: string;
  description?: string;
  file: File;
}): Promise<ImportDataResponse> {
  const formData = new FormData();
  formData.append("title", payload.title);
  if (payload.description) {
    formData.append("description", payload.description);
  }
  formData.append("file", payload.file);

  const res = await apiFetch<ImportDataApiResponse>("/api/v1/imported-data/import", {
    method: "POST",
    body: formData,
  });

  return res.data;
}

interface AssignUsersApiResponse {
  success: boolean;
  message: string;
  data: AssignUsersResponse;
}

export async function assignUsersToImportedData(importedDataId: string, userIds: string[]): Promise<AssignUsersResponse> {
  const res = await apiFetch<AssignUsersApiResponse>(`/api/v1/imported-data/${importedDataId}/assign-users`, {
    method: "POST",
    body: JSON.stringify({ user_ids: userIds }),
  });
  return res.data;
}
