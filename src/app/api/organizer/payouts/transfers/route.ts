import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import { createTransfer } from "@/lib/server/payouts";

export async function POST(request: Request) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const currency =
    typeof parsed.body.currency === "string"
      ? parsed.body.currency.trim().toUpperCase()
      : "";
  const bankAccountId =
    typeof parsed.body.bankAccountId === "string"
      ? parsed.body.bankAccountId.trim()
      : "";
  const amount =
    typeof parsed.body.amount === "number"
      ? parsed.body.amount
      : typeof parsed.body.amount === "string"
        ? Number(parsed.body.amount)
        : NaN;
  const experienceId =
    typeof parsed.body.experienceId === "string"
      ? parsed.body.experienceId.trim()
      : null;

  if (!currency || !bankAccountId || !Number.isFinite(amount) || amount <= 0) {
    return Response.json(
      {
        message:
          "currency, bankAccountId and a positive amount are required.",
      },
      { status: 400 },
    );
  }

  const result = await createTransfer(
    auth.bearer,
    {
      currency,
      amount,
      bankAccountId,
      experienceId,
    },
    request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
