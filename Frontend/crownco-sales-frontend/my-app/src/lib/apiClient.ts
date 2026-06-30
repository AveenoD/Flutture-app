const API_BASE_URL =
  process.env.NEXT_PUBLIC_CORE_API_BASE_URL ?? "http://localhost:3000";

type ApiClientOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * When true (default), automatically attaches Authorization header
   * using JWT token from localStorage (key: authToken).
   */
  auth?: boolean;
};

type ApiError = {
  status: number;
  message: string;
  data?: unknown;
};

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export async function apiFetch<TResponse>(
  path: string,
  options: ApiClientOptions = {}
): Promise<TResponse> {
  const { method = "GET", body, headers, auth = true } = options;

  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers ?? {}),
  };

  if (auth) {
    const token = getAuthToken();
    if (token) {
      (requestHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // ignore JSON parse errors for empty responses
  }

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message:
        (data as any)?.message ||
        (data as any)?.error ||
        "Something went wrong while communicating with the server.",
      data,
    };
    throw error;
  }

  return data as TResponse;
}

// ============================
// Auth specific API helpers
// ============================

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  user_type: "general-manager" | "manager" | "presales" | "sales";
  permissions?: string[];
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

type BackendLoginSuccess = {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: AuthUser & {
      organization_id?: string;
      phone?: string;
      gender?: string;
      dob?: string;
      employee_id?: string;
      status?: string;
    };
    expires_in: number;
  };
};

export async function loginRequest(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiFetch<BackendLoginSuccess>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

  return {
    token: res.data.token,
    user: res.data.user,
  };
}

