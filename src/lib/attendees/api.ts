import type { CheckInOutcome } from "./types";

type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type CheckInResult = {
  outcome?: CheckInOutcome;
  message?: string;
};

export async function checkInGuest(
  experienceId: string,
  code: string,
): Promise<ApiResult<CheckInResult>> {
  let response: Response;
  try {
    response = await fetch(
      `/api/organizer/experiences/${experienceId}/check-in`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
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
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : "Something went wrong. Try again.";
    return { ok: false, status: response.status, message };
  }

  return { ok: true, status: response.status, data: (parsed ?? {}) as CheckInResult };
}

export function outcomeMessage(result: CheckInResult): string {
  switch (result.outcome) {
    case "admitted":
      return "Admitted.";
    case "already_used":
      return "This pass was already checked in.";
    case "cancelled":
      return "This pass is cancelled.";
    case "wrong_experience":
      return "This pass belongs to a different experience.";
    case "not_found":
      return "Pass not found.";
    default:
      return result.message ?? "Check-in complete.";
  }
}
