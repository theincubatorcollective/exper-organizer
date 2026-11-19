import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  getExperience,
  updateExperience,
  type UpdateExperienceBody,
} from "@/lib/server/experiences";

type Params = { params: Promise<{ id: string }> };

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export async function GET(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const result = await getExperience(
    auth.bearer,
    experienceId,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: UpdateExperienceBody = {
    title: asString(parsed.body.title),
    summary: asString(parsed.body.summary),
    description: asString(parsed.body.description),
    category: asString(parsed.body.category),
    city: asString(parsed.body.city),
    country: asString(parsed.body.country),
    venueName: asString(parsed.body.venueName),
    address: asString(parsed.body.address),
    startsAt: asString(parsed.body.startsAt),
    endsAt: asString(parsed.body.endsAt),
    timezone: asString(parsed.body.timezone),
    currency: asString(parsed.body.currency),
    capacity: asNumber(parsed.body.capacity),
    showVenueBeforePurchase: asBoolean(parsed.body.showVenueBeforePurchase),
    refundPolicy: asString(parsed.body.refundPolicy),
    status: asString(parsed.body.status),
  };

  const hasField = Object.values(body).some((value) => value !== undefined);
  if (!hasField) {
    return Response.json(
      { message: "Provide at least one field to update." },
      { status: 400 },
    );
  }

  const result = await updateExperience(
    auth.bearer,
    experienceId,
    body,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
