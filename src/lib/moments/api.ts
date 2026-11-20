type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export async function reviewMomentSubmission(
  experienceId: string,
  responseId: string,
  approved: boolean,
): Promise<ApiResult<unknown>> {
  let response: Response;
  try {
    response = await fetch(
      `/api/organizer/experiences/${experienceId}/responses/${responseId}/review`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved }),
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
        : "Couldn't update that submission.";
    return { ok: false, status: response.status, message };
  }

  return { ok: true, status: response.status, data: parsed };
}
