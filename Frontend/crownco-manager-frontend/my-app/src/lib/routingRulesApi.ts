import { apiFetch } from "./apiClient";

export interface RoutingRuleApi {
  id: string;
  organization_id: string;
  manager_user_id?: string | null;
  rule_name: string;
  priority: number;
  affected_lead_sources: string[];
  affected_areas: string[];
  languages: string[];
  minimum_budget_range?: number | null;
  maximum_budget_range?: number | null;
  affected_lead_statuses: string[];
  affected_user_ids: string[];
  affected_team_ids: string[];
  max_pending_leads_per_user?: number | null;
  max_pending_followups_per_user?: number | null;
  rule_status: string;
  flow_type_order: string;
  target_role: string;
  created_at: string;
  updated_at: string;
}

export interface ListRoutingRulesApiResponse {
  success: boolean;
  message: string;
  data: RoutingRuleApi[];
}

export interface RoutingRulePayload {
  rule_name: string;
  priority: number;
  manager_user_id?: string;
  affected_lead_sources?: string[];
  affected_areas?: string[];
  languages?: string[];
  minimum_budget_range?: number;
  maximum_budget_range?: number;
  affected_lead_statuses?: string[];
  affected_user_ids?: string[];
  affected_team_ids?: string[];
  max_pending_leads_per_user?: number;
  max_pending_followups_per_user?: number;
  flow_type_order: string;
  target_role?: string;
}

export interface CreateRoutingRuleApiResponse {
  success: boolean;
  message: string;
  data: RoutingRuleApi;
}

export interface UpdateRoutingRuleStatusPayload {
  rule_status: "active" | "inactive";
}

export interface UpdateRoutingRuleStatusApiResponse {
  success: boolean;
  message: string;
  data: RoutingRuleApi;
}

export async function listRoutingRules(): Promise<RoutingRuleApi[]> {
  const res = await apiFetch<ListRoutingRulesApiResponse>("/api/v1/routing-rules");
  return res.data;
}

export async function createRoutingRule(
  payload: RoutingRulePayload
): Promise<RoutingRuleApi> {
  const res = await apiFetch<CreateRoutingRuleApiResponse>("/api/v1/routing-rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateRoutingRule(
  id: string,
  payload: Partial<RoutingRulePayload>
): Promise<RoutingRuleApi> {
  const res = await apiFetch<CreateRoutingRuleApiResponse>(`/api/v1/routing-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteRoutingRule(id: string): Promise<void> {
  await apiFetch<{
    success: boolean;
    message: string;
  }>(`/api/v1/routing-rules/${id}`, {
    method: "DELETE",
  });
}

export async function updateRoutingRuleStatus(
  id: string,
  payload: UpdateRoutingRuleStatusPayload
): Promise<RoutingRuleApi> {
  const res = await apiFetch<UpdateRoutingRuleStatusApiResponse>(
    `/api/v1/routing-rules/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}
