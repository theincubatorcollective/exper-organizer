import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { listMomentsGallery } from "@/lib/server/moments-gallery";
import type { MomentTab } from "@/lib/moments/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") || "pending";
  const status = (
    ["pending", "approved", "rejected", "all"].includes(statusParam)
      ? statusParam
      : "pending"
  ) as MomentTab | "all";
  const page = Number(url.searchParams.get("page") || "1") || 1;
  const limit = Number(url.searchParams.get("limit") || "20") || 20;

  const result = await listMomentsGallery(
    auth.bearer,
    experienceId,
    status,
    page,
    limit,
  );
  return fromBackend(result);
}
