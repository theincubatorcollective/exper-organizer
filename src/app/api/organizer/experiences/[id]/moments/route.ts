import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { listMoments, startMoment } from "@/lib/server/live-control";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const result = await listMoments(auth.bearer, experienceId);
  return fromBackend(result);
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  if (typeof parsed.body.type !== "string" || !parsed.body.type.trim()) {
    return Response.json({ message: "type is required." }, { status: 400 });
  }

  const result = await startMoment(
    auth.bearer,
    experienceId,
    parsed.body,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
