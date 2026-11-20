import type { ExperienceBuilderData } from "@/lib/experience-builder/types";
import {
  apiPromptToBuilder,
  type RunOfShowPromptApi,
} from "@/lib/experience-builder/map";
import { selectDoorExperience } from "./attendees";
import { backendFetch } from "./backend";
import { experiencesFrom, listExperiences } from "./organizer";
import { readToken, toFailure, type Failure } from "./overview";

export type RunOfShowResponse = {
  timezone?: string | null;
  savedAt?: string | null;
  data?: RunOfShowPromptApi[] | null;
  prompts?: RunOfShowPromptApi[] | null;
};

export type ExperienceBuilderResult =
  | {
      ok: true;
      data: ExperienceBuilderData;
      experienceId: string;
    }
  | { ok: true; data: null; experienceId: null; empty: true }
  | Failure;

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

export function getRunOfShow(bearer: string, experienceId: string) {
  return backendFetch<RunOfShowResponse>(
    `/organizer/experiences/${experienceId}/run-of-show`,
    { bearer },
  );
}

export function putRunOfShow(
  bearer: string,
  experienceId: string,
  body: { prompts: Record<string, unknown>[] },
) {
  return backendFetch<RunOfShowResponse>(
    `/organizer/experiences/${experienceId}/run-of-show`,
    { method: "PUT", bearer, body },
  );
}

function promptsFrom(
  payload: RunOfShowResponse | RunOfShowPromptApi[] | null | undefined,
) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.prompts)) return payload.prompts;
  return [];
}

function formatClock(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(at);
  } catch {
    return "—";
  }
}

export async function getExperienceBuilder(options?: {
  experienceId?: string | null;
  now?: Date;
}): Promise<ExperienceBuilderResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const at = options?.now ?? new Date();
  const list = await listExperiences(bearer);
  if (!list.ok) return toFailure(list);

  const events = experiencesFrom(list);
  const event = selectDoorExperience(events, at, options?.experienceId);
  if (!event) {
    return { ok: true, data: null, experienceId: null, empty: true };
  }

  const run = await getRunOfShow(bearer, event.id);
  const timezone = "Africa/Lagos";
  const rows = run.ok ? promptsFrom(run.data) : [];
  const prompts = rows.map((row, index) =>
    apiPromptToBuilder(row, index, timezone),
  );
  if (prompts[0] && prompts.every((p) => p.status !== "selected")) {
    prompts[0] = {
      ...prompts[0],
      status: "selected",
      statusLabel: "Ready",
    };
  }

  const savedAt = run.ok ? run.data.savedAt : null;
  const savedLabel = savedAt ? formatClock(savedAt, timezone) : null;

  return {
    ok: true,
    experienceId: event.id,
    data: {
      eventTitle: event.title,
      meta: savedLabel
        ? `Run-of-show · ${timezone} · Saved ${savedLabel}`
        : `Run-of-show · ${timezone}${run.ok ? "" : ` · ${run.message}`}`,
      prompts,
      disclaimer:
        "Squad mission points are private to each squad. Never included in the public individual leaderboard.",
    },
  };
}
