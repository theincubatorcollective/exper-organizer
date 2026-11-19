import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  createExperience,
  normalizeExperienceId,
  type CreateExperienceBody,
} from "@/lib/server/ticket-types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const title = asString(parsed.body.title);
  const category = asString(parsed.body.category);
  const city = asString(parsed.body.city);
  const venueName = asString(parsed.body.venueName);
  const startsAt = asString(parsed.body.startsAt);
  const endsAt = asString(parsed.body.endsAt);
  const capacity = asNumber(parsed.body.capacity);

  if (!title || !category || !city || !venueName || !startsAt || !endsAt || capacity === null) {
    return Response.json(
      {
        message:
          "title, category, city, venueName, startsAt, endsAt and capacity are required.",
      },
      { status: 400 },
    );
  }

  const body: CreateExperienceBody = {
    title,
    category,
    city,
    venueName,
    startsAt,
    endsAt,
    capacity,
  };

  const result = await createExperience(
    auth.bearer,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);

  const id = normalizeExperienceId(result.data);
  if (!id) {
    return Response.json(
      { message: "Experience was created but no id was returned." },
      { status: 502 },
    );
  }

  return Response.json({ id, ...(typeof result.data === "object" ? result.data : {}) }, {
    status: result.status === 201 ? 201 : 200,
  });
}
