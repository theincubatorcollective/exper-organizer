import { formatMoney } from "@/lib/sales/format";
import type {
  CurrencyBalance,
  PayoutBankAccount,
  PayoutBankOption,
  PayoutDatePreset,
  PayoutExperienceOption,
  PayoutMetric,
  PayoutsData,
  TransferHistoryItem,
} from "@/lib/payouts/types";
import { backendFetch } from "./backend";
import {
  experiencesFrom,
  getWorkspace,
  listExperiences,
  normalizeWorkspace,
} from "./organizer";
import { readToken, toFailure, type Failure } from "./overview";

export type PayoutsResult = { ok: true; data: PayoutsData } | Failure;

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

const FALLBACK_CURRENCIES = ["NGN", "GBP", "GHS", "KES", "USD", "EUR"];

const FLAGS: Record<string, string> = {
  NGN: "🇳🇬",
  GBP: "🇬🇧",
  GHS: "🇬🇭",
  KES: "🇰🇪",
  USD: "🇺🇸",
  EUR: "🇪🇺",
};

export type PayoutSummaryResponse = {
  currency?: string | null;
  payoutsEnabled?: boolean | null;
  available?: number | null;
  pendingSettlement?: number | null;
  pendingDetail?: string | null;
  transferredInPeriod?: number | null;
  transferredCount?: number | null;
};

export type BalanceApiRow = {
  currency?: string | null;
  country?: string | null;
  available?: number | null;
  pending?: number | null;
  bankLabel?: string | null;
  payoutSupported?: boolean | null;
  needsAttention?: boolean | null;
};

export type BankAccountApiRow = {
  id?: string;
  label?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumberMasked?: string | null;
  last4?: string | null;
  currency?: string | null;
  isDefault?: boolean | null;
  status?: string | null;
};

export type BankCatalogRow = {
  name?: string | null;
  code?: string | null;
};

export type TransferApiRow = {
  id?: string;
  reference?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  bankLabel?: string | null;
  createdAt?: string | null;
};

export type ResolveBankResponse = {
  bankName?: string | null;
  accountName?: string | null;
  last4?: string | null;
};

export type PayoutFilters = {
  from?: string | null;
  to?: string | null;
  experienceId?: string | null;
  datePreset?: PayoutDatePreset | null;
};

function asList<T>(payload: T[] | { data?: T[] } | undefined | null): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function asFinite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function resolveDateRange(
  preset: PayoutDatePreset | null | undefined,
  now = new Date(),
): { from: string | null; to: string | null; label: string; preset: PayoutDatePreset } {
  if (preset === "month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return {
      from: isoDate(from),
      to: isoDate(now),
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(now),
      preset: "month",
    };
  }
  if (preset === "last30") {
    const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    return {
      from: isoDate(from),
      to: isoDate(now),
      label: "Last 30 days",
      preset: "last30",
    };
  }
  return { from: null, to: null, label: "All time", preset: "all" };
}

export function getPayoutSummary(
  bearer: string,
  currency: string,
  filters?: PayoutFilters,
  userAgent?: string | null,
) {
  const params = new URLSearchParams({ currency: currency.toUpperCase() });
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.experienceId) params.set("experienceId", filters.experienceId);
  return backendFetch<PayoutSummaryResponse>(
    `/organizer/payouts/summary?${params}`,
    { bearer, userAgent },
  );
}

export function listPayoutBalances(bearer: string, userAgent?: string | null) {
  return backendFetch<{ payoutsEnabled?: boolean; data?: BalanceApiRow[] }>(
    "/organizer/payouts/balances",
    { bearer, userAgent },
  );
}

export function listBankAccounts(bearer: string, userAgent?: string | null) {
  return backendFetch<BankAccountApiRow[] | { data?: BankAccountApiRow[] }>(
    "/organizer/payouts/bank-accounts",
    { bearer, userAgent },
  );
}

export function listBanks(bearer: string, currency: string, userAgent?: string | null) {
  const params = new URLSearchParams({ currency: currency.toUpperCase() });
  return backendFetch<BankCatalogRow[] | { data?: BankCatalogRow[] }>(
    `/organizer/payouts/banks?${params}`,
    { bearer, userAgent },
  );
}

export function resolveBankAccount(
  bearer: string,
  body: { bankCode: string; accountNumber: string },
  userAgent?: string | null,
) {
  return backendFetch<ResolveBankResponse>(
    "/organizer/payouts/bank-accounts/resolve",
    { method: "POST", body, bearer, userAgent },
  );
}

export function createBankAccount(
  bearer: string,
  body: {
    bankCode: string;
    accountNumber: string;
    currency: string;
    isDefault?: boolean;
  },
  userAgent?: string | null,
) {
  return backendFetch<BankAccountApiRow>(
    "/organizer/payouts/bank-accounts",
    { method: "POST", body, bearer, userAgent },
  );
}

export function updateBankAccount(
  bearer: string,
  bankAccountId: string,
  body: { isDefault?: boolean },
  userAgent?: string | null,
) {
  return backendFetch<BankAccountApiRow>(
    `/organizer/payouts/bank-accounts/${bankAccountId}`,
    { method: "PATCH", body, bearer, userAgent },
  );
}

export function createTransfer(
  bearer: string,
  body: {
    currency: string;
    amount: number;
    bankAccountId: string;
    experienceId?: string | null;
  },
  userAgent?: string | null,
) {
  return backendFetch(
    "/organizer/payouts/transfers",
    { method: "POST", body, bearer, userAgent },
  );
}

export function listTransfers(
  bearer: string,
  currency: string,
  page = 1,
  limit = 20,
  userAgent?: string | null,
) {
  const params = new URLSearchParams({
    currency: currency.toUpperCase(),
    page: String(page),
    limit: String(limit),
  });
  return backendFetch<{
    data?: TransferApiRow[];
    page?: number;
    limit?: number;
    total?: number;
  }>(`/organizer/payouts/transfers?${params}`, { bearer, userAgent });
}

export function bankAccountLabel(row: BankAccountApiRow): string {
  if (row.label?.trim()) return row.label.trim();
  const masked =
    row.accountNumberMasked?.trim() ||
    (row.last4 ? `•••• ${row.last4}` : null);
  const parts = [
    row.accountName?.trim() || null,
    row.bankName?.trim() || null,
    masked,
  ].filter(Boolean);
  return parts.join(" · ") || "Bank account";
}

export function mapBankAccount(row: BankAccountApiRow): PayoutBankAccount {
  return {
    id: row.id || bankAccountLabel(row),
    label: bankAccountLabel(row),
    currency: (row.currency ?? "NGN").toUpperCase(),
    isDefault: Boolean(row.isDefault),
    status: (row.status ?? "verified").toLowerCase(),
  };
}

export function mapBankOption(row: BankCatalogRow): PayoutBankOption | null {
  const code = row.code?.trim();
  const name = row.name?.trim();
  if (!code || !name) return null;
  return { code, name };
}

export function mapBalance(row: BalanceApiRow): CurrencyBalance {
  const code = (row.currency ?? "NGN").toUpperCase();
  const available = asFinite(row.available);
  const needsAttention = Boolean(row.needsAttention) || !row.bankLabel;
  let detail = row.bankLabel?.trim() || "Bank verification needed";
  if (!row.bankLabel && available === 0 && asFinite(row.pending) === 0) {
    detail = needsAttention
      ? "Bank verification needed"
      : "No settled sales yet";
  }
  return {
    id: code,
    flag: FLAGS[code] ?? "🏳️",
    code,
    country: row.country?.trim() || code,
    amount: formatMoney(available, code),
    detail,
    needsAttention,
  };
}

export function mapTransfer(
  row: TransferApiRow,
  timeZone = "UTC",
): TransferHistoryItem {
  const currency = (row.currency ?? "NGN").toUpperCase();
  const status = (row.status ?? "pending").toLowerCase();
  const statusLabel =
    status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
  const reference = row.reference?.trim() || row.id?.slice(0, 8) || "Transfer";
  const when = formatTransferDate(row.createdAt, timeZone);
  const bank = row.bankLabel?.trim() || "Bank account";
  return {
    id: row.id || `${reference}-${row.createdAt ?? ""}`,
    primary: `${reference} · ${statusLabel}`,
    amount: formatMoney(asFinite(row.amount), currency),
    detail: `${when} · ${bank}`,
  };
}

function formatTransferDate(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(at);
}

function periodLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long" }).format(now);
}

export function buildPayoutsData(input: {
  currency: string;
  summary: PayoutSummaryResponse | null;
  balances: BalanceApiRow[];
  banks: BankAccountApiRow[];
  bankCatalog: BankCatalogRow[];
  transfers: TransferApiRow[];
  experiences: PayoutExperienceOption[];
  filters: {
    from: string | null;
    to: string | null;
    experienceId: string | null;
    datePreset: PayoutDatePreset;
    dateLabel: string;
  };
  workspaceName?: string | null;
  now?: Date;
}): PayoutsData {
  const currency = input.currency.toUpperCase();
  const summary = input.summary ?? {};
  const available = asFinite(summary.available);
  const pending = asFinite(summary.pendingSettlement);
  const transferred = asFinite(summary.transferredInPeriod);
  const transferredCount = asFinite(summary.transferredCount);
  const enabled = summary.payoutsEnabled === true;
  const month = periodLabel(input.now);

  const mappedBanks = input.banks.map(mapBankAccount);
  const currencyBanks = mappedBanks.filter((row) => row.currency === currency);
  const defaultBank =
    currencyBanks.find((row) => row.isDefault) ?? currencyBanks[0] ?? null;

  const selectedExperience = input.experiences.find(
    (row) => row.id === input.filters.experienceId,
  );

  const balanceCodes = input.balances
    .map((row) => (row.currency ?? "").toUpperCase())
    .filter(Boolean);
  const currencies = [
    ...new Set(
      balanceCodes.length > 0
        ? [...balanceCodes, currency]
        : [...FALLBACK_CURRENCIES, currency],
    ),
  ];

  const metrics: PayoutMetric[] = [
    {
      label: `Available ${currency}`,
      value: formatMoney(available, currency),
      detail: enabled ? "eligible for transfer" : "payouts not enabled yet",
    },
    {
      label: "Pending settlement",
      value: formatMoney(pending, currency),
      detail: summary.pendingDetail?.trim() || "Awaiting settlement",
    },
    {
      label: `Transferred in ${month}`,
      value: formatMoney(transferred, currency),
      detail:
        transferredCount > 0
          ? `${transferredCount.toLocaleString("en-GB")} completed transfer${
              transferredCount === 1 ? "" : "s"
            }`
          : "No transfers in this period",
    },
  ];

  const balances = input.balances.map(mapBalance);
  if (!balances.some((row) => row.code === currency) && input.summary) {
    balances.unshift({
      id: currency,
      flag: FLAGS[currency] ?? "🏳️",
      code: currency,
      country: currency,
      amount: formatMoney(available, currency),
      detail: enabled ? "No bank linked" : "Payouts not enabled yet",
      needsAttention: true,
    });
  }

  const bankOptions = input.bankCatalog
    .map(mapBankOption)
    .filter((row): row is PayoutBankOption => Boolean(row));

  return {
    eventMeta: input.workspaceName
      ? `${input.workspaceName} · Balances are separated by currency. No conversion or mixed-currency totals.`
      : "Balances are separated by currency. No conversion or mixed-currency totals.",
    currencies,
    activeCurrency: currency,
    eventFilter: selectedExperience
      ? selectedExperience.title
      : `All ${currency} events`,
    dateFilter: input.filters.dateLabel,
    filters: {
      from: input.filters.from,
      to: input.filters.to,
      experienceId: input.filters.experienceId,
      datePreset: input.filters.datePreset,
    },
    metrics,
    transfer: {
      fromBalance: `${currency} — Available ${formatMoney(available, currency)}`,
      bankAccount: defaultBank?.label ?? "No verified bank account",
      bankAccountId: defaultBank?.id ?? null,
      amount: formatMoney(available, currency),
      availableAmount: available,
      footnote: enabled
        ? "No FX conversion. A transfer confirmation is required before funds leave this balance."
        : "Payouts are not enabled for this workspace yet. You can still add banks; transfers will stay blocked until payouts are switched on.",
    },
    history: input.transfers.map((row) => mapTransfer(row)),
    balances,
    bankAccounts: mappedBanks,
    bankOptions,
    experiences: input.experiences,
    payoutsEnabled: enabled,
    exportAvailable: false,
  };
}

export async function getPayouts(options?: {
  currency?: string | null;
  from?: string | null;
  to?: string | null;
  experienceId?: string | null;
  datePreset?: PayoutDatePreset | null;
  now?: Date;
}): Promise<PayoutsResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const currency = (options?.currency?.trim() || "NGN").toUpperCase();
  const now = options?.now ?? new Date();
  const range =
    options?.from || options?.to
      ? {
          from: options.from ?? null,
          to: options.to ?? null,
          label:
            options.from && options.to
              ? `${options.from} → ${options.to}`
              : options.from || options.to || "Custom range",
          preset: (options.datePreset ?? "all") as PayoutDatePreset,
        }
      : resolveDateRange(options?.datePreset ?? "all", now);

  const filters: PayoutFilters = {
    from: range.from,
    to: range.to,
    experienceId: options?.experienceId ?? null,
    datePreset: range.preset,
  };

  const [
    summaryResult,
    balancesResult,
    banksResult,
    catalogResult,
    transfersResult,
    experiencesResult,
    workspaceResult,
  ] = await Promise.all([
    getPayoutSummary(bearer, currency, filters),
    listPayoutBalances(bearer),
    listBankAccounts(bearer),
    listBanks(bearer, currency),
    listTransfers(bearer, currency),
    listExperiences(bearer),
    getWorkspace(bearer),
  ]);

  if (!summaryResult.ok) return toFailure(summaryResult);
  if (!balancesResult.ok) return toFailure(balancesResult);
  if (!banksResult.ok) return toFailure(banksResult);
  if (!transfersResult.ok) return toFailure(transfersResult);

  const experiences: PayoutExperienceOption[] = experiencesResult.ok
    ? experiencesFrom(experiencesResult).map((event) => ({
        id: event.id,
        title: event.title,
      }))
    : [];

  const workspaceName = workspaceResult.ok
    ? normalizeWorkspace(workspaceResult.data)?.name ?? null
    : null;

  return {
    ok: true,
    data: buildPayoutsData({
      currency,
      summary: summaryResult.data,
      balances: asList(balancesResult.data),
      banks: asList(banksResult.data),
      bankCatalog: catalogResult.ok ? asList(catalogResult.data) : [],
      transfers: asList(transfersResult.data),
      experiences,
      filters: {
        from: range.from,
        to: range.to,
        experienceId: filters.experienceId ?? null,
        datePreset: range.preset,
        dateLabel: range.label,
      },
      workspaceName,
      now,
    }),
  };
}
