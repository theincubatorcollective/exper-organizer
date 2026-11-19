const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type EventDateParts = {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
};

/** Parse labels like `25 Oct 2026 / 20:00` (or ISO) into date + time parts. */
export function parseEventLabel(label: string): EventDateParts | null {
  const cleaned = label.replace(/\s*\/\s*/, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const match = cleaned.match(
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})$/,
  );
  if (match) {
    const day = Number(match[1]);
    const monthIndex = MONTHS.findIndex(
      (m) => m.toLowerCase() === match[2].toLowerCase(),
    );
    const year = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    if (
      monthIndex >= 0 &&
      day >= 1 &&
      day <= 31 &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return {
        date: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      };
    }
  }

  const parsed = Date.parse(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const d = new Date(parsed);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

/** Build `25 Oct 2026 / 20:00` from native date/time values. */
export function formatEventLabel(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return "";
  const month = MONTHS[m - 1];
  const [hh = "00", mm = "00"] = time.split(":");
  return `${d} ${month} ${y} / ${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

/** Format an ISO instant into setup label in a given IANA timezone. */
export function isoToEventLabel(iso: string, timeZone = "UTC"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const day = get("day");
    const month = get("month");
    const year = get("year");
    const hour = get("hour");
    const minute = get("minute");
    if (!day || !month || !year) return "";
    return `${Number(day)} ${month} ${year} / ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  } catch {
    return formatEventLabel(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
      `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`,
    );
  }
}

/** Short display: `25 Oct, 20:00`. */
export function formatEventLabelShort(label: string): string {
  const parts = parseEventLabel(label);
  if (!parts) return label;
  const [y, m, d] = parts.date.split("-").map(Number);
  if (!y || !m || !d) return label;
  return `${d} ${MONTHS[m - 1]}, ${parts.time}`;
}

export function partsToDate(parts: EventDateParts): Date | null {
  const [y, m, d] = parts.date.split("-").map(Number);
  const [hh, mm] = parts.time.split(":").map(Number);
  if (!y || !m || !d || !Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const date = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Hint under End, e.g. `Ends the following day · 7 hours 30 minutes`. */
export function endNoteFromLabels(startLabel: string, endLabel: string): string {
  const start = partsToDate(parseEventLabel(startLabel) ?? { date: "", time: "" });
  const end = partsToDate(parseEventLabel(endLabel) ?? { date: "", time: "" });
  if (!start || !end || end.getTime() <= start.getTime()) {
    return "Choose an end after the start time.";
  }

  const ms = end.getTime() - start.getTime();
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const duration =
    minutes === 0
      ? `${hours} hour${hours === 1 ? "" : "s"}`
      : `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) return `Same day · ${duration}`;
  const dayDiff = Math.round(
    (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86_400_000,
  );
  if (dayDiff === 1) return `Ends the following day · ${duration}`;
  return `Ends ${dayDiff} days later · ${duration}`;
}
