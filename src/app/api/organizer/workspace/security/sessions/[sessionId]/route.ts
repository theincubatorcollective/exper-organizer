import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { revokeSecuritySession } from "@/lib/server/workspace-settings";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { sessionId } = await context.params;
  if (!sessionId) {
    return Response.json({ message: "Missing session id." }, { status: 400 });
  }

  const result = await revokeSecuritySession(
    auth.bearer,
    sessionId,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
