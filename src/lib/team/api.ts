import type { TeamMemberPermissions } from "./types";

type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function teamFetch<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/organizer/workspace/members${path}`, init);
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Couldn't reach the server. Try again.",
    };
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!response.ok) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { message?: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : fallbackMessage;
    return { ok: false, status: response.status, message };
  }

  return { ok: true, status: response.status, data: (parsed ?? {}) as T };
}

export function inviteTeammate(body: {
  email: string;
  role: string;
  eventAccess: "all" | "selected";
  experienceIds?: string[];
}) {
  return teamFetch("/invites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, "Couldn't send that invite.");
}

export function resendTeammateInvite(inviteId: string) {
  return teamFetch(`/invites/${inviteId}/resend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }, "Couldn't resend that invite.");
}

export function saveMemberPermissions(
  memberId: string,
  body: {
    role: string;
    eventAccess: "all" | "selected";
    experienceIds?: string[];
    permissions: Partial<TeamMemberPermissions>;
  },
) {
  return teamFetch(`/${memberId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, "Couldn't save those permissions.");
}
