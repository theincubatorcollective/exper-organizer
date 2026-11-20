"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/auth/Button";
import { Card } from "@/components/overview/Card";
import { formatMoney } from "@/lib/sales/format";
import {
  addPayoutBankAccount,
  createPayoutTransfer,
  resolvePayoutBank,
  setDefaultPayoutBank,
} from "@/lib/payouts/api";
import type { PayoutDatePreset, PayoutsData } from "@/lib/payouts/types";

const DATE_OPTIONS: { value: PayoutDatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "last30", label: "Last 30 days" },
];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function Payouts({ data }: { data: PayoutsData }) {
  const router = useRouter();
  const currency = data.activeCurrency;
  const currencyBanks = useMemo(
    () => data.bankAccounts.filter((row) => row.currency === currency),
    [data.bankAccounts, currency],
  );
  const sortedBanks = useMemo(
    () =>
      [...data.bankOptions].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [data.bankOptions],
  );

  const [bankAccountId, setBankAccountId] = useState(
    data.transfer.bankAccountId ?? currencyBanks[0]?.id ?? null,
  );
  const [amountInput, setAmountInput] = useState(
    String(data.transfer.availableAmount || ""),
  );
  const [confirming, setConfirming] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankMenuOpen, setBankMenuOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [resolvedOk, setResolvedOk] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [eventFilterId, setEventFilterId] = useState(
    data.filters.experienceId ?? "",
  );
  const [datePreset, setDatePreset] = useState<PayoutDatePreset>(
    data.filters.datePreset,
  );
  const lookupKeyRef = useRef<string | null>(null);

  const selectedBank =
    currencyBanks.find((row) => row.id === bankAccountId) ??
    currencyBanks[0] ??
    null;

  const selectedCatalogBank = useMemo(
    () => sortedBanks.find((bank) => bank.code === bankCode) ?? null,
    [bankCode, sortedBanks],
  );

  const filteredBanks = useMemo(() => {
    const query = bankQuery.trim().toLowerCase();
    if (!query) return sortedBanks.slice(0, 12);
    return sortedBanks
      .filter(
        (bank) =>
          bank.name.toLowerCase().includes(query) ||
          bank.code.toLowerCase().includes(query),
      )
      .slice(0, 12);
  }, [bankQuery, sortedBanks]);

  function clearLookup() {
    setAccountName(null);
    setResolvedOk(false);
    setBankError(null);
    lookupKeyRef.current = null;
  }

  function pickBank(code: string, name: string) {
    setBankCode(code);
    setBankQuery(name);
    setBankMenuOpen(false);
    clearLookup();
  }

  async function lookupAccount(code: string, account: string) {
    const key = `${code}:${account}`;
    if (lookupKeyRef.current === key) return;
    lookupKeyRef.current = key;
    setBusy("resolve");
    setBankError(null);
    setAccountName(null);
    setResolvedOk(false);

    const result = await resolvePayoutBank({
      bankCode: code,
      accountNumber: account,
    });
    setBusy(null);

    // Ignore stale responses if the user changed inputs.
    if (lookupKeyRef.current !== key) return;

    if (!result.ok) {
      setBankError(
        result.message.includes("could not find") ||
          result.message.includes("not find that account")
          ? `${result.message} Make sure the bank matches the account (OPay vs bank, etc.). This check comes from the payment provider.`
          : result.message,
      );
      return;
    }

    setResolvedOk(true);
    setAccountName(result.data.accountName?.trim() || "Account found");
    setMessage(null);
  }

  useEffect(() => {
    if (!manageOpen) return;
    const account = digitsOnly(accountNumber);
    if (!bankCode || account.length !== 10) return;
    const timer = window.setTimeout(() => {
      void lookupAccount(bankCode, account);
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lookupAccount closes over latest setters
  }, [manageOpen, bankCode, accountNumber]);

  function buildHref(patch: {
    currency?: string;
    experienceId?: string | null;
    datePreset?: PayoutDatePreset;
  }) {
    const params = new URLSearchParams();
    params.set("currency", patch.currency ?? currency);
    const experienceId =
      patch.experienceId === undefined
        ? data.filters.experienceId
        : patch.experienceId;
    if (experienceId) params.set("experienceId", experienceId);
    const datePreset = patch.datePreset ?? data.filters.datePreset;
    if (datePreset && datePreset !== "all") {
      params.set("datePreset", datePreset);
    }
    return `/payouts?${params.toString()}`;
  }

  function navigate(href: string) {
    setError(null);
    setMessage(null);
    router.replace(href);
    router.refresh();
  }

  async function onAddBank() {
    const account = digitsOnly(accountNumber);
    if (!bankCode) {
      setBankError("Search and pick your bank first.");
      return;
    }
    if (account.length !== 10) {
      setBankError("Enter the 10-digit account number.");
      return;
    }
    if (!resolvedOk || !accountName) {
      setBankError("Wait for the account name to appear, then add it.");
      void lookupAccount(bankCode, account);
      return;
    }
    setBusy("add-bank");
    setBankError(null);
    setMessage(null);
    const result = await addPayoutBankAccount({
      bankCode,
      accountNumber: account,
      currency,
      isDefault: currencyBanks.length === 0,
    });
    setBusy(null);
    if (!result.ok) {
      setBankError(result.message);
      return;
    }
    setAccountNumber("");
    setBankQuery("");
    setBankCode("");
    setAccountName(null);
    setResolvedOk(false);
    lookupKeyRef.current = null;
    setMessage("Bank account added.");
    router.refresh();
  }

  async function onSetDefault(id: string) {
    setBusy(`default-${id}`);
    setBankError(null);
    setError(null);
    setMessage(null);
    const result = await setDefaultPayoutBank(id);
    setBusy(null);
    if (!result.ok) {
      setBankError(result.message);
      return;
    }
    setBankAccountId(id);
    setMessage("Default bank updated.");
    router.refresh();
  }

  async function onTransfer() {
    if (!selectedBank) {
      setError("Add a verified bank account first.");
      return;
    }
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive transfer amount.");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      setMessage(
        `Confirm transfer of ${formatMoney(amount, currency)} to ${selectedBank.label}.`,
      );
      return;
    }

    setBusy("transfer");
    setError(null);
    setMessage(null);
    const result = await createPayoutTransfer({
      currency,
      amount,
      bankAccountId: selectedBank.id,
      experienceId: data.filters.experienceId,
    });
    setBusy(null);
    if (!result.ok) {
      setConfirming(false);
      setError(result.message);
      return;
    }
    setConfirming(false);
    setMessage("Transfer submitted.");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div>
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
            Payouts
          </h1>
          <p className="mt-2 text-[11px] text-muted">{data.eventMeta}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.currencies.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={currency === code}
              onClick={() => navigate(buildHref({ currency: code }))}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                currency === code
                  ? "bg-accent text-accent-fg"
                  : "bg-surface-2 text-fg hover:bg-border"
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            ariaLabel="Filter by event"
            value={eventFilterId}
            onChange={(value) => {
              setEventFilterId(value);
              navigate(buildHref({ experienceId: value || null }));
            }}
          >
            <option value="">{`All ${currency} events`}</option>
            {data.experiences.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            ariaLabel="Filter by date"
            value={datePreset}
            onChange={(value) => {
              const next = value as PayoutDatePreset;
              setDatePreset(next);
              navigate(buildHref({ datePreset: next }));
            }}
          >
            {DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
          <button
            type="button"
            aria-disabled="true"
            title="Payouts export is not available from the API yet"
            className={buttonClasses("secondary", "cursor-not-allowed gap-2")}
          >
            <ExportIcon />
            Export statement
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-[11px] text-red-400">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-[11px] text-muted">{message}</p>
        ) : null}
      </header>

      <section
        aria-label="Payout metrics"
        className="grid gap-4 rounded-3xl bg-surface p-5 sm:grid-cols-3 sm:gap-0 sm:p-6"
      >
        {data.metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`min-w-0 sm:px-5 ${
              index > 0 ? "sm:border-l sm:border-border/50" : "sm:pl-0"
            }`}
          >
            <p className="text-[11px] text-muted">{metric.label}</p>
            <p className="mt-2 text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-tight">
              {metric.value}
            </p>
            <p className="mt-1 text-[11px] text-muted">{metric.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Transfer funds">
            <div className="mt-5 flex flex-col gap-3">
              <FieldDisplay
                label="From currency balance"
                value={data.transfer.fromBalance}
              />
              <label className="flex min-h-[4.8rem] w-full flex-col justify-center gap-1 rounded-[1.25rem] bg-surface-2 px-5 py-3">
                <span className="text-[10px] text-muted">
                  Verified bank account
                </span>
                <select
                  value={selectedBank?.id ?? ""}
                  disabled={currencyBanks.length === 0}
                  onChange={(event) => {
                    setBankAccountId(event.target.value || null);
                    setConfirming(false);
                  }}
                  className="w-full appearance-none bg-transparent text-sm outline-none disabled:opacity-70"
                >
                  {currencyBanks.length === 0 ? (
                    <option value="">No verified bank account</option>
                  ) : (
                    currencyBanks.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="flex min-h-[4.8rem] w-full flex-col justify-center gap-1 rounded-[1.25rem] bg-surface-2 px-5 py-3">
                <span className="text-[10px] text-muted">
                  {`Amount in ${currency}`}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={amountInput}
                  onChange={(event) => {
                    setAmountInput(event.target.value);
                    setConfirming(false);
                  }}
                  className="bg-transparent text-[clamp(1.35rem,2.5vw,1.75rem)] font-medium tracking-tight outline-none"
                />
              </label>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              {data.transfer.footnote}
            </p>

            <button
              type="button"
              disabled={busy === "transfer" || !selectedBank}
              onClick={() => void onTransfer()}
              className={buttonClasses(
                "primary",
                `mt-5 ${
                  busy === "transfer" || !selectedBank
                    ? "cursor-not-allowed opacity-70"
                    : ""
                }`,
              )}
            >
              {busy === "transfer"
                ? "Submitting…"
                : confirming
                  ? "Confirm transfer"
                  : "Review transfer"}
            </button>
          </Card>

          <Card title="Transfer history">
            {data.history.length === 0 ? (
              <p className="mt-5 text-[11px] text-muted">
                No transfers for {currency} yet.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col">
                {data.history.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-border/50 py-4 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-sm">{item.primary}</p>
                      <p className="shrink-0 text-sm">{item.amount}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Balances by currency">
            {data.balances.length === 0 ? (
              <p className="mt-5 text-[11px] text-muted">
                No currency balances yet.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {data.balances.map((balance) => (
                  <li key={balance.id} className="flex items-start gap-3">
                    <span aria-hidden className="mt-0.5 text-base leading-none">
                      {balance.flag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-sm">
                          {`${balance.code} · ${balance.country}`}
                        </p>
                        <p className="shrink-0 text-sm">{balance.amount}</p>
                      </div>
                      <p
                        className={`mt-1 text-[11px] ${
                          balance.needsAttention
                            ? "text-[#d6b35c]"
                            : "text-muted"
                        }`}
                      >
                        {balance.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setManageOpen((open) => !open)}
              className={buttonClasses("secondary", "mt-6 w-full")}
            >
              {manageOpen ? "Hide bank accounts" : "Manage bank accounts"}
            </button>
          </Card>

          {manageOpen ? (
            <Card title="Bank accounts">
              {currencyBanks.length === 0 ? (
                <p className="mt-5 text-[11px] text-muted">
                  No {currency} bank accounts yet.
                </p>
              ) : (
                <ul className="mt-5 flex flex-col gap-3">
                  {currencyBanks.map((account) => (
                    <li
                      key={account.id}
                      className="rounded-[1.25rem] bg-surface-2 px-4 py-3"
                    >
                      <p className="text-sm">{account.label}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {account.isDefault ? "Default · " : ""}
                        {account.status}
                      </p>
                      {!account.isDefault ? (
                        <button
                          type="button"
                          disabled={busy === `default-${account.id}`}
                          onClick={() => void onSetDefault(account.id)}
                          className="mt-2 text-[11px] font-semibold text-accent disabled:opacity-70"
                        >
                          {busy === `default-${account.id}`
                            ? "Saving…"
                            : "Set as default"}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex flex-col gap-3">
                <p className="text-[11px] leading-relaxed text-muted">
                  Search and tap your bank, then enter the 10-digit account
                  number. We’ll look up the account name automatically so you
                  can confirm it’s yours before saving.
                </p>

                <div className="relative">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted">Bank</span>
                    <input
                      value={bankQuery}
                      onChange={(event) => {
                        setBankQuery(event.target.value);
                        setBankCode("");
                        setBankMenuOpen(true);
                        clearLookup();
                      }}
                      onFocus={() => setBankMenuOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const first = filteredBanks[0];
                          if (first) pickBank(first.code, first.name);
                        }
                        if (event.key === "Escape") setBankMenuOpen(false);
                      }}
                      className="rounded-xl bg-surface-2 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-accent"
                      placeholder="Search United Bank for Africa…"
                      autoComplete="off"
                    />
                  </label>
                  {bankMenuOpen ? (
                    <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-surface p-1 shadow-lg">
                      {filteredBanks.length === 0 ? (
                        <li className="px-3 py-2 text-[11px] text-muted">
                          No banks match that search.
                        </li>
                      ) : (
                        filteredBanks.map((bank) => (
                          <li key={bank.code}>
                            <button
                              type="button"
                              className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                                bank.code === bankCode ? "bg-surface-2" : ""
                              }`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => pickBank(bank.code, bank.name)}
                            >
                              {bank.name}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>

                {selectedCatalogBank ? (
                  <p className="text-[11px] text-muted">
                    Selected · {selectedCatalogBank.name}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted">
                    Type to search, then tap a bank from the list.
                  </p>
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted">Account number</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={accountNumber}
                    onChange={(event) => {
                      setAccountNumber(
                        digitsOnly(event.target.value).slice(0, 10),
                      );
                      clearLookup();
                    }}
                    onBlur={() => setBankMenuOpen(false)}
                    className="rounded-xl bg-surface-2 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-accent"
                    placeholder="8472910563"
                  />
                </label>

                <div className="rounded-[1.25rem] bg-surface-2 px-5 py-3">
                  <p className="text-[10px] text-muted">Account name</p>
                  <p className="mt-1 text-sm">
                    {busy === "resolve"
                      ? "Looking up…"
                      : accountName ||
                        (bankCode && digitsOnly(accountNumber).length === 10
                          ? "—"
                          : "Appears after bank + 10-digit account")}
                  </p>
                </div>

                {bankError ? (
                  <p role="alert" className="text-[11px] text-red-400">
                    {bankError}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={
                    busy === "add-bank" ||
                    busy === "resolve" ||
                    !resolvedOk ||
                    !bankCode ||
                    digitsOnly(accountNumber).length !== 10
                  }
                  onClick={() => void onAddBank()}
                  className={buttonClasses(
                    "primary",
                    busy === "add-bank" ||
                      busy === "resolve" ||
                      !resolvedOk ||
                      !bankCode ||
                      digitsOnly(accountNumber).length !== 10
                      ? "cursor-not-allowed opacity-70"
                      : "",
                  )}
                >
                  {busy === "add-bank"
                    ? "Adding…"
                    : busy === "resolve"
                      ? "Looking up account…"
                      : resolvedOk
                        ? "Add account"
                        : "Add account"}
                </button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  ariaLabel,
  value,
  onChange,
  children,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative inline-flex min-w-[10rem] items-center">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${buttonClasses("secondary", "w-full cursor-pointer appearance-none gap-2 pr-8 text-left")} pe-8`}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center text-muted"
      >
        <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current" strokeWidth="1.6">
          <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[4.8rem] w-full flex-col justify-center gap-1 rounded-[1.25rem] bg-surface-2 px-5 py-3 text-left">
      <span className="text-[10px] text-muted">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function ExportIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-3 fill-none stroke-current"
      strokeWidth="1.5"
    >
      <path d="M6 1.5v6.5M3.5 5.5 6 8l2.5-2.5M2 10h8" />
    </svg>
  );
}
