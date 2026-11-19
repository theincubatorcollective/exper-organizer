import {
  normalizeEventStatus,
  rawStatusFromExperiencePayload,
  statusFromExperiencePayload,
} from "@/lib/events/classify";
import { coverFromExperiencePayload } from "@/lib/events/cover";
import type { EventRow, EventsData } from "@/lib/events/types";
import { backendFetch } from "./backend";
import { experiencesFrom, listExperiences } from "./organizer";
import { readToken, toFailure, type Failure } from "./overview";

// Each event costs two extra calls (detail and guest count), so the page
// shows the newest 50 and says so rather than fanning out for all 200.
export const MAX_EVENTS = 50;

export type EventsResult = { ok: true; data: EventsData } | Failure;

type ListEntry = Pick<EventRow, "id" | "title" | "status" | "startsAt" | "endsAt" | "venue">;

type DetailResponse = {
  status?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  title?: string | null;
  coverImageUrl?: string | null;
  coverUrl?: string | null;
  imageUrl?: string | null;
  timezone: string;
  capacity: number | null;
  venue?: { name?: string | null; city?: string | null } | null;
  ticketTypes?: { price?: { currency?: string | null } | null }[] | null;
};

function asIso(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function loadRow(entry: ListEntry, bearer: string): Promise<EventRow> {
  const [detail, guests] = await Promise.all([
    backendFetch<DetailResponse>(`/organizer/experiences/${entry.id}`, { bearer }),
    backendFetch<{ total: number }>(
      `/organizer/experiences/${entry.id}/guests?page=1&limit=1`,
      { bearer },
    ),
  ]);

  const d = detail.ok ? detail.data : null;
  // Detail often omits status — don't treat that as draft over a published list row.
  const detailStatusRaw = detail.ok
    ? rawStatusFromExperiencePayload(detail.data)
    : "(no status field)";
  const status =
    detail.ok && detailStatusRaw !== "(no status field)"
      ? statusFromExperiencePayload(detail.data)
      : normalizeEventStatus(entry.status);

  return {
    ...entry,
    title: (d?.title && d.title.trim()) || entry.title,
    status,
    startsAt: asIso(d?.startsAt, entry.startsAt),
    endsAt: asIso(d?.endsAt, entry.endsAt),
    venue: {
      name: d?.venue?.name ?? entry.venue.name,
      city: d?.venue?.city ?? entry.venue.city,
    },
    coverImageUrl: detail.ok
      ? coverFromExperiencePayload(detail.data)
      : null,
    timezone: d?.timezone || "UTC",
    capacity: d?.capacity ?? null,
    currency: d?.ticketTypes?.[0]?.price?.currency ?? null,
    sold: guests.ok ? guests.data.total : null,
  };
}

export async function getEvents(now?: Date): Promise<EventsResult> {
  const bearer = await readToken();
  if (!bearer) {
    return { ok: false, reason: "unauthorized", message: "Sign in to continue." };
  }
  // The clock is read after the cookie: with cacheComponents, `new Date()`
  // before request-time data is a prerender error.
  const at = now ?? new Date();

  const list = await listExperiences(bearer);
  if (!list.ok) return toFailure(list);

  const rows = (experiencesFrom(list) as ListEntry[]).map((entry) => ({
    ...entry,
    status: normalizeEventStatus(entry.status),
    startsAt: asIso(entry.startsAt, ""),
    endsAt: asIso(entry.endsAt, ""),
    venue: entry.venue ?? { name: null, city: null },
  }));
  const events = await Promise.all(
    rows.slice(0, MAX_EVENTS).map((entry) => loadRow(entry, bearer)),
  );

  return {
    ok: true,
    data: {
      events,
      truncated: rows.length > MAX_EVENTS,
      nowIso: at.toISOString(),
    },
  };
}
