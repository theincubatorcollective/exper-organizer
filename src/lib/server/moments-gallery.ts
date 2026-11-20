import type { MomentSubmission, MomentsData, MomentTab } from "@/lib/moments/types";
import { selectDoorExperience } from "./attendees";
import { backendFetch } from "./backend";
import { experiencesFrom, listExperiences } from "./organizer";
import { readToken, toFailure, type Failure } from "./overview";

export type GalleryRowApi = {
  id?: string | null;
  responseId?: string | null;
  caption?: string | null;
  imageUrl?: string | null;
  submitterName?: string | null;
  ticketNumber?: string | null;
  ticketTypeName?: string | null;
  checkedIn?: boolean | null;
  consent?: boolean | null;
  consentNote?: string | null;
  screening?: string | null;
  status?: string | null;
  momentTitle?: string | null;
  createdAt?: string | null;
};

export type GalleryPageResponse = {
  data?: GalleryRowApi[] | null;
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  counts?: {
    pending?: number | null;
    approved?: number | null;
    rejected?: number | null;
  } | null;
};

export type MomentsGalleryResult =
  | { ok: true; data: MomentsData; experienceId: string }
  | { ok: true; data: null; experienceId: null; empty: true }
  | Failure;

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

export function listMomentsGallery(
  bearer: string,
  experienceId: string,
  status: MomentTab | "all" = "pending",
  page = 1,
  limit = 20,
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status !== "all") params.set("status", status);
  return backendFetch<GalleryPageResponse>(
    `/organizer/experiences/${experienceId}/moments-gallery?${params}`,
    { bearer },
  );
}

function formatWhen(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(at);
  } catch {
    return "—";
  }
}

export function normalizeGalleryRow(
  row: GalleryRowApi,
  index: number,
  eventTitle: string,
  timeZone: string,
): MomentSubmission {
  const id = row.id || row.responseId || `gallery-${index}`;
  const responseId = row.responseId || row.id || id;
  const name = row.submitterName?.trim() || "Guest";
  const when = formatWhen(row.createdAt, timeZone);
  const ticketBits = [
    row.ticketNumber?.trim(),
    row.checkedIn ? "Checked in" : null,
    row.ticketTypeName?.trim(),
  ].filter(Boolean);
  const consent = row.consent === false ? "Not granted" : "Granted";

  return {
    id,
    responseId,
    caption: row.caption?.trim() || row.momentTitle?.trim() || "Photo submission",
    authorMeta: `${name} · ${eventTitle} · ${when}`,
    imageUrl: row.imageUrl?.trim() || "/overview/neon-solstice.jpg",
    submitter: name,
    ticketMeta: ticketBits.join(" · ") || "Ticket details unavailable",
    consent,
    consentNote:
      row.consentNote?.trim() ||
      (row.consent === false
        ? "Attendee did not agree to share in event memory."
        : "Attendee agreed to share in event memory."),
    screening:
      row.screening?.trim() || "No issue detected · Human review required.",
    actionNote:
      "Approval adds this photo to the shared event memory. Rejection stays private to moderators and the submitter.",
    momentTitle: row.momentTitle?.trim() || "Moment",
  };
}

export async function getMomentsGallery(options?: {
  experienceId?: string | null;
  status?: MomentTab;
  now?: Date;
}): Promise<MomentsGalleryResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const at = options?.now ?? new Date();
  const status = options?.status ?? "pending";
  const list = await listExperiences(bearer);
  if (!list.ok) return toFailure(list);

  const events = experiencesFrom(list);
  const event = selectDoorExperience(events, at, options?.experienceId);
  if (!event) {
    return { ok: true, data: null, experienceId: null, empty: true };
  }

  const page = await listMomentsGallery(bearer, event.id, status, 1, 20);
  const rows = page.ok ? (page.data.data ?? []) : [];
  const counts = page.ok
    ? {
        pending: page.data.counts?.pending ?? 0,
        approved: page.data.counts?.approved ?? 0,
        rejected: page.data.counts?.rejected ?? 0,
      }
    : { pending: 0, approved: 0, rejected: 0 };

  const items = rows.map((row, index) =>
    normalizeGalleryRow(row, index, event.title, "Africa/Lagos"),
  );
  const others = Math.max((page.ok ? page.data.total ?? items.length : 0) - 1, 0);

  return {
    ok: true,
    experienceId: event.id,
    data: {
      eventMeta: `${event.title} · Review submissions before they appear in the room or event memory.${
        page.ok ? "" : ` · ${page.message}`
      }`,
      counts,
      items,
      queueFooter:
        items.length <= 1
          ? items.length === 0
            ? "No submissions in this queue."
            : "No other submissions waiting."
          : `Showing ${Math.min(items.length - 1, items.length)} of ${others} other submissions`,
    },
  };
}
