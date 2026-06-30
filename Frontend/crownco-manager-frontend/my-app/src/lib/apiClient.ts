export interface ApiClientConfig {
  baseUrl?: string;
  /** Optional function to resolve auth token (e.g. from localStorage) */
  getToken?: () => string | null;
}

const defaultConfig: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_CORE_API_BASE_URL || "http://localhost:3000",
  getToken: () => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("authToken");
    } catch {
      return null;
    }
  },
};

export async function apiFetch<TResponse>(
  path: string,
  options: RequestInit = {},
  config: ApiClientConfig = defaultConfig
): Promise<TResponse> {
  const url = `${config.baseUrl}${path}`;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const token = config.getToken?.();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      } else if (body?.error) {
        message = body.error;
      }
      // Append field-level validation errors if present
      if (body?.errors && typeof body.errors === "object") {
        const details = Object.entries(body.errors)
          .map(([field, msg]) => `${field}: ${String(msg)}`)
          .join("; ");
        if (details) {
          message = `${message} - ${details}`;
        }
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    // @ts-expect-error - no content
    return null;
  }

  return (await response.json()) as TResponse;
}

