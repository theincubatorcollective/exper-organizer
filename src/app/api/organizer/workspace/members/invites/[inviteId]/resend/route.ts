import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { resendInvite } from "@/lib/server/team";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { inviteId } = await context.params;
  if (!inviteId) {
    return Response.json({ message: "Missing invite id." }, { status: 400 });
  }

  const result = await resendInvite(
    auth.bearer,
    inviteId,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
