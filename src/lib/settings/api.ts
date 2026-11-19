import type {
  EventDefaultsSettings,
  NotificationSettings,
  OrganisationProfile,
} from "./types";

type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function workspaceFetch<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/organizer/workspace${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
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
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : "Something went wrong. Try again.";
    return { ok: false, status: response.status, message };
  }

  return { ok: true, status: response.status, data: parsed as T };
}

export function saveOrganisation(body: OrganisationProfile) {
  return workspaceFetch<OrganisationProfile>("/settings", body);
}

export function saveNotifications(body: NotificationSettings) {
  return workspaceFetch<NotificationSettings>("/notifications", body);
}

export function saveEventDefaults(body: EventDefaultsSettings) {
  return workspaceFetch<EventDefaultsSettings>("/event-defaults", body);
}
