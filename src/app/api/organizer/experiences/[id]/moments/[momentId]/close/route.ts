import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { closeMoment } from "@/lib/server/live-control";

type Params = { params: Promise<{ id: string; momentId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId, momentId } = await params;
  if (!experienceId || !momentId) {
    return Response.json(
      { message: "experienceId and momentId are required." },
      { status: 400 },
    );
  }

  const result = await closeMoment(
    auth.bearer,
    experienceId,
    momentId,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
