import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { resumeLiveEvent } from "@/lib/server/live-control";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const result = await resumeLiveEvent(
    auth.bearer,
    id,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
