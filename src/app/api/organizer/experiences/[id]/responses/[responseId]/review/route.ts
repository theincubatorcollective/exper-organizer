import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { reviewResponse } from "@/lib/server/live-control";

type Params = { params: Promise<{ id: string; responseId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId, responseId } = await params;
  if (!experienceId || !responseId) {
    return Response.json(
      { message: "experienceId and responseId are required." },
      { status: 400 },
    );
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  if (typeof parsed.body.approved !== "boolean") {
    return Response.json(
      { message: "approved boolean is required." },
      { status: 400 },
    );
  }

  const result = await reviewResponse(
    auth.bearer,
    experienceId,
    responseId,
    parsed.body.approved,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
