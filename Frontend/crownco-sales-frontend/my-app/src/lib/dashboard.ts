import { apiFetch } from "./apiClient";

export type DashboardStats = {
  total_leads: number;
  active_leads: number;
  deals_closed: number;
  conversion_rate: number;
  total_calls: number;
  total_visits: number;
  pending_followups: number;
  upcoming_visits: number;
};

type DashboardBackendResponse = {
  success: boolean;
  message: string;
  data: {
    stats: DashboardStats;
  };
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch<DashboardBackendResponse>("/api/v1/dashboard", {
    method: "GET",
  });

  return res.data.stats;
}

