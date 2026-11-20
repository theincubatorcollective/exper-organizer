import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { inviteMember, mapMember } from "@/lib/server/team";

export async function POST(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const email =
    typeof parsed.body.email === "string" ? parsed.body.email.trim() : "";
  const role =
    typeof parsed.body.role === "string" ? parsed.body.role.trim() : "";
  const eventAccess =
    parsed.body.eventAccess === "selected" ? "selected" : "all";
  const experienceIds = Array.isArray(parsed.body.experienceIds)
    ? parsed.body.experienceIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  if (!email || !email.includes("@")) {
    return Response.json(
      { message: "Enter a valid email address." },
      { status: 400 },
    );
  }
  if (!role) {
    return Response.json({ message: "Choose a role." }, { status: 400 });
  }

  const result = await inviteMember(
    auth.bearer,
    { email, role, eventAccess, experienceIds },
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(mapMember(result.data ?? { email, role }), {
    status: result.status || 201,
  });
}
