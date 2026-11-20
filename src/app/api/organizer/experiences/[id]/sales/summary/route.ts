import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { getSalesSummary } from "@/lib/server/sales";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const result = await getSalesSummary(
    auth.bearer,
    experienceId,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
