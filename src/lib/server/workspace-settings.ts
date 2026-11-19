import type {
  EventDefaultsSettings,
  NotificationSettings,
  OrganisationProfile,
  SettingsData,
} from "@/lib/settings/types";
import { backendFetch, type BackendResult } from "./backend";
import { getWorkspace } from "./organizer";
import { readToken, toFailure, type Failure } from "./overview";

export type SettingsResult = { ok: true; data: SettingsData } | Failure;

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

export type WorkspaceSettingsResponse = {
  name?: string | null;
  legalName?: string | null;
  contactEmail?: string | null;
  supportWebsite?: string | null;
};

export type NotificationsResponse = {
  liveIncidentAlerts?: boolean;
  payoutUpdates?: boolean;
  dailySummary?: boolean;
  dailySummaryHourLocal?: number | null;
};

export type EventDefaultsResponse = {
  suggestedCountry?: string | null;
  defaultTimezone?: string | null;
  defaultCurrency?: string | null;
  photoReviewRequired?: boolean | null;
};

export function getOrganisationProfile(bearer: string) {
  return backendFetch<WorkspaceSettingsResponse>(
    "/organizer/workspace/settings",
    { bearer },
  );
}

export function updateOrganisationProfile(
  bearer: string,
  body: Partial<OrganisationProfile>,
  userAgent?: string | null,
) {
  return backendFetch<WorkspaceSettingsResponse>(
    "/organizer/workspace/settings",
    { method: "PATCH", body, bearer, userAgent },
  );
}

export function renameWorkspace(
  bearer: string,
  name: string,
  userAgent?: string | null,
) {
  return backendFetch("/organizer/workspace", {
    method: "PATCH",
    body: { name },
    bearer,
    userAgent,
  });
}

export function getNotifications(bearer: string) {
  return backendFetch<NotificationsResponse>(
    "/organizer/workspace/notifications",
    { bearer },
  );
}

export function updateNotifications(
  bearer: string,
  body: Partial<NotificationSettings>,
  userAgent?: string | null,
) {
  return backendFetch<NotificationsResponse>(
    "/organizer/workspace/notifications",
    { method: "PATCH", body, bearer, userAgent },
  );
}

export function getEventDefaults(bearer: string) {
  return backendFetch<EventDefaultsResponse>(
    "/organizer/workspace/event-defaults",
    { bearer },
  );
}

export function updateEventDefaults(
  bearer: string,
  body: Partial<EventDefaultsSettings>,
  userAgent?: string | null,
) {
  return backendFetch<EventDefaultsResponse>(
    "/organizer/workspace/event-defaults",
    { method: "PATCH", body, bearer, userAgent },
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asHour(value: unknown, fallback = 9): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(23, Math.max(0, Math.floor(value)))
    : fallback;
}

export function normalizeOrganisation(
  payload: unknown,
  fallbackName = "",
): OrganisationProfile {
  const obj =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const nested =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : obj;
  return {
    name: asString(nested.name) || fallbackName,
    legalName: asString(nested.legalName),
    contactEmail: asString(nested.contactEmail),
    supportWebsite: asString(nested.supportWebsite),
  };
}

export function normalizeNotifications(
  payload: unknown,
): NotificationSettings {
  const obj =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const nested =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : obj;
  return {
    liveIncidentAlerts: asBool(nested.liveIncidentAlerts, true),
    payoutUpdates: asBool(nested.payoutUpdates, true),
    dailySummary: asBool(nested.dailySummary, false),
    dailySummaryHourLocal: asHour(nested.dailySummaryHourLocal, 9),
  };
}

export function normalizeEventDefaults(
  payload: unknown,
): EventDefaultsSettings {
  const obj =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const nested =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : obj;
  return {
    suggestedCountry:
      typeof nested.suggestedCountry === "string"
        ? nested.suggestedCountry
        : nested.suggestedCountry === null
          ? null
          : null,
    defaultTimezone:
      typeof nested.defaultTimezone === "string"
        ? nested.defaultTimezone
        : null,
    defaultCurrency:
      typeof nested.defaultCurrency === "string"
        ? nested.defaultCurrency
        : null,
    photoReviewRequired: asBool(nested.photoReviewRequired, true),
  };
}

export async function getSettings(): Promise<SettingsResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const [workspace, profile, notifications, defaults] = await Promise.all([
    getWorkspace(bearer),
    getOrganisationProfile(bearer),
    getNotifications(bearer),
    getEventDefaults(bearer),
  ]);

  // Soft-fail individual sections so one missing route doesn't kill Settings.
  const workspaceName =
    workspace.ok && typeof workspace.data === "object"
      ? normalizeOrganisation(workspace.data).name ||
        (typeof (workspace.data as { name?: string }).name === "string"
          ? (workspace.data as { name: string }).name
          : "")
      : "";

  if (!workspace.ok && workspace.status === 401) return toFailure(workspace);
  if (!profile.ok && profile.status === 401) return toFailure(profile);

  const organisation = profile.ok
    ? normalizeOrganisation(profile.data, workspaceName)
    : normalizeOrganisation({}, workspaceName);

  const notificationSettings = notifications.ok
    ? normalizeNotifications(notifications.data)
    : normalizeNotifications({});

  const eventDefaults = defaults.ok
    ? normalizeEventDefaults(defaults.data)
    : normalizeEventDefaults({});

  const data: SettingsData = {
    eventMeta: "Workspace preferences, security and event defaults.",
    organisation,
    notifications: notificationSettings,
    eventDefaults,
    security: [
      {
        id: "s1",
        label: "Two-step verification",
        status: "—",
        detail: "Not available from the organizer API yet.",
      },
      {
        id: "s2",
        label: "Active sessions",
        status: "—",
        detail: "Not available from the organizer API yet.",
      },
      {
        id: "s3",
        label: "Sign-in alerts",
        status: "—",
        detail: "Not available from the organizer API yet.",
      },
    ],
    workspaceControls: {
      body: "Deleting a workspace requires Owner verification. Financial records follow retention rules. Delete is not available from the API yet.",
    },
    loadErrors: {
      organisation: profile.ok ? null : profile.message,
      notifications: notifications.ok ? null : notifications.message,
      eventDefaults: defaults.ok ? null : defaults.message,
    },
  };

  return { ok: true, data };
}

export type { BackendResult };
