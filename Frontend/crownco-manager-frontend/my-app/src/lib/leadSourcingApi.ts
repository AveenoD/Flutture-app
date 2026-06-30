import { apiFetch } from "./apiClient";

export type ProviderType =
  | "meta"
  | "google"
  | "99acres"
  | "housing"
  | "nobroker"
  | "magicbricks"
  | "whatsapp"
  | "ivr";

export type ApiCategory = "lead_sourcing" | "communication";
export type AuthType = "api_key" | "oauth" | "basic_auth";
export type ProviderStatus = "active" | "disabled" | "error";
export type SyncMode = "realtime" | "scheduled";
export type LeadSourceTag =
  | "99acres"
  | "meta_ads"
  | "housing"
  | "nobroker"
  | "magicbricks"
  | "google_ads";
export type SyncLogStatus = "running" | "success" | "error";

export interface OrgApi {
  id: string;
  organization_id: string;
  provider: ProviderType | string;
  api_category: ApiCategory | string;
  auth_type: AuthType | string;
  has_api_key: boolean;
  username?: string;
  has_password: boolean;
  base_endpoint?: string;
  status: ProviderStatus;
  created_at: string;
  updated_at: string;
}

export interface MappingConfig {
  response_leads_path?: string;
  field_map?: Record<string, string>;
  provider_config?: Record<string, string>;
}

export interface LeadSourcingConfig {
  id: string;
  org_api_id: string;
  provider: ProviderType | string;
  sync_mode: SyncMode;
  sync_interval_min?: number;
  lead_source_tag: LeadSourceTag | string;
  mapping_config: MappingConfig;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalProjectMapping {
  id: string;
  organization_id: string;
  provider: ProviderType | string;
  external_project_id: string;
  external_project_name?: string;
  internal_project_id?: string | null;
  internal_project_name?: string | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  lead_sourcing_config_id: string;
  started_at: string;
  completed_at?: string | null;
  status: SyncLogStatus;
  leads_fetched: number;
  leads_created: number;
  leads_skipped: number;
  error_message?: string | null;
}

export interface CreateOrganizationApiPayload {
  provider: ProviderType;
  api_category: ApiCategory;
  auth_type: AuthType;
  api_key?: string;
  username?: string;
  password?: string;
  base_endpoint?: string;
}

export interface UpdateOrganizationApiPayload {
  api_key?: string;
  username?: string;
  password?: string;
  base_endpoint?: string;
  status?: ProviderStatus;
}

export interface CreateLeadSourcingConfigPayload {
  org_api_id: string;
  sync_mode: SyncMode;
  sync_interval_min?: number;
  lead_source_tag: LeadSourceTag;
  mapping_config: MappingConfig;
}

export interface UpdateLeadSourcingConfigPayload {
  sync_mode?: SyncMode;
  sync_interval_min?: number;
  mapping_config?: MappingConfig;
}

export interface CreateExternalProjectMappingPayload {
  provider: ProviderType;
  external_project_id: string;
  external_project_name?: string;
  internal_project_id?: string | null;
}

export interface UpdateExternalProjectMappingPayload {
  external_project_name?: string;
  internal_project_id?: string | null;
}

export interface SyncNowResult {
  leads_fetched: number;
  leads_created: number;
  leads_skipped: number;
  error_message?: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

function unwrap<T>(response: T | ApiEnvelope<T>): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as ApiEnvelope<T>).data !== undefined
  ) {
    return (response as ApiEnvelope<T>).data as T;
  }
  return response as T;
}

export async function listOrganizationApis(): Promise<OrgApi[]> {
  const res = await apiFetch<ApiEnvelope<OrgApi[]>>("/api/v1/organization-apis");
  return unwrap<OrgApi[]>(res) || [];
}

export async function createOrganizationApi(
  payload: CreateOrganizationApiPayload
): Promise<OrgApi> {
  const res = await apiFetch<OrgApi | ApiEnvelope<OrgApi>>(
    "/api/v1/organization-apis",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return unwrap<OrgApi>(res);
}

export async function getOrganizationApiById(id: string): Promise<OrgApi> {
  const res = await apiFetch<OrgApi | ApiEnvelope<OrgApi>>(
    `/api/v1/organization-apis/${id}`
  );
  return unwrap<OrgApi>(res);
}

export async function updateOrganizationApi(
  id: string,
  payload: UpdateOrganizationApiPayload
): Promise<OrgApi> {
  const res = await apiFetch<OrgApi | ApiEnvelope<OrgApi>>(
    `/api/v1/organization-apis/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  return unwrap<OrgApi>(res);
}

export async function deleteOrganizationApi(id: string): Promise<void> {
  await apiFetch<null>(`/api/v1/organization-apis/${id}`, {
    method: "DELETE",
  });
}

export async function listLeadSourcingConfigs(): Promise<LeadSourcingConfig[]> {
  const res = await apiFetch<ApiEnvelope<LeadSourcingConfig[]>>(
    "/api/v1/lead-sourcing-configs"
  );
  return unwrap<LeadSourcingConfig[]>(res) || [];
}

export async function createLeadSourcingConfig(
  payload: CreateLeadSourcingConfigPayload
): Promise<LeadSourcingConfig> {
  const res = await apiFetch<
    LeadSourcingConfig | ApiEnvelope<LeadSourcingConfig>
  >("/api/v1/lead-sourcing-configs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return unwrap<LeadSourcingConfig>(res);
}

export async function getLeadSourcingConfigById(
  id: string
): Promise<LeadSourcingConfig> {
  const res = await apiFetch<
    LeadSourcingConfig | ApiEnvelope<LeadSourcingConfig>
  >(`/api/v1/lead-sourcing-configs/${id}`);
  return unwrap<LeadSourcingConfig>(res);
}

export async function updateLeadSourcingConfig(
  id: string,
  payload: UpdateLeadSourcingConfigPayload
): Promise<LeadSourcingConfig> {
  const res = await apiFetch<
    LeadSourcingConfig | ApiEnvelope<LeadSourcingConfig>
  >(`/api/v1/lead-sourcing-configs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return unwrap<LeadSourcingConfig>(res);
}

export async function deleteLeadSourcingConfig(id: string): Promise<void> {
  await apiFetch<null>(`/api/v1/lead-sourcing-configs/${id}`, {
    method: "DELETE",
  });
}

export async function syncLeadSourcingConfigNow(
  id: string
): Promise<SyncNowResult> {
  const res = await apiFetch<ApiEnvelope<SyncNowResult>>(
    `/api/v1/lead-sourcing-configs/${id}/sync-now`,
    { method: "POST" }
  );
  return unwrap<SyncNowResult>(res);
}

export async function listExternalProjectMappings(
  provider?: ProviderType | string
): Promise<ExternalProjectMapping[]> {
  const query = new URLSearchParams();
  if (provider) query.set("provider", provider);
  const qs = query.toString();
  const path = `/api/v1/external-project-mappings${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<ApiEnvelope<ExternalProjectMapping[]>>(path);
  return unwrap<ExternalProjectMapping[]>(res) || [];
}

export async function createExternalProjectMapping(
  payload: CreateExternalProjectMappingPayload
): Promise<ExternalProjectMapping> {
  const res = await apiFetch<
    ExternalProjectMapping | ApiEnvelope<ExternalProjectMapping>
  >("/api/v1/external-project-mappings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return unwrap<ExternalProjectMapping>(res);
}

export async function updateExternalProjectMapping(
  id: string,
  payload: UpdateExternalProjectMappingPayload
): Promise<ExternalProjectMapping> {
  const res = await apiFetch<
    ExternalProjectMapping | ApiEnvelope<ExternalProjectMapping>
  >(`/api/v1/external-project-mappings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return unwrap<ExternalProjectMapping>(res);
}

export async function deleteExternalProjectMapping(id: string): Promise<void> {
  await apiFetch<null>(`/api/v1/external-project-mappings/${id}`, {
    method: "DELETE",
  });
}

export async function listLeadSyncLogs(configId?: string): Promise<SyncLog[]> {
  const query = new URLSearchParams();
  if (configId) query.set("config_id", configId);
  const qs = query.toString();
  const path = `/api/v1/lead-sync-logs${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<ApiEnvelope<SyncLog[]>>(path);
  return unwrap<SyncLog[]>(res) || [];
}
