import { apiFetch } from "./apiClient";
import type { ProjectCardProps } from "../components/ui/card/projectCard";

/** One row from GET /api/v1/projects (list view; snake_case). */
export type ProjectListApiRow = {
  id: string;
  project_title?: string;
  project_type?: string;
  project_status?: string | null;
  city?: string | null;
  state?: string | null;
  minimum_unit_price?: number | null;
  maximum_unit_price?: number | null;
  project_floor_count?: number | null;
};

type ProjectListData = {
  projects?: ProjectListApiRow[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

type ApiOk<T> = {
  success?: boolean;
  data?: T;
};

const PLACEHOLDER_IMAGES = [
  "/property-1 1.png",
  "/property-2 1.png",
  "/Property-3 1.png",
] as const;

export type ProjectInventoryRow = Pick<
  ProjectCardProps,
  | "image"
  | "name"
  | "location"
  | "configuration"
  | "priceRange"
  | "category"
  | "status"
  | "features"
> & { id: string };

export function mapProjectType(t: string | undefined): NonNullable<ProjectCardProps["category"]> {
  const x = (t ?? "").toLowerCase();
  if (x === "commercial") return "Commercial";
  if (x === "mixed") return "Mixed";
  return "Residential";
}

export function mapProjectStatus(s: string | undefined | null): NonNullable<ProjectCardProps["status"]> {
  const x = (s ?? "").trim();
  if (x === "ready_to_move") return "Ready Move";
  if (x === "planning_stage") return "Upcoming";
  return "Ongoing";
}

export function formatLocation(city?: string | null, state?: string | null): string {
  const parts = [city?.trim(), state?.trim()].filter(Boolean) as string[];
  return parts.length ? parts.join(" - ") : "";
}

function formatConfiguration(floors?: number | null): string {
  if (floors != null && floors > 0) return `${floors} floors`;
  return "";
}

export function formatPriceBand(min?: number | null, max?: number | null): string {
  const hasMin = min != null && !Number.isNaN(min) && min > 0;
  const hasMax = max != null && !Number.isNaN(max) && max > 0;
  if (!hasMin && !hasMax) return "";
  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };
  if (hasMin && hasMax) return `Base Price Range - ${fmt(min!)} - ${fmt(max!)}`;
  if (hasMax) return `Base Price Range - ${fmt(max!)}`;
  return `Base Price Range - ${fmt(min!)}`;
}

function mapRow(p: ProjectListApiRow, index: number): ProjectInventoryRow {
  const img = PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  const name = (p.project_title ?? "").trim() || "Untitled project";
  const location = formatLocation(p.city, p.state);
  const configuration = formatConfiguration(p.project_floor_count ?? null);
  const priceRange = formatPriceBand(p.minimum_unit_price ?? null, p.maximum_unit_price ?? null);

  return {
    id: p.id,
    image: img,
    name,
    location: location || undefined,
    configuration: configuration || undefined,
    priceRange: priceRange || undefined,
    category: mapProjectType(p.project_type),
    status: mapProjectStatus(p.project_status),
    features: [],
  };
}

/**
 * Load project rows for the inventory grid.
 *
 * - **My Projects:** `GET /api/v1/projects?page=&limit=&mine=1` (sales only; `users_sales.project_assigned_ids`).
 * - **All Projects:** `GET /api/v1/projects?page=&limit=` — org-wide list (no `mine`).
 */
export async function fetchProjectInventoryGridRows(options: {
  mine: boolean;
}): Promise<ProjectInventoryRow[]> {
  const all: ProjectInventoryRow[] = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (options.mine) params.set("mine", "1");

    const res = await apiFetch<ApiOk<ProjectListData>>(
      `/api/v1/projects?${params.toString()}`
    );
    const inner = res.data;
    const projects = inner?.projects ?? [];
    const mapped = projects.map((row, i) => mapRow(row, all.length + i));
    all.push(...mapped);

    const totalPages = inner?.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return all;
}
