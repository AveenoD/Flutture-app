import { apiFetch } from "./apiClient";
import type { QuotationData } from "../components/ui/card/quotationCard";
import {
  formatLocation,
  formatPriceBand,
  mapProjectStatus,
  mapProjectType,
} from "./projectInventoryProjects";

type ApiOk<T> = { success?: boolean; data?: T };

export type QuotationListItemApi = {
  quotation_id: string;
  lead_id: string;
  quotation_status: string;
  created_at: string;
  final_price: number;
  project_title: string;
  project_cover_photo_url?: string | null;
  project_type: string;
  project_status: string;
  city?: string | null;
  state?: string | null;
  amenities?: string[];
  minimum_unit_price?: number | null;
  maximum_unit_price?: number | null;
  unit_name: string;
  wing?: string | null;
  floor?: number | null;
  carpet_area?: number | null;
  unit_type: string;
  customer_name?: string | null;
  customer_contact?: string | null;
  customer_email?: string | null;
};

export type QuotationTabCountsApi = {
  all: number;
  approved: number;
  pending: number;
  draft: number;
};

export type PaginationApi = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type QuotationListResponse = {
  quotations: QuotationListItemApi[];
  pagination: PaginationApi;
  tab_counts: QuotationTabCountsApi;
};

const PLACEHOLDER_IMG = "/property-1 1.png";

function formatUnitTypeLabel(unitType: string): string {
  const x = (unitType ?? "").trim();
  if (!x) return "Unit";
  return x.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFloorLabel(floor: number | null | undefined): string {
  if (floor == null || Number.isNaN(floor)) return "—";
  const n = Math.floor(floor);
  const suf = (() => {
    const a = Math.abs(n) % 10;
    const b = Math.abs(n) % 100;
    if (b >= 11 && b <= 13) return "th";
    if (a === 1) return "st";
    if (a === 2) return "nd";
    if (a === 3) return "rd";
    return "th";
  })();
  return `${n}${suf} Floor`;
}

/** Map DB quotation_status to card tab status. */
export function mapQuotationStatusToUi(
  s: string
): "approved" | "pending" | "draft" {
  const x = (s ?? "").toLowerCase();
  if (x === "approved") return "approved";
  if (x === "draft") return "draft";
  return "pending";
}

export function mapListItemToQuotationData(row: QuotationListItemApi): QuotationData {
  const category = mapProjectType(row.project_type);
  const status = mapProjectStatus(row.project_status);
  const location = formatLocation(row.city, row.state);
  const priceRange = formatPriceBand(row.minimum_unit_price, row.maximum_unit_price);
  const features = (row.amenities ?? []).slice(0, 6);
  const carpet = row.carpet_area != null ? `${row.carpet_area} sq.ft.` : "—";
  const wing = row.wing?.trim() || "—";
  const configuration = `${formatUnitTypeLabel(row.unit_type)} — ${carpet}`;

  const hero = row.project_cover_photo_url?.trim() || PLACEHOLDER_IMG;

  return {
    id: row.quotation_id,
    leadId: row.lead_id,
    status: mapQuotationStatusToUi(row.quotation_status),
    project: {
      name: row.project_title?.trim() || "Project",
      image: hero,
      location: location || "—",
      configuration,
      priceRange: priceRange || "—",
      category,
      status,
      features,
    },
    allocatedFlat: {
      wing,
      flatNo: row.unit_name?.trim() || "—",
      floor: formatFloorLabel(row.floor),
      reraCarpetArea: carpet,
    },
    priceBreakdown: [],
    finalPrice: row.final_price,
    assignedRepresentative: {
      salesPerson: "—",
      contactNo: "—",
      email: "—",
      channelPartner: "—",
    },
    clientInfo: {
      customerName: row.customer_name?.trim() || "—",
      contactNo: row.customer_contact?.trim() || "—",
      email: row.customer_email?.trim() || "—",
    },
    createdAt: row.created_at,
  };
}

export async function fetchQuotationsList(params: {
  page: number;
  limit: number;
  tab: "all" | "approved" | "pending" | "draft";
  q?: string;
  project?: string;
  sort: "date" | "price" | "customer";
  order: "asc" | "desc";
}): Promise<QuotationListResponse> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  sp.set("tab", params.tab);
  sp.set("sort", params.sort);
  sp.set("order", params.order);
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.project?.trim()) sp.set("project", params.project.trim());

  const res = await apiFetch<ApiOk<QuotationListResponse>>(
    `/api/v1/quotations?${sp.toString()}`
  );
  const d = res.data;
  if (!d?.quotations || !d.pagination || !d.tab_counts) {
    throw new Error("Invalid quotations list response.");
  }
  return d;
}
