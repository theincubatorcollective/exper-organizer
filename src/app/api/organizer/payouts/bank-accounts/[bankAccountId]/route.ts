import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { mapBankAccount, updateBankAccount } from "@/lib/server/payouts";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bankAccountId: string }> },
) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { bankAccountId } = await context.params;
  if (!bankAccountId) {
    return Response.json({ message: "Missing bank account id." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: { isDefault?: boolean } = {};
  if (typeof parsed.body.isDefault === "boolean") {
    body.isDefault = parsed.body.isDefault;
  }
  if (Object.keys(body).length === 0) {
    return Response.json(
      { message: "Provide isDefault to update." },
      { status: 400 },
    );
  }

  const result = await updateBankAccount(
    auth.bearer,
    bankAccountId,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(
    mapBankAccount(result.data ?? { id: bankAccountId, isDefault: body.isDefault }),
  );
}
