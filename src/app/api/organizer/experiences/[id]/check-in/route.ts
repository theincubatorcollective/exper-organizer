import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { checkInPass } from "@/lib/server/attendees";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const code =
    typeof parsed.body.code === "string" ? parsed.body.code.trim() : "";
  if (!code) {
    return Response.json({ message: "code is required." }, { status: 400 });
  }

  const result = await checkInPass(
    auth.bearer,
    experienceId,
    code,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
