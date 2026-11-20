import { fromBackend, requireBearer } from "@/lib/server/organizer-api";
import { listSalesLedgers } from "@/lib/server/sales";

export async function GET(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const result = await listSalesLedgers(
    auth.bearer,
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
