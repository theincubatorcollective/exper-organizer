type ApiFailure = { ok: false; status: number; message: string };
type ApiSuccess<T> = { ok: true; status: number; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function payoutFetch<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/organizer/payouts${path}`, init);
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Couldn't reach the server. Try again.",
    };
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!response.ok) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { message?: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : Array.isArray((parsed as { message?: unknown })?.message)
          ? ((parsed as { message: string[] }).message[0] ?? fallbackMessage)
          : fallbackMessage;
    return { ok: false, status: response.status, message };
  }

  return { ok: true, status: response.status, data: (parsed ?? {}) as T };
}

export function resolvePayoutBank(body: {
  bankCode: string;
  accountNumber: string;
}) {
  return payoutFetch<{
    bankName?: string;
    accountName?: string;
    last4?: string;
  }>("/bank-accounts/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, "Couldn't resolve that account.");
}

export function addPayoutBankAccount(body: {
  bankCode: string;
  accountNumber: string;
  currency: string;
  isDefault?: boolean;
}) {
  return payoutFetch("/bank-accounts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, "Couldn't add that bank account.");
}

export function setDefaultPayoutBank(bankAccountId: string) {
  return payoutFetch(`/bank-accounts/${bankAccountId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ isDefault: true }),
  }, "Couldn't update that bank account.");
}

export function createPayoutTransfer(body: {
  currency: string;
  amount: number;
  bankAccountId: string;
  experienceId?: string | null;
}) {
  return payoutFetch("/transfers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, "Couldn't create that transfer.");
}
