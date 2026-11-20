import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { listMembers, mapMember } from "@/lib/server/team";

export async function GET() {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const result = await listMembers(auth.bearer);
  if (!result.ok) return fromBackend(result);

  const payload = result.data;
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const total =
    payload && !Array.isArray(payload) && typeof payload.total === "number"
      ? payload.total
      : rows.length;

  return Response.json({
    data: rows.map(mapMember),
    total,
  });
}
