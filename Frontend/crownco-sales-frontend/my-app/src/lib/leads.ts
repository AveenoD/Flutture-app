import { apiFetch } from "./apiClient";

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type LeadResponse = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  lead_temperature?: "veryhot" | "hot" | "warm" | "cold" | null;
  status:
    | "unqualified"
    | "called"
    | "qualified"
    | "visit"
    | "negotiation"
    | "deal"
    | "dropped"
    | "rejected";
  stage?: "qualification" | "communication" | "site_visit" | "negotiation" | "booking" | null;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  budget_min?: number | null;
  budget_max?: number | null;
  source?: string | null;
  project_id?: string | null;
  project_title?: string | null;
  created_at?: string;
};

type ListLeadsBackend = {
  success: boolean;
  message: string;
  data: {
    leads: LeadResponse[];
    pagination: PaginationInfo;
  };
};

type ListRejectedLeadsBackend = {
  success: boolean;
  message: string;
  data: {
    rejected_leads: {
      lead: LeadResponse;
    }[];
    pagination: PaginationInfo;
  };
};

export type LeadSummary = {
  lead: LeadResponse;
  presales_user: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  recent_calls: unknown[];
  whatsapp_conversations: unknown[];
  stage_remarks: {
    stage_id: string;
    stage_type: string;
    remarks: string;
    created_at: string;
  }[];
  interested_property: {
    project_id: string;
    project_title: string;
  } | null;
};

export type LeadStats = {
  total_calls_made: number;
  message_sent: number;
  site_visit_done: number;
  calling_hour: string;
  calling_hour_seconds?: number;
};

type LeadSummaryBackend = {
  success: boolean;
  message: string;
  data: LeadSummary;
};

type LeadStatsBackend = {
  success: boolean;
  message: string;
  data: LeadStats;
};

type AcceptLeadBackend = {
  success: boolean;
  message: string;
  data?: {
    lead?: LeadResponse;
  };
};

export async function listLeads(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  lead_temperature?: string;
}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.lead_temperature) query.set("lead_temperature", params.lead_temperature);

  const res = await apiFetch<ListLeadsBackend>(`/api/v1/leads?${query.toString()}`);
  return res.data;
}

export async function listAssignedLeads(params: {
  filter?: "assigned" | "pending" | "all";
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  lead_temperature?: string;
}) {
  const query = new URLSearchParams();
  if (params.filter) query.set("filter", params.filter);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.lead_temperature) query.set("lead_temperature", params.lead_temperature);

  const res = await apiFetch<ListLeadsBackend>(
    `/api/v1/leads/assigned?${query.toString()}`
  );
  return res.data;
}

export async function listRejectedLeads(params: {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.city) query.set("city", params.city);

  const res = await apiFetch<ListRejectedLeadsBackend>(
    `/api/v1/leads/rejected?${query.toString()}`
  );

  return {
    rejected_leads: res.data.rejected_leads.map((item) => item.lead),
    pagination: res.data.pagination,
  };
}

export async function getLeadSummary(id: string) {
  const res = await apiFetch<LeadSummaryBackend>(`/api/v1/leads/${id}/summary`);
  return res.data;
}

export async function getLeadStatsForLead(id: string) {
  const res = await apiFetch<LeadStatsBackend>(`/api/v1/leads/${id}/stats`);
  return res.data;
}

export async function acceptLead(id: string) {
  const res = await apiFetch<AcceptLeadBackend>(`/api/v1/leads/${id}/accept`, {
    method: "POST",
  });
  return res.data;
}
