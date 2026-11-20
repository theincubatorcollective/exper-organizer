import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { mapMember, updateMember } from "@/lib/server/team";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { memberId } = await context.params;
  if (!memberId) {
    return Response.json({ message: "Missing member id." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: {
    role?: string;
    eventAccess?: "all" | "selected";
    experienceIds?: string[];
    permissions?: Record<string, boolean>;
  } = {};

  if (typeof parsed.body.role === "string" && parsed.body.role.trim()) {
    body.role = parsed.body.role.trim();
  }
  if (
    parsed.body.eventAccess === "all" ||
    parsed.body.eventAccess === "selected"
  ) {
    body.eventAccess = parsed.body.eventAccess;
  }
  if (Array.isArray(parsed.body.experienceIds)) {
    body.experienceIds = parsed.body.experienceIds.filter(
      (value): value is string => typeof value === "string",
    );
  }
  if (
    parsed.body.permissions &&
    typeof parsed.body.permissions === "object" &&
    !Array.isArray(parsed.body.permissions)
  ) {
    const permissions: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(
      parsed.body.permissions as Record<string, unknown>,
    )) {
      if (typeof value === "boolean") permissions[key] = value;
    }
    body.permissions = permissions;
  }

  if (Object.keys(body).length === 0) {
    return Response.json(
      { message: "Provide role, eventAccess, or permissions to update." },
      { status: 400 },
    );
  }

  const result = await updateMember(
    auth.bearer,
    memberId,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(mapMember(result.data ?? { id: memberId }));
}
