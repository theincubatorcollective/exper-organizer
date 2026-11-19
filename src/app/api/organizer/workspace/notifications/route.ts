import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  getNotifications,
  normalizeNotifications,
  updateNotifications,
} from "@/lib/server/workspace-settings";

export async function GET() {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const result = await getNotifications(auth.bearer);
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeNotifications(result.data));
}

export async function PATCH(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: Record<string, boolean | number> = {};
  for (const key of [
    "liveIncidentAlerts",
    "payoutUpdates",
    "dailySummary",
  ] as const) {
    if (typeof parsed.body[key] === "boolean") {
      body[key] = parsed.body[key] as boolean;
    }
  }
  if (typeof parsed.body.dailySummaryHourLocal === "number") {
    body.dailySummaryHourLocal = parsed.body.dailySummaryHourLocal;
  }
  if (Object.keys(body).length === 0) {
    return Response.json(
      { message: "Provide at least one notification field to update." },
      { status: 400 },
    );
  }

  const result = await updateNotifications(
    auth.bearer,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeNotifications(result.data));
}
