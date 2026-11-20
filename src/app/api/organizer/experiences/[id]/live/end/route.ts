import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { endLiveEvent } from "@/lib/server/live-control";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const confirm = parsed.body.confirm === true;
  const result = await endLiveEvent(
    auth.bearer,
    id,
    confirm,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
