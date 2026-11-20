import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  getSecurity,
  normalizeSecurity,
  updateSecurity,
} from "@/lib/server/workspace-settings";

export async function GET() {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const result = await getSecurity(auth.bearer);
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeSecurity(result.data));
}

export async function PATCH(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: { signInAlerts?: boolean; twoFactorEnabled?: boolean } = {};
  if (typeof parsed.body.signInAlerts === "boolean") {
    body.signInAlerts = parsed.body.signInAlerts;
  }
  if (typeof parsed.body.twoFactorEnabled === "boolean") {
    body.twoFactorEnabled = parsed.body.twoFactorEnabled;
  }
  if (Object.keys(body).length === 0) {
    return Response.json(
      { message: "Provide signInAlerts or twoFactorEnabled to update." },
      { status: 400 },
    );
  }

  const result = await updateSecurity(
    auth.bearer,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeSecurity(result.data));
}
