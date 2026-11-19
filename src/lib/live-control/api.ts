type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function organizerFetch<T>(
  path: string,
  init: { method: "POST" | "GET" | "DELETE"; body?: unknown } = {
    method: "GET",
  },
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/organizer${path}`, {
      method: init.method,
      headers:
        init.body === undefined
          ? undefined
          : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Couldn't reach the server. Try again.",
    };
  }

  if (response.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
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

  return { ok: true, status: response.status, data: parsed as T };
}

export function closeLiveMoment(experienceId: string, momentId: string) {
  return organizerFetch(
    `/experiences/${experienceId}/moments/${momentId}/close`,
    { method: "POST", body: {} },
  );
}

export function startLiveMoment(
  experienceId: string,
  body: Record<string, unknown>,
) {
  return organizerFetch(`/experiences/${experienceId}/moments`, {
    method: "POST",
    body,
  });
}
