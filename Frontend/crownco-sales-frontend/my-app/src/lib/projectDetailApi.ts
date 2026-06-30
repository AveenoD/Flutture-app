import { apiFetch } from "./apiClient";
import {
  formatLocation,
  formatPriceBand,
  mapProjectStatus,
  mapProjectType,
} from "./projectInventoryProjects";

type ApiOk<T> = { success?: boolean; data?: T };

/** GET /api/v1/projects/:id — full project (snake_case). */
export type ProjectDetailApi = {
  id: string;
  project_title?: string;
  project_type?: string;
  project_status?: string | null;
  area_type?: string | null;
  rera_number?: string | null;
  expected_possession_date?: string | null;
  city?: string | null;
  state?: string | null;
  minimum_unit_price?: number | null;
  maximum_unit_price?: number | null;
  project_floor_count?: number | null;
  smallest_unit_size?: number | null;
  biggest_unit_size?: number | null;
  amenities?: string[];
  project_cover_photo_url?: string | null;
  project_exterior_images_urls?: string[];
  project_interior_images_urls?: string[];
  project_exterior_videos_urls?: string[];
  project_drone_videos_urls?: string[];
  project_interior_videos_urls?: string[];
};

export async function fetchProjectById(projectId: string): Promise<ProjectDetailApi> {
  const res = await apiFetch<ApiOk<ProjectDetailApi>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}`
  );
  const d = res.data;
  if (!d?.id) {
    throw new Error("Invalid project response.");
  }
  return d;
}

const FALLBACK_IMG = "/property-1 1.png";

export function pickHeroImage(p: ProjectDetailApi | null): string {
  if (!p) return FALLBACK_IMG;
  const cover = p.project_cover_photo_url?.trim();
  if (cover) return cover;
  const ext = p.project_exterior_images_urls?.find((u) => u?.trim());
  if (ext) return ext.trim();
  const int = p.project_interior_images_urls?.find((u) => u?.trim());
  if (int) return int.trim();
  return FALLBACK_IMG;
}

/** Deduped gallery: cover + exterior + interior (API order). */
export function galleryImagesFromProject(p: ProjectDetailApi | null): string[] {
  if (!p) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u?: string | null) => {
    const uu = u?.trim();
    if (!uu || seen.has(uu)) return;
    seen.add(uu);
    out.push(uu);
  };
  push(p.project_cover_photo_url);
  (p.project_exterior_images_urls ?? []).forEach((u) => push(u));
  (p.project_interior_images_urls ?? []).forEach((u) => push(u));
  return out.slice(0, 16);
}

export function formatAreaType(area?: string | null): string {
  const x = (area ?? "").toLowerCase();
  if (x === "urban") return "Urban";
  if (x === "semi_urban") return "Semi Urban";
  if (x === "rural") return "Rural";
  const raw = (area ?? "").trim();
  if (!raw) return "—";
  return raw.replace(/_/g, " ");
}

export function formatPossessionDate(s?: string | null): string {
  if (!s?.trim()) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.trim();
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function formatDetailConfiguration(p: ProjectDetailApi): string {
  const parts: string[] = [];
  const fc = p.project_floor_count;
  if (fc != null && fc > 0) parts.push(`${fc} floors`);
  const sm = p.smallest_unit_size;
  const bg = p.biggest_unit_size;
  if (sm != null && bg != null && sm > 0 && bg > 0) {
    if (Math.abs(sm - bg) < 0.01) parts.push(`${sm} sq m`);
    else parts.push(`${sm}–${bg} sq m`);
  }
  return parts.join(" · ");
}

export type VideoRow = { title: string; url: string; durationLabel: string };

export function videosFromProject(p: ProjectDetailApi | null): VideoRow[] {
  if (!p) return [];
  const rows: VideoRow[] = [];
  const add = (urls: string[] | undefined, label: string) => {
    (urls ?? []).forEach((u, i) => {
      const uu = u?.trim();
      if (!uu) return;
      rows.push({
        title: `${label}${i > 0 ? ` ${i + 1}` : ""}`,
        url: uu,
        durationLabel: "Open",
      });
    });
  };
  add(p.project_exterior_videos_urls, "Exterior");
  add(p.project_drone_videos_urls, "Drone");
  add(p.project_interior_videos_urls, "Interior");
  return rows.slice(0, 8);
}

export function projectToCardProps(p: ProjectDetailApi) {
  const name = (p.project_title ?? "").trim() || "Untitled project";
  const location = formatLocation(p.city, p.state);
  const configuration = formatDetailConfiguration(p);
  const priceRange = formatPriceBand(
    p.minimum_unit_price ?? null,
    p.maximum_unit_price ?? null
  );
  const features = (p.amenities ?? []).filter(Boolean).slice(0, 8);
  return {
    image: pickHeroImage(p),
    name,
    location: location || undefined,
    configuration: configuration || undefined,
    priceRange: priceRange || undefined,
    category: mapProjectType(p.project_type),
    status: mapProjectStatus(p.project_status),
    features,
  };
}

// --- Project units (GET /api/v1/projects/:project_id/units) ---

export type UnitListItemApi = {
  id: string;
  name: string;
  status?: string;
};

type UnitListData = {
  units?: UnitListItemApi[];
  pagination?: { page: number; limit: number; total: number; total_pages: number };
};

/** Matches GET /projects/:id/units query params (core-api ListUnits). */
export type ProjectUnitsQueryFilters = {
  floor?: string;
  floor_min?: string;
  floor_max?: string;
  unit_type?: string;
  status?: string;
  price_min?: string;
  price_max?: string;
};

export type ClientUnitFiltersForm = {
  floor: string;
  floorMin: string;
  floorMax: string;
  unitType: string;
  status: string;
  priceMin: string;
  priceMax: string;
};

export const EMPTY_PROJECT_UNIT_FILTERS: ClientUnitFiltersForm = {
  floor: "",
  floorMin: "",
  floorMax: "",
  unitType: "",
  status: "",
  priceMin: "",
  priceMax: "",
};

export function clientUnitFiltersToQuery(
  f: ClientUnitFiltersForm
): ProjectUnitsQueryFilters | undefined {
  const out: ProjectUnitsQueryFilters = {};
  const floor = f.floor.trim();
  const floorMin = f.floorMin.trim();
  const floorMax = f.floorMax.trim();
  const unitType = f.unitType.trim();
  const status = f.status.trim();
  const priceMin = f.priceMin.trim();
  const priceMax = f.priceMax.trim();
  if (floor) out.floor = floor;
  if (floorMin) out.floor_min = floorMin;
  if (floorMax) out.floor_max = floorMax;
  if (unitType) out.unit_type = unitType;
  if (status) out.status = status;
  if (priceMin) out.price_min = priceMin;
  if (priceMax) out.price_max = priceMax;
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildUnitsListUrl(
  projectId: string,
  page: number,
  limit: number,
  filters?: ProjectUnitsQueryFilters
): string {
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filters) {
    if (filters.floor) q.set("floor", filters.floor);
    if (filters.floor_min) q.set("floor_min", filters.floor_min);
    if (filters.floor_max) q.set("floor_max", filters.floor_max);
    if (filters.unit_type) q.set("unit_type", filters.unit_type);
    if (filters.status) q.set("status", filters.status);
    if (filters.price_min) q.set("price_min", filters.price_min);
    if (filters.price_max) q.set("price_max", filters.price_max);
  }
  return `/api/v1/projects/${encodeURIComponent(projectId)}/units?${q.toString()}`;
}

/**
 * Load all unit rows for a project (paginates until all pages are fetched).
 * API `status`: available | under_negotiation | booked | unavailable | not_for_sale
 */
export async function fetchAllProjectUnits(
  projectId: string,
  filters?: ProjectUnitsQueryFilters
): Promise<UnitListItemApi[]> {
  const all: UnitListItemApi[] = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const url = buildUnitsListUrl(projectId, page, limit, filters);
    const res = await apiFetch<ApiOk<UnitListData>>(url);
    const inner = res.data;
    const units = inner?.units ?? [];
    all.push(...units);
    const totalPages = inner?.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return all;
}

/** Maps API unit_status to UI styling bucket. */
export type UiUnitKind = "available" | "booked" | "not-sale" | "negotiation";

export function mapApiUnitStatus(apiStatus: string | undefined): UiUnitKind {
  const s = (apiStatus ?? "").toLowerCase().trim();
  if (s === "booked") return "booked";
  if (s === "not_for_sale" || s === "unavailable") return "not-sale";
  if (s === "under_negotiation") return "negotiation";
  return "available";
}
