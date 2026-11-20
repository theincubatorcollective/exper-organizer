import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { pauseLiveEvent } from "@/lib/server/live-control";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const result = await pauseLiveEvent(
    auth.bearer,
    id,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
