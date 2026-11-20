import { emptyLiveControl } from "@/lib/live-control/empty";
import type {
  Arrival,
  LiveControlData,
  LiveResponse,
  PollOption,
  QueueItem,
  SquadScore,
} from "@/lib/live-control/types";
import { formatEventWindow, safeZone, zoneLabel } from "@/lib/overview/format";
import type { EventSummary } from "@/lib/overview/types";
import {
  buildEventMeta,
  formatCheckInClock,
  listGuestsPage,
  normalizeGuest,
  selectDoorExperience,
  type GuestApiRow,
} from "./attendees";
import { backendFetch } from "./backend";
import { experiencesFrom, listExperiences } from "./organizer";
import {
  countCheckIns,
  readToken,
  toFailure,
  type Failure,
} from "./overview";

export type LiveControlResult =
  | { ok: true; data: LiveControlData; experienceId: string }
  | { ok: true; data: null; experienceId: null; empty: true }
  | Failure;

type DetailResponse = {
  title?: string;
  timezone: string;
  capacity: number | null;
  startsAt?: string;
  endsAt?: string;
  venue: { name: string | null; city: string | null; address?: string | null };
};

export type MomentApiRow = {
  id?: string;
  type?: string;
  status?: string | null;
  title?: string | null;
  subtitle?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  closedAt?: string | null;
  durationSeconds?: number | null;
  responseCount?: number | null;
  content?: {
    prompt?: string | null;
    options?: Array<{
      id?: string;
      label?: string;
      title?: string;
      votes?: number;
      percent?: number;
    }> | null;
    index?: number | null;
    total?: number | null;
    action?: string | null;
    maxLength?: number | null;
    goal?: number | null;
  } | null;
};

export type SquadApiRow = {
  id?: string;
  name?: string | null;
  tagline?: string | null;
  points?: number | null;
  score?: number | null;
  memberCount?: number | null;
  members?: unknown[] | null;
  missionsCompleted?: number | null;
};

export type ReportApiRow = {
  id?: string;
  responseId?: string | null;
  text?: string | null;
  body?: string | null;
  content?: string | null;
  author?: string | null;
  userName?: string | null;
  createdAt?: string | null;
  laughs?: number | null;
};

export type SubmissionApiRow = {
  id?: string;
  responseId?: string | null;
  status?: string | null;
  approved?: boolean | null;
  imageUrl?: string | null;
  url?: string | null;
  author?: string | null;
  userName?: string | null;
  createdAt?: string | null;
  consent?: boolean | null;
};

export type PresenceApi = {
  activeLast5Minutes?: number;
  checkedIn?: number;
  registered?: number;
};

export type MomentResponseApiRow = {
  id?: string;
  text?: string | null;
  author?: string | null;
  createdAt?: string | null;
  laughs?: number | null;
  flagged?: boolean | null;
};

export type MomentResultsApi = {
  momentId?: string;
  type?: string;
  status?: string | null;
  respondents?: number | null;
  skipped?: number | null;
  total?: number | null;
  options?: Array<{
    id?: string;
    label?: string;
    votes?: number;
    percent?: number;
  }> | null;
};

export type LeaderboardApiRow = {
  userId?: string;
  displayName?: string | null;
  name?: string | null;
  points?: number | null;
};

type MomentResponsesPage = {
  data?: MomentResponseApiRow[];
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
};

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

export function listMoments(bearer: string, experienceId: string) {
  return backendFetch<MomentApiRow[] | { data: MomentApiRow[] }>(
    `/organizer/experiences/${experienceId}/moments`,
    { bearer },
  );
}

export function listSquads(bearer: string, experienceId: string) {
  return backendFetch<SquadApiRow[] | { data: SquadApiRow[] }>(
    `/organizer/experiences/${experienceId}/squads`,
    { bearer },
  );
}

export function listReports(bearer: string, experienceId: string) {
  return backendFetch<ReportApiRow[] | { data: ReportApiRow[] }>(
    `/organizer/experiences/${experienceId}/reports`,
    { bearer },
  );
}

export function getLivePresence(bearer: string, experienceId: string) {
  return backendFetch<PresenceApi>(
    `/organizer/experiences/${experienceId}/live/presence`,
    { bearer },
  );
}

export type LiveStateApi = {
  state?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
};

export function getLiveState(bearer: string, experienceId: string) {
  return backendFetch<LiveStateApi>(
    `/organizer/experiences/${experienceId}/live/state`,
    { bearer },
  );
}

export function pauseLiveEvent(
  bearer: string,
  experienceId: string,
  userAgent?: string | null,
) {
  return backendFetch<LiveStateApi>(
    `/organizer/experiences/${experienceId}/live/pause`,
    { method: "POST", body: {}, bearer, userAgent },
  );
}

export function resumeLiveEvent(
  bearer: string,
  experienceId: string,
  userAgent?: string | null,
) {
  return backendFetch<LiveStateApi>(
    `/organizer/experiences/${experienceId}/live/resume`,
    { method: "POST", body: {}, bearer, userAgent },
  );
}

export function endLiveEvent(
  bearer: string,
  experienceId: string,
  confirm: boolean,
  userAgent?: string | null,
) {
  return backendFetch<LiveStateApi>(
    `/organizer/experiences/${experienceId}/live/end`,
    { method: "POST", body: { confirm }, bearer, userAgent },
  );
}

export function mapLivePhase(
  state: string | null | undefined,
): "running" | "paused" | "ended" | "unknown" {
  switch ((state ?? "").toLowerCase()) {
    case "running":
    case "live":
    case "active":
      return "running";
    case "paused":
    case "pause":
      return "paused";
    case "ended":
    case "end":
      return "ended";
    default:
      return "unknown";
  }
}

export function listMomentResponses(
  bearer: string,
  experienceId: string,
  momentId: string,
  query?: { page?: number; limit?: number; sort?: string; flagged?: boolean },
) {
  const params = new URLSearchParams();
  params.set("page", String(query?.page ?? 1));
  params.set("limit", String(query?.limit ?? 50));
  if (query?.sort) params.set("sort", query.sort);
  if (typeof query?.flagged === "boolean") {
    params.set("flagged", String(query.flagged));
  }
  return backendFetch<MomentResponsesPage | MomentResponseApiRow[]>(
    `/organizer/experiences/${experienceId}/moments/${momentId}/responses?${params}`,
    { bearer },
  );
}

export function getMomentResults(
  bearer: string,
  experienceId: string,
  momentId: string,
) {
  return backendFetch<MomentResultsApi>(
    `/organizer/experiences/${experienceId}/moments/${momentId}/results`,
    { bearer },
  );
}

export function listLeaderboard(
  bearer: string,
  experienceId: string,
  limit = 20,
) {
  return backendFetch<LeaderboardApiRow[] | { data: LeaderboardApiRow[] }>(
    `/organizer/experiences/${experienceId}/leaderboard?limit=${limit}`,
    { bearer },
  );
}

export function listSubmissions(
  bearer: string,
  experienceId: string,
  momentId: string,
) {
  return backendFetch<SubmissionApiRow[] | { data: SubmissionApiRow[] }>(
    `/organizer/experiences/${experienceId}/moments/${momentId}/submissions`,
    { bearer },
  );
}

export function closeMoment(
  bearer: string,
  experienceId: string,
  momentId: string,
  userAgent?: string | null,
) {
  return backendFetch(
    `/organizer/experiences/${experienceId}/moments/${momentId}/close`,
    { method: "POST", body: {}, bearer, userAgent },
  );
}

export function startMoment(
  bearer: string,
  experienceId: string,
  body: Record<string, unknown>,
  userAgent?: string | null,
) {
  return backendFetch(
    `/organizer/experiences/${experienceId}/moments`,
    { method: "POST", body, bearer, userAgent },
  );
}

export function reviewResponse(
  bearer: string,
  experienceId: string,
  responseId: string,
  approved: boolean,
  userAgent?: string | null,
) {
  return backendFetch(
    `/organizer/experiences/${experienceId}/responses/${responseId}/review`,
    {
      method: "POST",
      body: { approved },
      bearer,
      userAgent,
    },
  );
}

export function restoreResponse(
  bearer: string,
  experienceId: string,
  responseId: string,
  userAgent?: string | null,
) {
  return backendFetch(
    `/organizer/experiences/${experienceId}/responses/${responseId}/restore`,
    { method: "POST", body: {}, bearer, userAgent },
  );
}

export function postLiveUpdate(
  bearer: string,
  experienceId: string,
  body: { title: string; detail: string },
  userAgent?: string | null,
) {
  return backendFetch(`/organizer/experiences/${experienceId}/updates`, {
    method: "POST",
    body,
    bearer,
    userAgent,
  });
}

function asList<T>(payload: T[] | { data: T[] } | undefined | null): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function momentStatus(row: MomentApiRow): string {
  return (row.status ?? "").toLowerCase();
}

export function isLiveMoment(row: MomentApiRow): boolean {
  const status = momentStatus(row);
  if (status === "live" || status === "active" || status === "open") return true;
  if (status === "closed" || status === "scheduled" || status === "ended") {
    return false;
  }
  // Fallback: started and not closed.
  return Boolean(row.startsAt) && !row.closedAt && !row.endsAt;
}

export function isScheduledMoment(row: MomentApiRow): boolean {
  const status = momentStatus(row);
  return status === "scheduled" || status === "ready" || status === "queued";
}

export function momentTitle(row: MomentApiRow): string {
  return (
    row.title?.trim() ||
    row.content?.prompt?.trim() ||
    row.subtitle?.trim() ||
    typeLabel(row.type)
  );
}

function typeLabel(type: string | undefined): string {
  switch (type) {
    case "wrong_answers":
      return "Wrong answers";
    case "room_vote":
      return "Room vote";
    case "squad_vote":
      return "Squad vote";
    case "photo_prompt":
      return "Photo prompt";
    case "squad_mission":
      return "Squad mission";
    default:
      return type?.replaceAll("_", " ") || "Moment";
  }
}

function formatRemaining(
  endsAt: string | null | undefined,
  durationSeconds: number | null | undefined,
): { remaining: string; totalLabel: string } {
  if (endsAt) {
    const ms = Date.parse(endsAt) - Date.now();
    if (Number.isFinite(ms) && ms > 0) {
      const total = Math.floor(ms / 1000);
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return {
        remaining: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        totalLabel: durationSeconds
          ? `of ${formatDuration(durationSeconds)} remaining`
          : "remaining",
      };
    }
  }
  if (durationSeconds && durationSeconds > 0) {
    return {
      remaining: formatDuration(durationSeconds),
      totalLabel: "duration",
    };
  }
  return { remaining: "--:--", totalLabel: "no timer" };
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function mapQueueItem(row: MomentApiRow, timeZone: string): QueueItem {
  const id = row.id || momentTitle(row);
  const live = isLiveMoment(row);
  const scheduled = isScheduledMoment(row);
  const closed = momentStatus(row) === "closed" || Boolean(row.closedAt);
  let status = "Ready";
  let detail = typeLabel(row.type);
  if (live) {
    status = "Live";
    detail = "Running now";
  } else if (scheduled) {
    status = "Ready";
    detail = row.startsAt
      ? `Scheduled · ${formatCheckInClock(row.startsAt, timeZone)}`
      : `Up next · ${typeLabel(row.type)}`;
  } else if (closed) {
    status =
      typeof row.responseCount === "number"
        ? `${row.responseCount.toLocaleString("en-GB")} responses`
        : "Closed";
    detail = row.closedAt
      ? `Closed · ${formatCheckInClock(row.closedAt, timeZone)}`
      : "Closed";
  }
  return { id, title: momentTitle(row), status, detail };
}

export function mapPollOptions(row: MomentApiRow): PollOption[] {
  const options = row.content?.options ?? [];
  const totalVotes = options.reduce(
    (sum, option) => sum + (option.votes ?? 0),
    0,
  );
  return options.map((option, index) => {
    const votes = option.votes ?? 0;
    const percent =
      typeof option.percent === "number"
        ? option.percent
        : totalVotes > 0
          ? Math.round((votes / totalVotes) * 100)
          : 0;
    return {
      label: option.label?.trim() || option.title?.trim() || `Option ${index + 1}`,
      percent,
      votes,
      emphasize: index === 0 && percent > 0,
    };
  });
}

export function mapResultsOptions(results: MomentResultsApi): PollOption[] {
  const options = results.options ?? [];
  const ranked = [...options].sort(
    (a, b) => (b.votes ?? 0) - (a.votes ?? 0),
  );
  const topVotes = ranked[0]?.votes ?? 0;
  return options.map((option, index) => {
    const votes = option.votes ?? 0;
    const percent =
      typeof option.percent === "number"
        ? option.percent
        : results.respondents && results.respondents > 0
          ? Math.round((votes / results.respondents) * 100)
          : 0;
    return {
      label: option.label?.trim() || `Option ${index + 1}`,
      percent,
      votes,
      emphasize: votes > 0 && votes === topVotes,
    };
  });
}

export function mapMomentResponse(
  row: MomentResponseApiRow,
  timeZone: string,
): LiveResponse {
  return {
    id: row.id || `response-${JSON.stringify(row).length}`,
    text: row.text?.trim() || "Answer",
    author: row.author?.trim() || "Guest",
    time: row.createdAt
      ? `${formatCheckInClock(row.createdAt, timeZone)} ${zoneLabel(timeZone, new Date(row.createdAt))}`
      : "—",
    laughs: row.laughs ?? 0,
    flagged: row.flagged === true,
  };
}

export function mapLeaderboardRow(row: LeaderboardApiRow): {
  name: string;
  points: number;
} {
  return {
    name: row.displayName?.trim() || row.name?.trim() || "Guest",
    points: row.points ?? 0,
  };
}

function pickStreamMoment(
  moments: MomentApiRow[],
  active: MomentApiRow | null,
): MomentApiRow | null {
  const textTypes = new Set(["wrong_answers", "photo_prompt", "squad_mission"]);
  if (active && textTypes.has(active.type ?? "")) return active;
  const liveText = moments.find(
    (row) => isLiveMoment(row) && textTypes.has(row.type ?? ""),
  );
  if (liveText) return liveText;
  const anyText = moments.find((row) => textTypes.has(row.type ?? ""));
  if (anyText) return anyText;
  return active ?? moments[0] ?? null;
}

export function mapSquad(row: SquadApiRow): SquadScore {
  const members =
    row.memberCount ??
    (Array.isArray(row.members) ? row.members.length : 0);
  const missions = row.missionsCompleted;
  const detailParts = [
    members ? `${members} members` : null,
    typeof missions === "number" ? `${missions} missions completed` : null,
    row.tagline?.trim() || null,
  ].filter(Boolean);
  return {
    name: row.name?.trim() || "Squad",
    points: row.points ?? row.score ?? 0,
    detail: detailParts.join(" · ") || "Squad",
  };
}

export function mapReport(
  row: ReportApiRow,
  timeZone: string,
): LiveResponse {
  return {
    id: row.responseId || row.id || `report-${JSON.stringify(row).length}`,
    text:
      row.text?.trim() ||
      row.body?.trim() ||
      row.content?.trim() ||
      "Reported answer",
    author: row.author?.trim() || row.userName?.trim() || "Guest",
    time: row.createdAt
      ? `${formatCheckInClock(row.createdAt, timeZone)} ${zoneLabel(timeZone, new Date(row.createdAt))}`
      : "—",
    laughs: row.laughs ?? 0,
    flagged: true,
  };
}

function buildEventLine(
  event: EventSummary,
  detail: DetailResponse | null,
  now: Date,
): { title: string; meta: string } {
  const title = detail?.title?.trim() || event.title;
  const timezone = detail?.timezone || "UTC";
  const venue = [
    detail?.venue?.name || event.venue.name,
    detail?.venue?.city || event.venue.city,
  ]
    .filter(Boolean)
    .join(", ");
  const window = formatEventWindow(
    detail?.startsAt || event.startsAt,
    detail?.endsAt || event.endsAt,
    timezone,
  );
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(timezone),
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const offset = zoneLabel(timezone, now);
  const meta = [
    venue || null,
    `${clock} ${offset}`,
    `${timezone}`,
  ]
    .filter(Boolean)
    .join(" · ");
  // Prefer a compact live clock line; keep venue + zone.
  return {
    title,
    meta: venue
      ? `${venue} · ${clock} ${offset} · ${timezone}`
      : `${buildEventMeta(event, detail)} · ${window}`,
  };
}

export async function getLiveControl(options?: {
  experienceId?: string | null;
  now?: Date;
}): Promise<LiveControlResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const at = options?.now ?? new Date();
  const list = await listExperiences(bearer);
  if (!list.ok) return toFailure(list);

  const events = experiencesFrom(list);
  const event = selectDoorExperience(events, at, options?.experienceId);
  if (!event) {
    return { ok: true, data: null, experienceId: null, empty: true };
  }

  const [
    detailResult,
    counts,
    guestsPage,
    momentsResult,
    squadsResult,
    reportsResult,
    presenceResult,
    leaderboardResult,
    liveStateResult,
  ] = await Promise.all([
    backendFetch<DetailResponse>(`/organizer/experiences/${event.id}`, {
      bearer,
    }),
    countCheckIns(event.id, bearer).catch(() => ({
      checkedIn: 0,
      attendees: 0,
      capped: false,
    })),
    listGuestsPage(bearer, event.id, 1, 5),
    listMoments(bearer, event.id),
    listSquads(bearer, event.id),
    listReports(bearer, event.id),
    getLivePresence(bearer, event.id),
    listLeaderboard(bearer, event.id),
    getLiveState(bearer, event.id),
  ]);

  const detail = detailResult.ok ? detailResult.data : null;
  const timezone = detail?.timezone || "UTC";
  const { title, meta } = buildEventLine(event, detail, at);

  const moments = momentsResult.ok ? asList(momentsResult.data) : [];
  const liveMoments = moments.filter(isLiveMoment);
  const active = liveMoments[0] ?? null;
  const queue = moments
    .filter((row) => row.id !== active?.id)
    .map((row) => mapQueueItem(row, timezone));

  const presence = presenceResult.ok ? presenceResult.data : null;
  const registered =
    typeof presence?.registered === "number" && presence.registered > 0
      ? presence.registered
      : guestsPage.ok
        ? guestsPage.data.total
        : counts.attendees;
  const checkedIn =
    typeof presence?.checkedIn === "number" && presence.checkedIn > 0
      ? presence.checkedIn
      : counts.checkedIn;
  const activeParticipants =
    typeof presence?.activeLast5Minutes === "number"
      ? presence.activeLast5Minutes
      : null;
  const pending = Math.max(registered - checkedIn, 0);
  const checkedInPercent =
    registered > 0 ? `${((checkedIn / registered) * 100).toFixed(1)}%` : "0%";
  const activePercent =
    activeParticipants != null && checkedIn > 0
      ? `${((activeParticipants / checkedIn) * 100).toFixed(1)}%`
      : "—";

  const guestRows: GuestApiRow[] = guestsPage.ok
    ? (guestsPage.data.data as GuestApiRow[])
    : [];
  const recentArrivals: Arrival[] = guestRows
    .filter((row) => row.checkedInAt)
    .slice(0, 5)
    .map((row) => {
      const guest = normalizeGuest(row, timezone);
      return {
        name: guest.name,
        code: guest.ticket.split(" · ").slice(-1)[0] || guest.id.slice(0, 8),
        status: "Admitted",
        meta: `${guest.checkedInAt ?? "—"} · ${guest.ticket}`,
      };
    });

  const streamMoment = pickStreamMoment(moments, active);
  const voteMoment =
    moments.find(
      (row) =>
        (row.type === "room_vote" || row.type === "squad_vote") &&
        (isLiveMoment(row) || momentStatus(row) === "closed"),
    ) ?? null;

  const [streamResult, resultsResult] = await Promise.all([
    streamMoment?.id
      ? listMomentResponses(bearer, event.id, streamMoment.id, {
          page: 1,
          limit: 50,
          sort: "newest",
        })
      : Promise.resolve(null),
    voteMoment?.id
      ? getMomentResults(bearer, event.id, voteMoment.id)
      : Promise.resolve(null),
  ]);

  const streamRows =
    streamResult && streamResult.ok ? asList(streamResult.data) : [];
  const streamResponses = streamRows.map((row) =>
    mapMomentResponse(row, timezone),
  );
  const reports = reportsResult.ok ? asList(reportsResult.data) : [];
  const flaggedReports = reports.map((row) => mapReport(row, timezone));
  const responseIds = new Set(streamResponses.map((row) => row.id));
  const responses = [
    ...streamResponses,
    ...flaggedReports.filter((row) => !responseIds.has(row.id)),
  ];

  const squads = (squadsResult.ok ? asList(squadsResult.data) : []).map(mapSquad);
  const leaderboard = (
    leaderboardResult.ok ? asList(leaderboardResult.data) : []
  ).map(mapLeaderboardRow);

  let photo = emptyLiveControl({ eventTitle: title, eventMeta: meta }).photo;
  if (active?.id && active.type === "photo_prompt") {
    const submissions = await listSubmissions(bearer, event.id, active.id);
    if (submissions.ok) {
      const rows = asList(submissions.data);
      const pendingRows = rows.filter(
        (row) =>
          row.approved !== true &&
          (row.status ?? "").toLowerCase() !== "approved" &&
          (row.status ?? "").toLowerCase() !== "rejected",
      );
      const approved = rows.filter(
        (row) =>
          row.approved === true ||
          (row.status ?? "").toLowerCase() === "approved",
      ).length;
      const rejected = rows.filter(
        (row) => (row.status ?? "").toLowerCase() === "rejected",
      ).length;
      const first = pendingRows[0];
      photo = {
        pending: pendingRows.length,
        title: momentTitle(active),
        author: first
          ? `${first.author || first.userName || "Guest"} · ${
              first.createdAt
                ? formatCheckInClock(first.createdAt, timezone)
                : "—"
            }`
          : "—",
        consent: first
          ? first.consent === false
            ? "Consent missing"
            : "Consent given · Waiting for review"
          : "No pending photos",
        imageUrl: first?.imageUrl || first?.url || "",
        approved,
        pendingCount: pendingRows.length,
        rejected,
        submitted: rows.length,
      };
    }
  }

  const answered =
    (resultsResult?.ok && typeof resultsResult.data.respondents === "number"
      ? resultsResult.data.respondents
      : null) ??
    active?.responseCount ??
    0;
  const timer = formatRemaining(active?.endsAt, active?.durationSeconds);
  const index =
    active?.content?.index && active?.content?.total
      ? `${String(active.content.index).padStart(2, "0")} / ${String(active.content.total).padStart(2, "0")}`
      : active
        ? "LIVE"
        : "—";

  const pollOptions =
    resultsResult?.ok && resultsResult.data
      ? mapResultsOptions(resultsResult.data)
      : voteMoment
        ? mapPollOptions(voteMoment)
        : [];
  const pollRespondents =
    resultsResult?.ok && typeof resultsResult.data.respondents === "number"
      ? resultsResult.data.respondents
      : (voteMoment?.responseCount ?? 0);

  const livePhase = liveStateResult.ok
    ? mapLivePhase(liveStateResult.data.state)
    : "unknown";

  const data = emptyLiveControl({
    eventTitle: title,
    eventMeta: meta,
    syncLabel:
      livePhase === "paused"
        ? "Paused"
        : livePhase === "ended"
          ? "Ended"
          : "Synced just now",
    activeMomentId: active?.id ?? null,
    livePhase,
    metrics: [
      {
        label: "Attendees",
        value: registered.toLocaleString("en-GB"),
        detail: "registered people",
      },
      {
        label: "Checked in",
        value: `${checkedIn.toLocaleString("en-GB")}${counts.capped ? "+" : ""}`,
        detail: `${pending.toLocaleString("en-GB")} pending arrival`,
      },
      {
        label: "Active participants",
        value:
          activeParticipants != null
            ? activeParticipants.toLocaleString("en-GB")
            : "—",
        detail:
          activeParticipants != null
            ? "active in the last 5 minutes"
            : "presence unavailable",
      },
      {
        label: "Prompt respondents",
        value: answered > 0 ? answered.toLocaleString("en-GB") : "—",
        detail: active ? typeLabel(active.type) : "no live prompt",
      },
    ],
    livePrompt: active
      ? {
          indexLabel: index,
          title: momentTitle(active),
          detail: [
            typeLabel(active.type),
            active.subtitle?.trim() || null,
          ]
            .filter(Boolean)
            .join(" · "),
          remaining: timer.remaining,
          totalLabel: timer.totalLabel,
          answered,
          active: activeParticipants ?? (checkedIn || registered),
          answeredPercent:
            checkedIn > 0
              ? `${((answered / checkedIn) * 100).toFixed(1)}%`
              : "0%",
          remainingToAnswer: Math.max((checkedIn || registered) - answered, 0),
          footerNote:
            answered > 0
              ? `${Math.max((checkedIn || registered) - answered, 0).toLocaleString("en-GB")} yet to answer`
              : "Waiting for the first answer.",
          sendNextNote:
            "Sending next closes this prompt first. Attendees keep their submitted answers.",
        }
      : emptyLiveControl({ eventTitle: title, eventMeta: meta }).livePrompt,
    responses,
    queue,
    poll: voteMoment
      ? {
          title: momentTitle(voteMoment),
          closedLabel: isLiveMoment(voteMoment)
            ? "Live"
            : voteMoment.closedAt
              ? `Closed · ${formatCheckInClock(voteMoment.closedAt, timezone)}`
              : "Closed",
          respondents: pollRespondents,
          options: pollOptions,
        }
      : emptyLiveControl({ eventTitle: title, eventMeta: meta }).poll,
    photo,
    participation: {
      active: activeParticipants ?? 0,
      checkedIn,
      activePercent,
      inactiveCheckedIn: Math.max(
        checkedIn - (activeParticipants ?? 0),
        0,
      ),
      registered,
      pendingArrival: pending,
      promptRespondents: answered,
      quizCorrectPercent: "—",
      quizDetail: "Quiz tallies are not available from the organizer API yet.",
    },
    leaderboard,
    squads,
    arrivals: {
      checkedIn,
      checkedInPercent,
      registered,
      pending,
      recent: recentArrivals,
    },
  });

  return { ok: true, data, experienceId: event.id };
}
