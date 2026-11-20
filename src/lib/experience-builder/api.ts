import type { BuilderPrompt } from "./types";

type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export async function saveRunOfShow(
  experienceId: string,
  prompts: Record<string, unknown>[],
): Promise<ApiResult<unknown>> {
  let response: Response;
  try {
    response = await fetch(
      `/api/organizer/experiences/${experienceId}/run-of-show`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompts }),
      },
    );
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
        : "Couldn't save the run of show.";
    return { ok: false, status: response.status, message };
  }

  return { ok: true, status: response.status, data: parsed };
}

export function newLocalPrompt(): BuilderPrompt {
  const id = `local-${crypto.randomUUID()}`;
  return {
    id,
    title: "New prompt",
    time: "21:00",
    kind: "poll",
    kindLabel: "Poll",
    durationLabel: "2 min",
    status: "ready",
    statusLabel: "Ready",
    format: "Multiple choice",
    supportingText: "",
    audience: "All checked-in attendees",
    duration: "02:00 minutes",
    responseLimit: "One response per attendee",
    moderation: "Off · Live results shown to the room",
    scoring: "Participation: 5 points",
    ctaLabel: "Send",
    answerPlaceholder: "Your answer",
  };
}
