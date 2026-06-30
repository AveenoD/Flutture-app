import { apiFetch } from "./apiClient";

/** One row from GET /api/v1/projects (list view; snake_case from API). */
export type ProjectListRow = {
  id: string;
  project_status?: string | null;
};

type ProjectListData = {
  projects?: ProjectListRow[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

type ProjectStatsData = {
  project_id?: string;
  available_units?: number;
};

type ApiOk<T> = {
  success?: boolean;
  data?: T;
};

/**
 * Load every project page for the current org (sales/manager see org via JWT).
 */
export async function fetchAllProjectsForOrg(): Promise<ProjectListRow[]> {
  const all: ProjectListRow[] = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const res = await apiFetch<ApiOk<ProjectListData>>(
      `/api/v1/projects?page=${page}&limit=${limit}`
    );
    const inner = res.data;
    const projects = inner?.projects ?? [];
    all.push(...projects);
    const totalPages = inner?.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return all;
}

async function fetchProjectStatsAvailableUnits(projectId: string): Promise<number> {
  try {
    const res = await apiFetch<ApiOk<ProjectStatsData>>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/stats`
    );
    const n = res.data?.available_units;
    return typeof n === "number" && !Number.isNaN(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Batch parallel requests to avoid flooding the API. */
async function sumAvailableUnitsAcrossProjects(
  projectIds: string[],
  batchSize: number
): Promise<number> {
  if (projectIds.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < projectIds.length; i += batchSize) {
    const batch = projectIds.slice(i, i + batchSize);
    const counts = await Promise.all(
      batch.map((id) => fetchProjectStatsAvailableUnits(id))
    );
    sum += counts.reduce((a, b) => a + b, 0);
  }
  return sum;
}

export type ProjectInventoryKpiNumbers = {
  /** All non-deleted projects in the org */
  activeProjects: number;
  /** Sum of `available` units across all projects (GET …/stats per project). */
  totalUnitsAvailable: number;
  /** `project_status === ready_to_move` */
  readyToMove: number;
  /** `project_status === under_construction` */
  ongoing: number;
  /** `project_status === planning_stage` */
  upcoming: number;
};

/**
 * KPIs for Project Inventory Performance Summary.
 *
 * **APIs used:**
 * - `GET /api/v1/projects?page=&limit=` — list + pagination (repeat until all pages).
 * - `GET /api/v1/projects/:id/stats` — per project; `available_units` summed for “Total units available”.
 */
export async function fetchProjectInventoryKpis(): Promise<ProjectInventoryKpiNumbers> {
  const projects = await fetchAllProjectsForOrg();
  const total = projects.length;

  let readyToMove = 0;
  let ongoing = 0;
  let upcoming = 0;

  for (const p of projects) {
    const s = (p.project_status ?? "").trim();
    if (s === "ready_to_move") readyToMove += 1;
    else if (s === "under_construction") ongoing += 1;
    else if (s === "planning_stage") upcoming += 1;
  }

  const ids = projects.map((p) => p.id).filter(Boolean);
  const totalUnitsAvailable = await sumAvailableUnitsAcrossProjects(ids, 8);

  return {
    activeProjects: total,
    totalUnitsAvailable,
    readyToMove,
    ongoing,
    upcoming,
  };
}

export function formatKpiInt(n: number): string {
  return n.toLocaleString("en-IN");
}
