import {
  isPublishAcceptedStatus,
  rawStatusFromExperiencePayload,
  statusFromExperiencePayload,
  tabForExperiencePayload,
} from "@/lib/events/classify";
import type { EventTab } from "@/lib/events/types";
import { toApiCategory } from "./categories";
import { parseEventLabel, partsToDate } from "./datetime";
import type { EventDraft, TicketType } from "./types";
import { totalGuestCapacity } from "./mock";

export { toApiCategory } from "./categories";

type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

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
  accepted: boolean;
  lifecycle: "published" | "pending_review" | "draft";
  raw: string;
}> {
  const got = await fetchExperience(experienceId);
  if (!got.ok) {
    return {
      accepted: false,
      lifecycle: "draft",
      raw: `could not re-fetch (${got.message})`,
    };
  }
  const lifecycle = statusFromExperiencePayload(got.data);
  return {
    accepted: isPublishAcceptedStatus(lifecycle),
    lifecycle,
    raw: rawStatusFromExperiencePayload(got.data),
  };
}

function looksPublishAccepted(payload: unknown): boolean {
  return isPublishAcceptedStatus(statusFromExperiencePayload(payload));
}

async function confirmPublishTab(
  experienceId: string,
  httpStatus: number,
): Promise<
  ApiResult<{ status: "published" | "pending_review"; tab: EventTab }>
> {
  const got = await fetchExperience(experienceId);
  const payload = got.ok ? got.data : null;
  const lifecycle = statusFromExperiencePayload(payload);
  return {
    ok: true,
    status: httpStatus,
    data: {
      status: lifecycle === "pending_review" ? "pending_review" : "published",
      tab: tabForExperiencePayload(payload),
    },
  };
}

/**
 * Publish, then confirm status.
 * Success = `published` **or** `pending_review` (backend moderation queue).
 * Returns the Events tab the experience belongs on.
 */
export async function publishExperienceAndConfirm(
  experienceId: string,
): Promise<
  ApiResult<{ status: "published" | "pending_review"; tab: EventTab }>
> {
  const published = await publishExperience(experienceId);
  if (!published.ok) return published;

  if (looksPublishAccepted(published.data)) {
    return confirmPublishTab(experienceId, published.status);
  }

  let state = await readPublishState(experienceId);
  if (state.accepted) {
    return confirmPublishTab(experienceId, published.status);
  }

  // Only fall back to PATCH when still a plain draft — not after pending_review.
  if (state.lifecycle === "draft") {
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
        looksPublishAccepted(patched.data) ||
        (await readPublishState(experienceId)).accepted
      ) {
        return confirmPublishTab(experienceId, patched.status);
      }
    }
    state = await readPublishState(experienceId);
  }

  if (state.accepted) {
    return confirmPublishTab(experienceId, published.status);
  }

  return {
    ok: false,
    status: 502,
    message: `Backend publish did not change status (still “${state.raw}”). Expected “published” or “pending_review”.`,
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

export type TicketTypeWriteInput = {
  name?: string;
  priceAmount?: number;
  quantityTotal?: number;
  guestsPerTicket?: number;
  description?: string;
};

export function createTicketTypeOnExperience(
  experienceId: string,
  input: {
    name: string;
    priceAmount: number;
    quantityTotal: number;
    guestsPerTicket?: number;
    description?: string;
  },
): Promise<ApiResult<TicketType>> {
  return organizerFetch<TicketType>(
    `/experiences/${experienceId}/ticket-types`,
    { method: "POST", body: input },
  );
}

export function updateTicketTypeOnExperience(
  experienceId: string,
  ticketTypeId: string,
  input: TicketTypeWriteInput,
): Promise<ApiResult<TicketType>> {
  return organizerFetch<TicketType>(
    `/experiences/${experienceId}/ticket-types/${ticketTypeId}`,
    { method: "PATCH", body: input },
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

export type CoverUploadResponse = {
  coverImageUrl?: string | null;
};

const COVER_MAX_BYTES = 8 * 1024 * 1024;
const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function coverMetaFromFile(file: File): string {
  const kind =
    file.type === "image/png"
      ? "PNG"
      : file.type === "image/webp"
        ? "WebP"
        : "JPG";
  const mb = file.size / (1024 * 1024);
  const size =
    mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return `Uploaded cover · ${kind} · ${size}`;
}

export function validateCoverFile(file: File): string | null {
  if (!COVER_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > COVER_MAX_BYTES) {
    return "Cover image must be 8 MB or smaller.";
  }
  if (file.size === 0) {
    return "That file looks empty.";
  }
  return null;
}

/** `POST /api/organizer/experiences/:id/cover` multipart `file`. */
export async function uploadExperienceCover(
  experienceId: string,
  file: File,
): Promise<ApiResult<CoverUploadResponse>> {
  const invalid = validateCoverFile(file);
  if (invalid) {
    return { ok: false, status: 400, message: invalid };
  }

  const body = new FormData();
  body.set("file", file, file.name || "cover");

  let response: Response;
  try {
    response = await fetch(`/api/organizer/experiences/${experienceId}/cover`, {
      method: "POST",
      body,
      cache: "no-store",
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
      typeof (parsed as { message?: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : "Couldn't upload the cover image.";
    return { ok: false, status: response.status, message };
  }

  return {
    ok: true,
    status: response.status,
    data: (parsed ?? {}) as CoverUploadResponse,
  };
}
