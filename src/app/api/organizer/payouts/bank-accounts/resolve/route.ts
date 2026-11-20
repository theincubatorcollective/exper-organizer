import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  normalizeResolveBankResponse,
  resolveBankAccount,
} from "@/lib/server/payouts";

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

  const result = await resolveBankAccount(
    auth.bearer,
    { bankCode, accountNumber },
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);

  const normalized = normalizeResolveBankResponse(result.data);
  if (!normalized.accountName) {
    return Response.json(
      {
        message:
          "Account lookup returned no name. Check the bank and account number, or try again.",
      },
      { status: 502 },
    );
  }
  return Response.json(normalized, { status: result.status });
}
