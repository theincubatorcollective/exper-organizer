import { normalizeTicketType } from "@/lib/server/ticket-types";
import {
  endNoteFromLabels,
  isoToEventLabel,
} from "./datetime";
import { designEventDraft } from "./mock";
import type { EventDraft, TicketType } from "./types";

export const SETUP_EXPERIENCE_STORAGE_KEY = "exper.organizer.setupExperienceId";

const CATEGORY_LABELS: Record<string, string> = {
  music: "Music & nightlife",
  arts: "Arts & culture",
  food: "Food & drink",
  wellness: "Wellness",
  sports: "Other",
  other: "Other",
};

export function fromApiCategory(value: string | null | undefined): string {
  if (!value) return designEventDraft().category;
  const key = value.trim().toLowerCase();
  return CATEGORY_LABELS[key] ?? value;
}

export function rememberSetupExperienceId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!id) {
      window.localStorage.removeItem(SETUP_EXPERIENCE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SETUP_EXPERIENCE_STORAGE_KEY, id);
  } catch {
    // Ignore quota / private mode.
  }
}

export function readRememberedSetupExperienceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SETUP_EXPERIENCE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapExperience(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  if (!root) return null;
  for (const key of ["data", "experience"] as const) {
    const inner = asRecord(root[key]);
    if (inner && (typeof inner.id === "string" || typeof inner.title === "string")) {
      return inner;
    }
  }
  return root;
}

function venueFrom(obj: Record<string, unknown>) {
  const venue = asRecord(obj.venue);
  return {
    name:
      asString(obj.venueName) ??
      asString(venue?.name) ??
      null,
    address:
      asString(obj.address) ??
      asString(venue?.address) ??
      null,
    city:
      asString(obj.city) ??
      asString(venue?.city) ??
      null,
    country:
      asString(obj.country) ??
      asString(venue?.country) ??
      null,
  };
}

function ticketTypesFrom(obj: Record<string, unknown>): TicketType[] {
  const raw = obj.ticketTypes;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => normalizeTicketType(row))
    .filter((row): row is TicketType => Boolean(row));
}

function statusFrom(value: unknown): EventDraft["status"] {
  const raw = asString(value)?.toLowerCase() ?? "";
  if (raw.includes("publish")) return "Published";
  return "Draft";
}

function currencyFrom(obj: Record<string, unknown>, tickets: TicketType[]): string {
  const direct = asString(obj.currency);
  if (direct) return direct;
  const ticketTypes = obj.ticketTypes;
  if (Array.isArray(ticketTypes) && ticketTypes[0]) {
    const first = asRecord(ticketTypes[0]);
    const price = asRecord(first?.price);
    const nested = asString(price?.currency);
    if (nested) return nested;
  }
  return tickets.length ? "NGN" : "NGN";
}

/** Map `GET /organizer/experiences/:id` → EventDraft, keeping design defaults for unmapped fields. */
export function experienceToDraft(
  payload: unknown,
  base: EventDraft = designEventDraft(),
): EventDraft {
  const obj = unwrapExperience(payload);
  if (!obj) return base;

  const id = asString(obj.id) ?? base.experienceId;
  const timezone = asString(obj.timezone) ?? base.timezone;
  const startsAt = asString(obj.startsAt);
  const endsAt = asString(obj.endsAt);
  const startLabel = startsAt
    ? isoToEventLabel(startsAt, timezone) || base.startLabel
    : base.startLabel;
  const endLabel = endsAt
    ? isoToEventLabel(endsAt, timezone) || base.endLabel
    : base.endLabel;
  const venue = venueFrom(obj);
  const tickets = ticketTypesFrom(obj);
  const description =
    asString(obj.description) ??
    asString(obj.summary) ??
    base.description;
  const currency = currencyFrom(obj, tickets);
  const title = asString(obj.title) ?? base.title;
  const cover =
    asString(obj.coverImageUrl) ??
    asString(obj.coverUrl) ??
    base.coverImageUrl;

  return {
    ...base,
    experienceId: id,
    title,
    description,
    category: fromApiCategory(asString(obj.category)),
    slug:
      asString(obj.slug) ??
      (title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || base.slug),
    coverImageUrl: cover,
    coverMeta: cover.startsWith("http")
      ? "Saved cover"
      : base.coverMeta,
    status: statusFrom(obj.status),
    savedAtLabel: "Loaded from saved draft",
    venueName: venue.name ?? base.venueName,
    address: venue.address ?? base.address,
    city: venue.city ?? base.city,
    country: venue.country ?? base.country,
    startLabel,
    endLabel,
    endNote: endNoteFromLabels(startLabel, endLabel),
    timezone,
    showVenueBeforePurchase:
      typeof obj.showVenueBeforePurchase === "boolean"
        ? obj.showVenueBeforePurchase
        : base.showVenueBeforePurchase,
    currency,
    currencyLabel: `${currency} — ${currency}`,
    tickets: tickets.length ? tickets : base.tickets,
    refundPolicy: asString(obj.refundPolicy) ?? base.refundPolicy,
  };
}
