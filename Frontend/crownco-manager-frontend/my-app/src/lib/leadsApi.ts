import { apiFetch } from "./apiClient";

export interface LeadResponse {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  source?: string | null;
  source_detail?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  lead_temperature: string;
  status: string;
  stage?: string | null;
  assigned_to_user_id?: string | null;
  assigned_to_user_type?: string | null;
  assigned_at?: string | null;
  priority?: string | null;
  tags?: string[];
  notes?: string | null;
  imported_data_id?: string | null;
  project_id?: string | null;
  project_title?: string | null;
  presales_user_id?: string | null;
  sales_user_id?: string | null;
  sales_accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateLeadPayload {
  name?: string;
  phone?: string;
  email?: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  source?: string;
  source_detail?: string;
  budget_min?: number;
  budget_max?: number;
  lead_temperature?: string;
  status?: string;
  stage?: string;
  priority?: string;
  tags?: string[];
  notes?: string;
  project_id?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface LeadsListResponse {
  leads: LeadResponse[];
  pagination: PaginationInfo;
}

interface LeadsListApiResponse {
  success: boolean;
  message: string;
  data: LeadsListResponse;
}

export interface ListLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  stage?: string;
  lead_temperature?: string;
  source?: string;
  priority?: string;
  city?: string;
  state?: string;
  search?: string;
  created_after?: string;
  created_before?: string;
  assigned_to_user_id?: string;
  project_id?: string;
}

export interface ListAssignedLeadsParams extends ListLeadsParams {
  filter?: "assigned" | "pending" | "all";
}

interface LeadApiResponse {
  success: boolean;
  message: string;
  data: {
    lead: LeadResponse;
  };
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function listLeads(
  params: ListLeadsParams = {}
): Promise<LeadsListResponse> {
  const path = `/api/v1/leads${buildQuery(params)}`;
  const res = await apiFetch<LeadsListApiResponse>(path);
  return res.data;
}

export async function listAssignedLeads(
  params: ListAssignedLeadsParams = {}
): Promise<LeadsListResponse> {
  const path = `/api/v1/leads/assigned${buildQuery(params)}`;
  const res = await apiFetch<LeadsListApiResponse>(path);
  return res.data;
}

export async function getLeadById(id: string): Promise<LeadResponse> {
  const res = await apiFetch<LeadApiResponse>(`/api/v1/leads/${id}`);
  return res.data.lead;
}

export async function updateLead(
  id: string,
  payload: UpdateLeadPayload
): Promise<LeadResponse> {
  const res = await apiFetch<LeadApiResponse>(`/api/v1/leads/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data.lead;
}

