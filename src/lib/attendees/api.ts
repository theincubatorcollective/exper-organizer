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

export type GuestExportFilters = {
  q?: string;
  status?: "all" | "pending" | "checked_in";
};

/** Downloads CSV (or follows a signed `{ url }`) from the guests export BFF. */
export async function exportGuestList(
  experienceId: string,
  filters: GuestExportFilters = {},
): Promise<ApiResult<{ filename: string }>> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  const query = params.toString();
  const path = `/api/organizer/experiences/${experienceId}/guests/export${
    query ? `?${query}` : ""
  }`;

  let response: Response;
  try {
    response = await fetch(path);
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Couldn't reach the server. Try again.",
    };
  }

  if (!response.ok) {
    let message = "Couldn't export the guest list.";
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // keep default
    }
    return { ok: false, status: response.status, message };
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    let parsed: { url?: string; message?: string };
    try {
      parsed = (await response.json()) as { url?: string; message?: string };
    } catch {
      return {
        ok: false,
        status: 502,
        message: "Couldn't read the export response.",
      };
    }
    if (typeof parsed.url === "string" && parsed.url) {
      window.open(parsed.url, "_blank", "noopener,noreferrer");
      return { ok: true, status: response.status, data: { filename: "guests.csv" } };
    }
    return {
      ok: false,
      status: 502,
      message: parsed.message || "Export did not return a download.",
    };
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const filename = `guests-${experienceId}.csv`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return { ok: true, status: response.status, data: { filename } };
}
