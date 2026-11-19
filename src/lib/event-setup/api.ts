import {
  rawStatusFromExperiencePayload,
  statusFromExperiencePayload,
  tabForExperiencePayload,
} from "@/lib/events/classify";
import type { EventTab } from "@/lib/events/types";
import { parseEventLabel, partsToDate } from "./datetime";
import type { EventDraft, TicketType } from "./types";
import { totalGuestCapacity } from "./mock";

type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** Slug API category from a Basics label like "Music & nightlife". */
export function toApiCategory(label: string): string {
  const lower = label.trim().toLowerCase();
  if (!lower) return "other";
  if (lower.includes("music")) return "music";
  if (lower.includes("sport")) return "sports";
  if (lower.includes("art") || lower.includes("culture")) return "arts";
  if (lower.includes("food") || lower.includes("drink")) return "food";
  const token = lower.replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)[0];
  return token || "other";
}

async function organizerFetch<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {
    method: "GET",
  },
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/organizer${path}`, {
      method: init.method,
      headers:
        init.body === undefined
          ? undefined
          : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: init.method === "GET" ? "no-store" : undefined,
    });
  } catch {
    return { ok: false, status: 502, message: "Couldn't reach the server. Try again." };
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

/** Parse labels like `25 Oct 2026 / 20:00` into ISO, or fall back. */
export function labelToIso(label: string, fallbackHoursFromNow: number): string {
  const parts = parseEventLabel(label);
  const local = parts ? partsToDate(parts) : null;
  if (local) return local.toISOString();

  const cleaned = label.replace(/\s*\/\s*/, " ").replace(/\s+/g, " ").trim();
  const parsed = Date.parse(cleaned);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  const date = new Date();
  date.setHours(date.getHours() + fallbackHoursFromNow, 0, 0, 0);
  return date.toISOString();
}

export function draftToCreateExperienceBody(draft: EventDraft) {
  const capacity = Math.max(totalGuestCapacity(draft.tickets).total, 1);
  return {
    title: draft.title.trim() || "Untitled experience",
    category: toApiCategory(draft.category),
    city: draft.city.trim() || "Lagos",
    venueName: draft.venueName.trim() || "TBC",
    startsAt: labelToIso(draft.startLabel, 24 * 7),
    endsAt: labelToIso(draft.endLabel, 24 * 7 + 6),
    capacity,
  };
}

/** Fields accepted by `PATCH /organizer/experiences/:id`. */
export function draftToPatchExperienceBody(draft: EventDraft) {
  const capacity = Math.max(totalGuestCapacity(draft.tickets).total, 1);
  const description = draft.description.trim();
  return {
    title: draft.title.trim() || "Untitled experience",
    summary: description.slice(0, 280) || undefined,
    description: description || undefined,
    category: toApiCategory(draft.category),
    city: draft.city.trim() || undefined,
    country: draft.country.trim() || undefined,
    venueName: draft.venueName.trim() || undefined,
    address: draft.address.trim() || undefined,
    startsAt: labelToIso(draft.startLabel, 24 * 7),
    endsAt: labelToIso(draft.endLabel, 24 * 7 + 6),
    timezone: draft.timezone || undefined,
    currency: draft.currency || undefined,
    capacity,
    showVenueBeforePurchase: draft.showVenueBeforePurchase,
    refundPolicy: draft.refundPolicy.trim() || undefined,
  };
}

export function fetchExperience(
  experienceId: string,
): Promise<ApiResult<unknown>> {
  return organizerFetch(`/experiences/${experienceId}`, { method: "GET" });
}

export function createExperienceFromDraft(
  draft: EventDraft,
): Promise<ApiResult<{ id: string }>> {
  return organizerFetch<{ id: string }>("/experiences", {
    method: "POST",
    body: draftToCreateExperienceBody(draft),
  });
}

export function updateExperienceFromDraft(
  experienceId: string,
  draft: EventDraft,
): Promise<ApiResult<unknown>> {
  return organizerFetch(`/experiences/${experienceId}`, {
    method: "PATCH",
    body: draftToPatchExperienceBody(draft),
  });
}

export function publishExperience(
  experienceId: string,
): Promise<ApiResult<unknown>> {
  return organizerFetch(`/experiences/${experienceId}/publish`, {
    method: "POST",
    body: {},
  });
}

async function readPublishState(experienceId: string): Promise<{
  published: boolean;
  raw: string;
}> {
  const got = await fetchExperience(experienceId);
  if (!got.ok) {
    return { published: false, raw: `could not re-fetch (${got.message})` };
  }
  return {
    published: statusFromExperiencePayload(got.data) === "published",
    raw: rawStatusFromExperiencePayload(got.data),
  };
}

function looksPublished(payload: unknown): boolean {
  return statusFromExperiencePayload(payload) === "published";
}

async function confirmPublishedTab(
  experienceId: string,
  httpStatus: number,
): Promise<ApiResult<{ status: "published"; tab: EventTab }>> {
  const got = await fetchExperience(experienceId);
  const payload = got.ok ? got.data : null;
  return {
    ok: true,
    status: httpStatus,
    data: {
      status: "published",
      tab: tabForExperiencePayload(payload),
    },
  };
}

/**
 * Publish, then confirm status. If POST /publish leaves the event as draft,
 * try a few PATCH shapes some backends accept for publication.
 * Returns the Events tab the experience belongs on (upcoming / live / past).
 */
export async function publishExperienceAndConfirm(
  experienceId: string,
): Promise<ApiResult<{ status: "published"; tab: EventTab }>> {
  const published = await publishExperience(experienceId);
  if (!published.ok) return published;

  if (looksPublished(published.data)) {
    return confirmPublishedTab(experienceId, published.status);
  }

  let state = await readPublishState(experienceId);
  if (state.published) {
    return confirmPublishedTab(experienceId, published.status);
  }

  const fallbackBodies: Record<string, unknown>[] = [
    { status: "published" },
    { state: "published" },
    { publicationStatus: "published" },
    { isPublished: true },
    { published: true },
  ];

  for (const body of fallbackBodies) {
    const patched = await organizerFetch(`/experiences/${experienceId}`, {
      method: "PATCH",
      body,
    });
    if (!patched.ok) continue;
    if (
      looksPublished(patched.data) ||
      (await readPublishState(experienceId)).published
    ) {
      return confirmPublishedTab(experienceId, patched.status);
    }
  }

  state = await readPublishState(experienceId);
  return {
    ok: false,
    status: 502,
    message: `Backend publish did not change status (still “${state.raw}”). POST /organizer/experiences/:id/publish needs to set status to “published”.`,
  };
}

export function unpublishExperience(
  experienceId: string,
): Promise<ApiResult<unknown>> {
  return organizerFetch(`/experiences/${experienceId}/unpublish`, {
    method: "POST",
    body: {},
  });
}

export function savedAtLabelNow(timezone = "Africa/Lagos"): string {
  try {
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date());
    const zone = timezone === "Africa/Lagos" ? "WAT" : timezone;
    return `All changes saved at ${time} ${zone}`;
  } catch {
    return "All changes saved";
  }
}

export function createTicketTypeOnExperience(
  experienceId: string,
  input: { name: string; priceAmount: number; quantityTotal: number },
): Promise<ApiResult<TicketType>> {
  return organizerFetch<TicketType>(
    `/experiences/${experienceId}/ticket-types`,
    { method: "POST", body: input },
  );
}

export function deleteTicketTypeOnExperience(
  experienceId: string,
  ticketTypeId: string,
): Promise<ApiResult<unknown>> {
  return organizerFetch(`/experiences/${experienceId}/ticket-types/${ticketTypeId}`, {
    method: "DELETE",
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedTicketId(id: string): boolean {
  return UUID_RE.test(id);
}
