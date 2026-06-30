import { apiFetch } from "./apiClient";

type ApiOk<T> = { success?: boolean; data?: T };

/** GET /api/v1/projects/:id/stats — unit aggregates + role-scoped lead funnel for this project. */
export type ProjectStatsApi = {
  project_id: string;
  total_units?: number;
  available_units?: number;
  booked_units?: number;
  total_leads?: number;
  total_visits?: number;
  leads_in_negotiation?: number;
  total_lead_bookings?: number;
};

export async function fetchProjectStats(projectId: string): Promise<ProjectStatsApi> {
  const res = await apiFetch<ApiOk<ProjectStatsApi>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/stats`
  );
  const d = res.data;
  if (!d?.project_id) {
    throw new Error("Invalid statistics response.");
  }
  return d;
}

export function formatStatInt(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}
