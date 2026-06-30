import { apiFetch } from "./apiClient";

export type UserRole = "presales" | "sales" | "manager";

export interface CreateUserPayload {
  user_type: UserRole;
  name: string;
  email: string;
  phone: string;
  password: string;
  gender: "male" | "female" | "other";
  dob: string; // YYYY-MM-DD
  employee_id: string;
  team_id: string;
  // Sales only
  project_assigned_ids?: string[];
  avatar_url?: string;
  permissions: string[];
  status: "active" | "inactive" | "suspended" | "on_leave";
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  employee_id?: string;
  team_id?: string;
  status: string;
  permissions: string[];
  created_at: string;
  last_login_at?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface UserListResponse {
  users: UserListItem[];
  pagination: PaginationInfo;
}

export interface ListUsersApiResponse {
  success: boolean;
  message: string;
  data: {
    users: UserListItem[];
    pagination: PaginationInfo;
  };
}

export interface CreateUserApiResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  dob?: string;
  employee_id?: string;
  team_id?: string | null;
  avatar_url?: string | null;
  status?: "active" | "inactive" | "suspended" | "on_leave";
}

export interface BlockUserPayload {
  status: "inactive" | "suspended" | "on_leave";
}

export interface UserDetail {
  id: string;
  organization_id: string;
  user_type: string;
  name: string;
  email: string;
  phone: string;
  gender?: string | null;
  dob?: string | null;
  employee_id?: string | null;
  team_id?: string | null;
  avatar_url?: string | null;
  permissions: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetUserApiResponse {
  success: boolean;
  message: string;
  data: UserDetail;
}

export async function listUsers(params?: {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  team_id?: string;
  search?: string;
}): Promise<UserListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.role) query.set("role", params.role);
  if (params?.status) query.set("status", params.status);
  if (params?.team_id) query.set("team_id", params.team_id);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  const path = `/api/v1/users${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<ListUsersApiResponse>(path);
  return res.data;
}

export async function createUser(
  payload: CreateUserPayload
): Promise<CreateUserApiResponse> {
  return apiFetch<CreateUserApiResponse>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getUserById(id: string): Promise<UserDetail> {
  const res = await apiFetch<GetUserApiResponse>(`/api/v1/users/${id}`);
  return res.data;
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload
): Promise<UserDetail> {
  const res = await apiFetch<GetUserApiResponse>(`/api/v1/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function blockUser(
  id: string,
  payload: BlockUserPayload
): Promise<void> {
  await apiFetch(`/api/v1/users/${id}/block`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

