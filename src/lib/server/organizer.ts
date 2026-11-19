import type { EventSummary } from "@/lib/overview/types";
import { backendFetch, type BackendResult } from "./backend";

/** `GET /organizer/workspace` */
export type WorkspaceResponse = {
  id: string;
  name: string;
};

/** `GET /organizer/experiences` list envelope */
export type ExperiencesListResponse = {
  data: EventSummary[];
};

/** Signed-in organizer profile (Auth folder, used only for display name). */
export type OrganizerMeResponse = {
  user: { fullName: string | null; email: string | null };
  workspace: { id: string; name: string } | null;
  data?: EventSummary[];
};

export function getWorkspace(
  bearer: string,
): Promise<BackendResult<WorkspaceResponse>> {
  return backendFetch<WorkspaceResponse>("/organizer/workspace", { bearer });
}

export function listExperiences(
  bearer: string,
): Promise<BackendResult<ExperiencesListResponse>> {
  return backendFetch<ExperiencesListResponse>("/organizer/experiences", {
    bearer,
  });
}

export function getOrganizerMe(
  bearer: string,
): Promise<BackendResult<OrganizerMeResponse>> {
  return backendFetch<OrganizerMeResponse>("/organizer/me", { bearer });
}

/** Accept flat `{ id, name }` or nested `{ data | workspace: { id, name } }`. */
export function normalizeWorkspace(payload: unknown): WorkspaceResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.name === "string") {
    return { id: typeof obj.id === "string" ? obj.id : "", name: obj.name };
  }
  for (const key of ["data", "workspace"] as const) {
    const inner = obj[key];
    if (inner && typeof inner === "object") {
      const nested = inner as Record<string, unknown>;
      if (typeof nested.name === "string") {
        return {
          id: typeof nested.id === "string" ? nested.id : "",
          name: nested.name,
        };
      }
    }
  }
  return null;
}

/** Accept `{ data: [] }`, a bare array, or `{ experiences: [] }`. */
export function normalizeExperiences(payload: unknown): EventSummary[] {
  if (Array.isArray(payload)) return payload as EventSummary[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as EventSummary[];
  if (Array.isArray(obj.experiences)) return obj.experiences as EventSummary[];
  return [];
}

export function workspaceNameFrom(
  workspace: BackendResult<WorkspaceResponse>,
  me: OrganizerMeResponse,
): string | null {
  if (workspace.ok) {
    const normalized = normalizeWorkspace(workspace.data);
    if (normalized?.name) return normalized.name;
  }
  return me.workspace?.name ?? null;
}

export function experiencesFrom(
  result: BackendResult<ExperiencesListResponse>,
): EventSummary[] {
  if (!result.ok) return [];
  return normalizeExperiences(result.data);
}
