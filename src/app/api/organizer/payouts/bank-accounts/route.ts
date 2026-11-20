import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  createBankAccount,
  listBankAccounts,
  mapBankAccount,
} from "@/lib/server/payouts";

export async function GET() {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const result = await listBankAccounts(auth.bearer);
  if (!result.ok) return fromBackend(result);
  const rows = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.data)
      ? result.data.data
      : [];
  return Response.json({ data: rows.map(mapBankAccount) });
}

export async function POST(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const bankCode =
    typeof parsed.body.bankCode === "string" ? parsed.body.bankCode.trim() : "";
  const accountNumber =
    typeof parsed.body.accountNumber === "string"
      ? parsed.body.accountNumber.replace(/\D/g, "")
      : "";
  const currency =
    typeof parsed.body.currency === "string"
      ? parsed.body.currency.trim().toUpperCase()
      : "NGN";
  const isDefault = parsed.body.isDefault === true;

  if (!bankCode || !accountNumber) {
    return Response.json(
      { message: "bankCode and accountNumber are required." },
      { status: 400 },
    );
  }
  if (accountNumber.length !== 10) {
    return Response.json(
      { message: "Account number must be exactly 10 digits." },
      { status: 400 },
    );
  }

  const result = await createBankAccount(
    auth.bearer,
    { bankCode, accountNumber, currency, isDefault },
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);
  return Response.json(mapBankAccount(result.data ?? { currency }), {
    status: result.status || 201,
  });
}
