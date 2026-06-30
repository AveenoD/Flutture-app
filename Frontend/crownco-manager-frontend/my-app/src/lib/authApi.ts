import { apiFetch } from "./apiClient";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginUserInfo {
  id: string;
  organization_id: string;
  user_type: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob?: string;
  employee_id?: string;
  avatar_url?: string;
  status: string;
  permissions?: string[];
}

export interface LoginResponseData {
  token: string;
  user: LoginUserInfo;
  expires_in: number;
}

export interface LoginApiResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
}

export async function login(payload: LoginPayload): Promise<LoginResponseData> {
  const res = await apiFetch<LoginApiResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

