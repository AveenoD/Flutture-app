import { apiFetch } from "./apiClient";

export interface ProjectResponse {
  id: string;
  organization_id: string;
  project_title: string;
  project_type: string;
  area_type?: string | null;
  rera_number?: string | null;
  project_status?: string | null;
  project_state?: string | null;
  start_date?: string | null;
  expected_possession_date?: string | null;
  project_floor_count?: number | null;
  full_address?: string | null;
  city?: string | null;
  pincode?: string | null;
  state?: string | null;
  country?: string | null;
  coordinates?: string | null;
  amenities: string[];
  minimum_unit_price?: number | null;
  maximum_unit_price?: number | null;
  project_area_size?: number | null;
  smallest_unit_size?: number | null;
  biggest_unit_size?: number | null;
  project_cover_photo_url?: string | null;
  project_exterior_images_urls: string[];
  project_interior_images_urls: string[];
  project_exterior_videos_urls: string[];
  project_drone_videos_urls: string[];
  project_interior_videos_urls: string[];
  units_count?: number;
  addons_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ListProjectsApiResponse {
  success: boolean;
  message: string;
  data: ProjectListResponse;
}

export interface GetProjectApiResponse {
  success: boolean;
  message: string;
  data: ProjectResponse;
}

export interface UnitResponse {
  id: string;
  project_id: string;
  name: string;
  floor?: number | null;
  wing?: string | null;
  unit_type: string;
  carpet_area?: number | null;
  builtup_area?: number | null;
  facing_direction?: string | null;
  status: string;
  unit_code?: string | null;
  base_price?: number | null;
  parking_price?: number | null;
  infrastructure_cost?: number | null;
  development_charges?: number | null;
  water_charges?: number | null;
  mseb_charges?: number | null;
  legal_charges?: number | null;
  stamp_duty?: number | null;
  registration_fee?: number | null;
  gst?: number | null;
  vat?: number | null;
  one_time_maintenance?: number | null;
  demand_score?: number | null;
  created_at: string;
  updated_at: string;
}

export interface UnitListResponse {
  units: UnitResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ListUnitsApiResponse {
  success: boolean;
  message: string;
  data: UnitListResponse;
}

export interface CreateUnitApiResponse {
  success: boolean;
  message: string;
  data: UnitResponse;
}

export interface AddonResponse {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  category: string;
  price: number;
  image_url?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AddonListResponse {
  addons: AddonResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ListAddonsApiResponse {
  success: boolean;
  message: string;
  data: AddonListResponse;
}

export interface CreateAddonPayload {
  title: string;
  description?: string;
  category: string;
  price: number;
  image_url?: string;
  status?: string;
}

export interface CreateAddonApiResponse {
  success: boolean;
  message: string;
  data: AddonResponse;
}

export interface ListProjectsParams {
  status?: string;
  type?: string;
  area_type?: string;
  city?: string;
  state?: string;
  country?: string;
  floor_count_min?: number;
  floor_count_max?: number;
  page?: number;
  limit?: number;
}

export async function listProjects(
  params: ListProjectsParams = {}
): Promise<ProjectListResponse> {
  const query = new URLSearchParams();

  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.area_type) query.set("area_type", params.area_type);
  if (params.city) query.set("city", params.city);
  if (params.state) query.set("state", params.state);
  if (params.country) query.set("country", params.country);
  if (params.floor_count_min !== undefined)
    query.set("floor_count_min", String(params.floor_count_min));
  if (params.floor_count_max !== undefined)
    query.set("floor_count_max", String(params.floor_count_max));
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  const path = `/api/v1/projects${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<ListProjectsApiResponse>(path);
  return res.data;
}

export async function getProjectById(
  id: string
): Promise<ProjectResponse> {
  const res = await apiFetch<GetProjectApiResponse>(
    `/api/v1/projects/${id}`
  );
  return res.data;
}

export interface ListUnitsParams {
  page?: number;
  limit?: number;
  status?: string;
  unit_type?: string;
}

export async function listUnits(
  projectId: string,
  params: ListUnitsParams = {}
): Promise<UnitListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.unit_type) query.set("unit_type", params.unit_type);

  const qs = query.toString();
  const path = `/api/v1/projects/${projectId}/units${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<ListUnitsApiResponse>(path);
  return res.data;
}

export interface CreateProjectPayload {
  project_title: string;
  project_type: string;
  area_type?: string;
  rera_number?: string;
  project_status?: string;
  project_state?: string;
  start_date?: string;
  expected_possession_date?: string;
  project_floor_count?: number;
  full_address?: string;
  city?: string;
  pincode?: string;
  state?: string;
  country?: string;
  coordinates?: string;
  amenities?: string[];
  minimum_unit_price?: number;
  maximum_unit_price?: number;
  project_area_size?: number;
  smallest_unit_size?: number;
  biggest_unit_size?: number;
  project_cover_photo_url?: string;
  project_exterior_images_urls?: string[];
  project_interior_images_urls?: string[];
  project_exterior_videos_urls?: string[];
  project_drone_videos_urls?: string[];
  project_interior_videos_urls?: string[];
}

export async function createProject(
  payload: CreateProjectPayload
): Promise<ProjectResponse> {
  const res = await apiFetch<GetProjectApiResponse>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export type CreateUnitPayload = Omit<
  import("./usersApi").PaginationInfo, // dummy to keep file a module; will be tree-shaken
  never
> &
  Partial<UnitResponse> & {
    name: string;
    unit_type: string;
    status?: string;
  };

export async function createUnit(
  projectId: string,
  payload: CreateUnitPayload
): Promise<UnitResponse> {
  const res = await apiFetch<CreateUnitApiResponse>(
    `/api/v1/projects/${projectId}/units`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}

export interface ListAddonsParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  price_min?: number;
  price_max?: number;
}

export async function listAddons(
  projectId: string,
  params: ListAddonsParams = {}
): Promise<AddonListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.category) query.set("category", params.category);
  if (params.status) query.set("status", params.status);
  if (params.price_min !== undefined)
    query.set("price_min", String(params.price_min));
  if (params.price_max !== undefined)
    query.set("price_max", String(params.price_max));

  const qs = query.toString();
  const path = `/api/v1/projects/${projectId}/addons${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<ListAddonsApiResponse>(path);
  return res.data;
}

export async function createAddon(
  projectId: string,
  payload: CreateAddonPayload
): Promise<AddonResponse> {
  const res = await apiFetch<CreateAddonApiResponse>(
    `/api/v1/projects/${projectId}/addons`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}

