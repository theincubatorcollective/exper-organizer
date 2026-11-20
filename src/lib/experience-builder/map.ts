import type {
  BuilderPrompt,
  PromptKind,
  PromptStatus,
} from "./types";

export type RunOfShowPromptApi = {
  id?: string | null;
  type?: string | null;
  title?: string | null;
  supportingText?: string | null;
  scheduledAt?: string | null;
  durationSeconds?: number | null;
  audience?: string | null;
  rewardPoints?: number | null;
  content?: Record<string, unknown> | null;
  moderation?: string | null;
  responseLimit?: string | null;
  format?: string | null;
  status?: string | null;
  ctaLabel?: string | null;
  answerPlaceholder?: string | null;
  scoring?: {
    participationPoints?: number | null;
    bonusPoints?: number | null;
  } | null;
};

function kindFromType(type: string | null | undefined): {
  kind: PromptKind;
  kindLabel: string;
  format: string;
} {
  switch ((type ?? "").toLowerCase()) {
    case "wrong_answers":
      return { kind: "text", kindLabel: "Text", format: "Wrong answers only" };
    case "photo_prompt":
      return { kind: "photo", kindLabel: "Photo mission", format: "Photo upload" };
    case "squad_mission":
    case "squad_vote":
      return { kind: "squad", kindLabel: "Squad mission", format: "Squad text" };
    case "room_vote":
    default:
      return { kind: "poll", kindLabel: "Poll", format: "Multiple choice" };
  }
}

export function typeFromFormat(format: string): string {
  const value = format.toLowerCase();
  if (value.includes("wrong")) return "wrong_answers";
  if (value.includes("photo")) return "photo_prompt";
  if (value.includes("squad")) return "squad_mission";
  return "room_vote";
}

function audienceLabel(value: string | null | undefined): string {
  switch ((value ?? "").toLowerCase()) {
    case "squad":
    case "squad_captains":
      return "Squad captains";
    default:
      return "All checked-in attendees";
  }
}

function audienceApi(label: string): string {
  return label.toLowerCase().includes("squad") ? "squad_captains" : "checked_in";
}

function formatClock(iso: string | null | undefined, timeZone: string): string {
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

function durationParts(seconds: number | null | undefined): {
  duration: string;
  durationLabel: string;
} {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return {
    duration: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} minutes`,
    durationLabel: mins > 0 ? `${mins} min` : `${secs}s`,
  };
}

export function parseDurationSeconds(label: string): number {
  const match = label.match(/(\d+)\s*:\s*(\d+)/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const mins = label.match(/(\d+)\s*min/i);
  if (mins) return Number(mins[1]) * 60;
  const secs = label.match(/(\d+)\s*s\b/i);
  if (secs) return Number(secs[1]);
  return 120;
}

function statusFromApi(value: string | null | undefined): {
  status: PromptStatus;
  statusLabel: string;
} {
  switch ((value ?? "").toLowerCase()) {
    case "sent":
    case "live":
    case "closed":
      return { status: "sent", statusLabel: "Sent" };
    default:
      return { status: "ready", statusLabel: "Ready" };
  }
}

export function apiPromptToBuilder(
  row: RunOfShowPromptApi,
  index: number,
  timeZone: string,
): BuilderPrompt {
  const mapped = kindFromType(row.type);
  const clock = formatClock(row.scheduledAt, timeZone);
  const duration = durationParts(row.durationSeconds);
  const status = statusFromApi(row.status);
  const participation = row.scoring?.participationPoints;
  const bonus = row.scoring?.bonusPoints;
  const scoring =
    participation != null || bonus != null
      ? `Participation: ${participation ?? 0} points${bonus != null ? ` · Correct-answer bonus: ${bonus}` : ""}`
      : row.rewardPoints != null
        ? `Participation: ${row.rewardPoints} points`
        : "Participation scoring";

  return {
    id: row.id || `prompt-${index}`,
    title: row.title?.trim() || `Prompt ${index + 1}`,
    time: clock,
    kind: mapped.kind,
    kindLabel: mapped.kindLabel,
    durationLabel: duration.durationLabel,
    status: status.status,
    statusLabel: status.statusLabel,
    format: row.format?.trim() || mapped.format,
    supportingText: row.supportingText?.trim() || "",
    audience: audienceLabel(row.audience),
    duration: duration.duration,
    responseLimit: row.responseLimit?.trim() || "One response per attendee",
    moderation:
      (row.moderation ?? "").toLowerCase() === "required" ||
      (row.moderation ?? "").toLowerCase() === "on"
        ? "On · Flagged answers held for review"
        : "Off · Live results shown to the room",
    scoring,
    ctaLabel: row.ctaLabel?.trim() || "Send",
    answerPlaceholder: row.answerPlaceholder?.trim() || "Your answer",
  };
}

export function builderPromptToApi(
  prompt: BuilderPrompt,
  eventDayIso: string,
): Record<string, unknown> {
  const day = eventDayIso.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const time = /^\d{2}:\d{2}$/.test(prompt.time) ? prompt.time : "20:00";
  const scheduledAt = `${day}T${time}:00.000Z`;
  const moderationOn = prompt.moderation.toLowerCase().startsWith("on");
  const body: Record<string, unknown> = {
    type: typeFromFormat(prompt.format),
    title: prompt.title.trim() || "Untitled prompt",
    supportingText: prompt.supportingText.trim() || undefined,
    scheduledAt,
    durationSeconds: parseDurationSeconds(prompt.duration || prompt.durationLabel),
    audience: audienceApi(prompt.audience),
    moderation: moderationOn ? "required" : "none",
    responseLimit: "one_per_person",
    content: {},
  };
  if (!prompt.id.startsWith("prompt-") && !prompt.id.startsWith("local-")) {
    body.id = prompt.id;
  }
  return body;
}
