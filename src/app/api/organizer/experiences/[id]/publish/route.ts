import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { publishExperience } from "@/lib/server/experiences";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const result = await publishExperience(
    auth.bearer,
    experienceId,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
