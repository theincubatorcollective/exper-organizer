import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  getEventDefaults,
  normalizeEventDefaults,
  updateEventDefaults,
} from "@/lib/server/workspace-settings";

export async function GET() {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const result = await getEventDefaults(auth.bearer);
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeEventDefaults(result.data));
}

export async function PATCH(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: Record<string, string | boolean | null> = {};
  for (const key of [
    "suggestedCountry",
    "defaultTimezone",
    "defaultCurrency",
  ] as const) {
    if (parsed.body[key] === null) body[key] = null;
    else if (typeof parsed.body[key] === "string") {
      body[key] = parsed.body[key] as string;
    }
  }
  if (typeof parsed.body.photoReviewRequired === "boolean") {
    body.photoReviewRequired = parsed.body.photoReviewRequired;
  }
  if (Object.keys(body).length === 0) {
    return Response.json(
      { message: "Provide at least one event-default field to update." },
      { status: 400 },
    );
  }

  const result = await updateEventDefaults(
    auth.bearer,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeEventDefaults(result.data));
}
