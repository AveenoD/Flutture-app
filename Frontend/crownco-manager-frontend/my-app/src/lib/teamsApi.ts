import { apiFetch } from "./apiClient";

export type TeamType = "presales" | "sales" | "postsales" | "mixed";

export type TeamLabel =
  | "inbound"
  | "outbound"
  | "luxury"
  | "budget"
  | "commercial"
  | "residential";

export interface CreateTeamPayload {
  team_title: string;
  team_description?: string | null;
  team_type: TeamType;
  manager_user_id?: string | null;
  labels?: TeamLabel[];
  team_rating_score?: number | null;
  team_logo_url?: string | null;
  working_region?: string[];
}

export interface CreateTeamApiResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export interface TeamListItem {
  id: string;
  team_title: string;
  team_description?: string | null;
  team_type: TeamType;
  manager_user_id?: string | null;
  manager_name?: string | null;
  member_count: number;
  project_assigned_ids?: string[];
  labels?: TeamLabel[];
  team_logo_url?: string | null;
  team_rating_score?: number | null;
  working_region?: string[];
}

export interface ListTeamsApiResponse {
  success: boolean;
  message: string;
  data: {
    teams: TeamListItem[];
    count: number;
  };
}

export interface UpdateTeamPayload {
  team_title?: string;
  team_description?: string | null;
  team_type?: TeamType;
  manager_user_id?: string | null;
  labels?: TeamLabel[];
  team_rating_score?: number | null;
  team_logo_url?: string | null;
  team_status?: "active" | "inactive" | "blocked";
  working_region?: string[];
}

export async function createTeam(
  payload: CreateTeamPayload
): Promise<CreateTeamApiResponse> {
  return apiFetch<CreateTeamApiResponse>("/api/v1/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listTeams(): Promise<{
  teams: TeamListItem[];
  count: number;
}> {
  const res = await apiFetch<ListTeamsApiResponse>("/api/v1/teams");
  return res.data;
}

export async function updateTeam(
  id: string,
  payload: UpdateTeamPayload
): Promise<CreateTeamApiResponse> {
  return apiFetch<CreateTeamApiResponse>(`/api/v1/teams/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

