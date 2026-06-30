/**
 * Base URL for core-api requests.
 * - In the browser, defaults to same-origin (`""`) so `/api/*` is handled by Next.js rewrites → core-api.
 * - If `NEXT_PUBLIC_CORE_API_BASE_URL` is set to this app’s origin (e.g. `http://localhost:3003`), it is ignored
 *   so we do not hit Next with `/api/...` and get "Cannot GET /api/..." — rewrites forward to Go instead.
 * - On the server (SSR), defaults to `http://127.0.0.1:3000` when unset.
 */
export function getCoreApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CORE_API_BASE_URL;
  if (raw && raw.trim() !== "") {
    const trimmed = raw.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      try {
        if (new URL(trimmed).origin === window.location.origin) {
          return "";
        }
      } catch {
        /* ignore invalid URL */
      }
    }
    return trimmed;
  }
  if (typeof window !== "undefined") {
    return "";
  }
  return "http://127.0.0.1:3000";
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiOptions extends RequestInit {
  auth?: boolean;
}

export async function apiFetch<TResponse = any>(
  path: string,
  options: ApiOptions = {}
): Promise<TResponse> {
  const { auth = true, headers, ...rest } = options;

  const finalHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers || {}),
  };

  if (auth && typeof window !== "undefined") {
    const token = localStorage.getItem("cc_access_token");
    if (token) {
      (finalHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = `${getCoreApiBaseUrl()}${path}`;

  if (typeof window !== "undefined") {
    // Lightweight client-side logging for debugging
    // eslint-disable-next-line no-console
    console.log("[API REQUEST]", {
      url,
      method: (rest.method || "GET") as HttpMethod,
      body: rest.body,
      headers: finalHeaders,
    });
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
  });

  const json = await response.json().catch(() => null);

  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[API RESPONSE]", {
      url,
      status: response.status,
      ok: response.ok,
      body: json,
    });
  }

  if (!response.ok) {
    const message =
      (json && (json.message || json.error || json.error_code)) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return json as TResponse;
}

export async function apiGet<TResponse = any>(
  path: string,
  options?: Omit<ApiOptions, "method" | "body">
): Promise<TResponse> {
  return apiFetch<TResponse>(path, { ...(options || {}), method: "GET" });
}

/**
 * GET that returns null on 404 instead of throwing. Use when the resource may not exist yet
 * (e.g. GET stages/by-type/qualification — qualification often has no lead_stages row).
 */
export async function apiGetAllow404<TResponse = any>(
  path: string,
  options?: Omit<ApiOptions, "method" | "body">
): Promise<TResponse | null> {
  const { auth = true, headers, ...rest } = options || {};
  const finalHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers || {}),
  };
  if (auth && typeof window !== "undefined") {
    const token = localStorage.getItem("cc_access_token");
    if (token) {
      (finalHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }
  const url = `${getCoreApiBaseUrl()}${path}`;
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[API REQUEST]", { url, method: "GET" as HttpMethod });
  }
  const response = await fetch(url, { method: "GET", headers: finalHeaders, ...rest });
  const json = await response.json().catch(() => null);
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[API RESPONSE]", { url, status: response.status, ok: response.ok });
  }
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const message =
      (json && (json.message || json.error || json.error_code)) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return json as TResponse;
}

export async function apiPost<TBody = any, TResponse = any>(
  path: string,
  body?: TBody,
  options?: Omit<ApiOptions, "method" | "body">
): Promise<TResponse> {
  return apiFetch<TResponse>(path, {
    ...(options || {}),
    method: "POST" as HttpMethod,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<TBody = any, TResponse = any>(
  path: string,
  body?: TBody,
  options?: Omit<ApiOptions, "method" | "body">
): Promise<TResponse> {
  return apiFetch<TResponse>(path, {
    ...(options || {}),
    method: "PUT" as HttpMethod,
    body: body ? JSON.stringify(body) : undefined,
  });
}


