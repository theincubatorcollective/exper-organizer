import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { getRunOfShow, putRunOfShow } from "@/lib/server/run-of-show";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const result = await getRunOfShow(auth.bearer, experienceId);
  return fromBackend(result);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const prompts = Array.isArray(parsed.body.prompts) ? parsed.body.prompts : null;
  if (!prompts) {
    return Response.json({ message: "prompts array is required." }, { status: 400 });
  }

  const result = await putRunOfShow(auth.bearer, experienceId, {
    prompts: prompts as Record<string, unknown>[],
  });
  return fromBackend(result);
}
