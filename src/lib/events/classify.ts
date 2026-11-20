import type { EventRow, EventTab } from "./types";

function normStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase().replace(/-/g, "_");
}

/** Submitted for moderation — not listed yet, but publish succeeded. */
export function isPendingReviewStatus(
  status: string | null | undefined,
): boolean {
  const value = normStatus(status);
  return (
    value === "pending_review" ||
    value === "pendingreview" ||
    value === "in_review" ||
    value === "under_review" ||
    value === "awaiting_review"
  );
}

/** Backend may send `published`, `Published`, `live`, etc. */
export function isPublishedStatus(status: string | null | undefined): boolean {
  const value = normStatus(status);
  if (!value || isPendingReviewStatus(value)) return false;
  if (
    value === "published" ||
    value === "live" ||
    value === "active" ||
    value === "public" ||
    value === "scheduled" ||
    value === "upcoming" ||
    value === "ready" ||
    value === "open" ||
    value === "listed"
  ) {
    return true;
  }
  // e.g. "published_at", "is_published", "status_published"
  return value.includes("publish") && !value.includes("unpublish");
}

/** Publish endpoint accepted the request (live or waiting on review). */
export function isPublishAcceptedStatus(
  status: string | null | undefined,
): boolean {
  return isPublishedStatus(status) || isPendingReviewStatus(status);
}

/** Best-effort raw status string for error messages / debugging. */
export function rawStatusFromExperiencePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "(empty)";
  const root = payload as Record<string, unknown>;
  const obj =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root.experience && typeof root.experience === "object"
        ? (root.experience as Record<string, unknown>)
        : root;

  for (const key of [
    "status",
    "state",
    "publicationStatus",
    "publishStatus",
    "lifecycle",
    "phase",
  ] as const) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (obj.isPublished === true || obj.published === true) return "published";
  if (typeof obj.publishedAt === "string" && obj.publishedAt.trim()) {
    return `publishedAt:${obj.publishedAt}`;
  }
  return "(no status field)";
}

export function normalizeEventStatus(
  status: string | null | undefined,
): "published" | "pending_review" | "draft" {
  if (isPublishedStatus(status)) return "published";
  if (isPendingReviewStatus(status)) return "pending_review";
  return "draft";
}

/** Read publish state from whatever shape the API returns. */
export function statusFromExperiencePayload(
  payload: unknown,
): "published" | "pending_review" | "draft" {
  if (!payload || typeof payload !== "object") return "draft";
  const root = payload as Record<string, unknown>;
  const obj =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root.experience && typeof root.experience === "object"
        ? (root.experience as Record<string, unknown>)
        : root;

  if (obj.isPublished === true || obj.published === true) return "published";
  if (typeof obj.publishedAt === "string" && obj.publishedAt.trim()) {
    return "published";
  }

  for (const key of [
    "status",
    "state",
    "publicationStatus",
    "publishStatus",
    "lifecycle",
    "phase",
  ] as const) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeEventStatus(value);
    }
  }

  return "draft";
}

export function tabFor(
  event: Pick<EventRow, "status" | "startsAt" | "endsAt">,
  now: Date,
): EventTab {
  if (!isPublishedStatus(event.status)) return "drafts";
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "drafts";
  const at = now.getTime();
  if (at < start) return "upcoming";
  if (at <= end) return "live";
  return "past";
}

function asIsoField(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const obj =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root.experience && typeof root.experience === "object"
        ? (root.experience as Record<string, unknown>)
        : root;
  const value = obj[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Which Events tab a published experience payload belongs on right now. */
export function tabForExperiencePayload(
  payload: unknown,
  now: Date = new Date(),
): EventTab {
  const status = statusFromExperiencePayload(payload);
  const startsAt = asIsoField(payload, "startsAt") ?? "";
  const endsAt = asIsoField(payload, "endsAt") ?? "";
  return tabFor({ status, startsAt, endsAt }, now);
}

export function sortFor(tab: EventTab, events: EventRow[]): EventRow[] {
  const direction = tab === "past" ? -1 : 1;
  return [...events].sort(
    (a, b) => direction * (Date.parse(a.startsAt) - Date.parse(b.startsAt)),
  );
}
