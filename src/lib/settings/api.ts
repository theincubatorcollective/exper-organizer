import type {
  EventDefaultsSettings,
  NotificationSettings,
  OrganisationProfile,
  SecuritySettings,
} from "./types";

type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function workspaceFetch<T>(
  path: string,
  init: { method?: "GET" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const method = init.method ?? "PATCH";
  let response: Response;
  try {
    response = await fetch(`/api/organizer/workspace${path}`, {
      method,
      headers:
        init.body === undefined
          ? undefined
          : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Couldn't reach the server. Try again.",
    };
  }

  if (response.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
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
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : "Something went wrong. Try again.";
    return { ok: false, status: response.status, message };
  }

  return { ok: true, status: response.status, data: parsed as T };
}

export function saveOrganisation(body: OrganisationProfile) {
  return workspaceFetch<OrganisationProfile>("/settings", { body });
}

export function saveNotifications(body: NotificationSettings) {
  return workspaceFetch<NotificationSettings>("/notifications", { body });
}

export function saveEventDefaults(body: EventDefaultsSettings) {
  return workspaceFetch<EventDefaultsSettings>("/event-defaults", { body });
}

export function saveSecurity(body: { signInAlerts: boolean }) {
  return workspaceFetch<SecuritySettings>("/security", { body });
}

export function revokeSession(sessionId: string) {
  return workspaceFetch(`/security/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
