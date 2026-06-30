import { apiFetch } from "./apiClient";

type ApiEnvelope<T> = { success?: boolean; data?: T };

export type QuotationStatsApi = {
  total_quotations: number;
  total_quotations_growth_pct: number;
  total_value_inr: number;
  total_value_growth_pct: number;
  this_month_count: number;
  this_month_growth_pct: number;
  approved_count: number;
  approved_growth_pct: number;
  pending_count: number;
  pending_growth_pct: number;
};

/** GET /api/v1/quotations/stats — sales / manager / GM. */
export async function fetchQuotationStats(): Promise<QuotationStatsApi> {
  const res = await apiFetch<ApiEnvelope<{ stats: QuotationStatsApi }>>(
    "/api/v1/quotations/stats"
  );
  const s = res.data?.stats;
  if (!s || typeof s.total_quotations !== "number") {
    throw new Error("Invalid quotation stats response.");
  }
  return s;
}

/** Format INR total as ₹X.XCr (1 Cr = 1e7 INR). */
export function formatINRValueCrores(inr: number): string {
  if (!Number.isFinite(inr) || inr <= 0) return "₹0Cr";
  const cr = inr / 1e7;
  if (cr >= 100) return `₹${cr.toFixed(1)}Cr`;
  return `₹${cr.toFixed(1)}Cr`;
}

/** One decimal, signed % for KPI trend. */
export function formatGrowthPercent(pct: number): string {
  if (!Number.isFinite(pct)) return "+0%";
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded >= 0 ? "+" : "";
  return `${sign}${rounded}%`;
}
