import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  getOrganisationProfile,
  normalizeOrganisation,
  updateOrganisationProfile,
} from "@/lib/server/workspace-settings";

export async function GET() {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const result = await getOrganisationProfile(auth.bearer);
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeOrganisation(result.data));
}

export async function PATCH(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: Record<string, string> = {};
  for (const key of [
    "name",
    "legalName",
    "contactEmail",
    "supportWebsite",
  ] as const) {
    if (typeof parsed.body[key] === "string") {
      body[key] = parsed.body[key] as string;
    }
  }
  if (Object.keys(body).length === 0) {
    return Response.json(
      {
        message:
          "Provide name, legalName, contactEmail or supportWebsite to update.",
      },
      { status: 400 },
    );
  }

  const result = await updateOrganisationProfile(
    auth.bearer,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(normalizeOrganisation(result.data, body.name));
}
