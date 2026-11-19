import { selectHero } from "@/lib/overview/select";
import { safeZone } from "@/lib/overview/format";
import type {
  AttendeesData,
  CheckInOutcome,
  Guest,
} from "@/lib/attendees/types";
import type { EventSummary } from "@/lib/overview/types";
import { backendFetch } from "./backend";
import { experiencesFrom, listExperiences } from "./organizer";
import {
  countCheckIns,
  readToken,
  toFailure,
  type Failure,
} from "./overview";

export type AttendeesResult =
  | { ok: true; data: AttendeesData; experienceId: string }
  | { ok: true; data: null; experienceId: null; empty: true }
  | Failure;

export type CheckInResponse = {
  outcome: CheckInOutcome;
  message?: string;
};

export type GuestApiRow = {
  id?: string;
  passId?: string;
  code?: string | null;
  number?: string | null;
  fullName?: string | null;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  checkedInAt?: string | null;
  ticketType?: { name?: string | null } | null;
  ticketTypeName?: string | null;
};

export type GuestsPageResponse = {
  data: GuestApiRow[];
  page: number;
  limit: number;
  total: number;
  hasMore?: boolean;
};

export const ATTENDEES_PAGE_SIZE = 20;

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

type DetailResponse = {
  title?: string;
  timezone: string;
  startsAt?: string;
  venue: { name: string | null; city: string | null; address?: string | null };
};

export function selectDoorExperience(
  events: EventSummary[],
  now: Date,
  preferredId?: string | null,
): EventSummary | null {
  if (preferredId) {
    const preferred = events.find((event) => event.id === preferredId);
    if (preferred) return preferred;
  }
  const hero = selectHero(events, now);
  if (hero) return hero.event;
  return (
    [...events].sort(
      (a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt),
    )[0] ?? null
  );
}

export function formatCheckInClock(
  iso: string,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function normalizeGuest(
  row: GuestApiRow,
  timeZone: string,
): Guest {
  const id = row.passId || row.id || row.code || cryptoRandomFallback(row);
  const name =
    row.fullName?.trim() ||
    row.name?.trim() ||
    row.displayName?.trim() ||
    row.email?.trim() ||
    "Guest";
  const ticketName =
    row.ticketType?.name?.trim() ||
    row.ticketTypeName?.trim() ||
    "Ticket";
  const ref = row.number?.trim() || row.code?.trim() || id.slice(0, 8).toUpperCase();
  const checkedInAt = row.checkedInAt ?? null;

  return {
    id,
    name,
    status: checkedInAt ? "checked-in" : "pending",
    checkedInAt: checkedInAt
      ? formatCheckInClock(checkedInAt, timeZone)
      : undefined,
    ticket: `${ticketName} · ${ref}`,
    code: row.code ?? null,
  };
}

function cryptoRandomFallback(row: GuestApiRow): string {
  // Stable-ish fallback when the API omits identifiers.
  return `guest-${JSON.stringify(row).length}-${row.checkedInAt ?? "pending"}`;
}

export function buildEventMeta(
  event: EventSummary,
  detail: DetailResponse | null,
): string {
  const title = detail?.title?.trim() || event.title;
  const venue =
    detail?.venue?.name?.trim() ||
    event.venue.name?.trim() ||
    "Main entrance";
  const timezone = detail?.timezone || "UTC";
  const when = new Date(detail?.startsAt || event.startsAt);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(timezone),
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(when);
  return `${title} · ${venue} · ${timezone} · ${date}`;
}

export function listGuestsPage(
  bearer: string,
  experienceId: string,
  page: number,
  limit = ATTENDEES_PAGE_SIZE,
) {
  return backendFetch<GuestsPageResponse>(
    `/organizer/experiences/${experienceId}/guests?page=${page}&limit=${limit}`,
    { bearer },
  );
}

export function checkInPass(
  bearer: string,
  experienceId: string,
  code: string,
  userAgent?: string | null,
) {
  return backendFetch<CheckInResponse>(
    `/organizer/experiences/${experienceId}/check-in`,
    {
      method: "POST",
      body: { code },
      bearer,
      userAgent,
    },
  );
}

export async function getAttendees(options?: {
  page?: number;
  experienceId?: string | null;
  now?: Date;
}): Promise<AttendeesResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const at = options?.now ?? new Date();
  const page = Math.max(1, options?.page ?? 1);

  const list = await listExperiences(bearer);
  if (!list.ok) return toFailure(list);

  const events = experiencesFrom(list);
  const event = selectDoorExperience(events, at, options?.experienceId);
  if (!event) {
    return { ok: true, data: null, experienceId: null, empty: true };
  }

  const [detailResult, counts, guestsResult] = await Promise.all([
    backendFetch<DetailResponse>(`/organizer/experiences/${event.id}`, {
      bearer,
    }),
    countCheckIns(event.id, bearer).catch(() => ({
      checkedIn: 0,
      attendees: 0,
      capped: false,
    })),
    listGuestsPage(bearer, event.id, page),
  ]);

  // Guests failures stay on the page (empty list). A 401 here must not dump
  // the whole session — Overview can still be fine with the same cookie.
  const detail = detailResult.ok ? detailResult.data : null;
  const timezone = detail?.timezone || "UTC";
  const guestRows = guestsResult.ok ? (guestsResult.data.data ?? []) : [];
  const guests = guestRows.map((row) => normalizeGuest(row, timezone));
  const total = guestsResult.ok
    ? (guestsResult.data.total ?? counts.attendees)
    : counts.attendees;
  const checkedIn = counts.checkedIn;
  const pending = Math.max(total - checkedIn, 0);
  const limit = guestsResult.ok
    ? guestsResult.data.limit || ATTENDEES_PAGE_SIZE
    : ATTENDEES_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / limit) || 1);
  const currentPage = guestsResult.ok
    ? guestsResult.data.page || page
    : page;

  const data: AttendeesData = {
    eventMeta: buildEventMeta(event, detail),
    metrics: [
      {
        label: "Attendees",
        value: total.toLocaleString("en-GB"),
        detail: "registered people",
      },
      {
        label: "Checked In",
        value: `${checkedIn.toLocaleString("en-GB")}${counts.capped ? "+" : ""}`,
        detail: "people admitted",
      },
      {
        label: "Pending",
        value: pending.toLocaleString("en-GB"),
        detail: "not yet admitted",
      },
    ],
    totals: {
      all: total,
      pending,
      checkedIn,
    },
    guests,
    page: currentPage,
    pageCount,
    showing: guests.length,
    footnote: guestsResult.ok
      ? "Counts are people, not orders. Each squad guest has a unique QR code and one admission."
      : `Couldn't load the guest list. ${guestsResult.message}`,
  };

  return { ok: true, data, experienceId: event.id };
}
