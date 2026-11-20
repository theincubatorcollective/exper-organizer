import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { resolveBankAccount } from "@/lib/server/payouts";

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
  return fromBackend(result);
}
