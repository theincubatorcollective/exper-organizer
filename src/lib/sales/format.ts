import { safeZone, zoneLabel } from "@/lib/overview/format";

const SYMBOLS: Record<string, string> = {
  NGN: "₦",
  GBP: "£",
  GHS: "GH₵",
  KES: "KSh",
  USD: "$",
  EUR: "€",
};

/**
 * Format a money amount for the sales UI.
 * Ticket prices / orders in this app use the same integer unit shown as ₦25,000.
 * Sales summary + ledgers Postman notes say “kobo”; we still format with this helper
 * so figures match Access ticket amounts unless product confirms a /100 conversion.
 */
export function formatMoney(
  amount: number,
  currency: string,
): string {
  const code = currency.toUpperCase();
  const symbol = SYMBOLS[code];
  const absolute = Math.abs(amount);
  const formatted = absolute.toLocaleString("en-NG", {
    maximumFractionDigits: Number.isInteger(absolute) ? 0 : 2,
  });
  const signed = amount < 0 ? `-${symbol ?? ""}${formatted}` : `${symbol ?? ""}${formatted}`;
  if (symbol) return signed;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function titleCaseStatus(status: string): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function formatOrderWhen(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(timeZone),
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const label = zoneLabel(timeZone, at);
  return `${get("day")} ${get("month")} · ${get("hour")}:${get("minute")} ${label}`;
}
