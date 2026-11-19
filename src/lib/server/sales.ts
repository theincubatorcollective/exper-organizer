import type {
  AccessSoldRow,
  Ledger,
  RecentOrder,
  SalesData,
  SalesMetric,
} from "@/lib/sales/types";
import {
  formatMoney,
  formatOrderWhen,
  titleCaseStatus,
} from "@/lib/sales/format";
import type { EventSummary } from "@/lib/overview/types";
import { backendFetch } from "./backend";
import {
  listGuestsPage,
  selectDoorExperience,
} from "./attendees";
import { experiencesFrom, listExperiences } from "./organizer";
import {
  countCheckIns,
  readToken,
  toFailure,
  type Failure,
} from "./overview";

export type SalesResult =
  | { ok: true; data: SalesData; experienceId: string }
  | { ok: true; data: null; experienceId: null; empty: true }
  | Failure;

type TicketTypeDetail = {
  id?: string;
  name?: string;
  price?: { amount?: number | null; currency?: string | null };
  quantityTotal?: number | null;
  quantitySold?: number | null;
  guestsPerTicket?: number | null;
};

type DetailResponse = {
  title?: string;
  timezone: string;
  capacity: number | null;
  startsAt?: string;
  venue: { name: string | null; city: string | null; address?: string | null };
  ticketTypes?: TicketTypeDetail[];
};

export type OrderApiRow = {
  id?: string;
  number?: string | null;
  reference?: string | null;
  status?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
  currency?: string | null;
  totalAmount?: number | null;
  amount?: number | null;
  total?: number | null;
  buyer?: { fullName?: string | null; name?: string | null; email?: string | null } | null;
  customerName?: string | null;
  guestName?: string | null;
  quantity?: number | null;
  ticketType?: { name?: string | null } | null;
  ticketTypeName?: string | null;
  lines?: Array<{
    quantity?: number | null;
    ticketType?: { name?: string | null } | null;
    name?: string | null;
  }> | null;
};

export type OrdersPageResponse = {
  data: OrderApiRow[];
  page: number;
  limit: number;
  total: number;
  hasMore?: boolean;
};

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

const CURRENCY_FALLBACKS = ["NGN", "GBP", "GHS", "KES", "USD", "EUR"];

export function listOrdersPage(
  bearer: string,
  experienceId: string,
  page = 1,
  limit = 20,
) {
  return backendFetch<OrdersPageResponse>(
    `/organizer/experiences/${experienceId}/orders?page=${page}&limit=${limit}`,
    { bearer },
  );
}

function orderAmount(row: OrderApiRow): number {
  for (const value of [row.totalAmount, row.amount, row.total]) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function orderName(row: OrderApiRow): string {
  return (
    row.buyer?.fullName?.trim() ||
    row.buyer?.name?.trim() ||
    row.customerName?.trim() ||
    row.guestName?.trim() ||
    row.buyer?.email?.trim() ||
    "Guest"
  );
}

function orderTicketSummary(row: OrderApiRow): string {
  if (row.lines && row.lines.length > 0) {
    return row.lines
      .map((line) => {
        const qty = line.quantity ?? 1;
        const name =
          line.ticketType?.name?.trim() ||
          line.name?.trim() ||
          "Ticket";
        return `${qty} x ${name}`;
      })
      .join(", ");
  }
  const qty = row.quantity ?? 1;
  const name =
    row.ticketType?.name?.trim() ||
    row.ticketTypeName?.trim() ||
    "Ticket";
  return `${qty} x ${name}`;
}

export function normalizeOrder(
  row: OrderApiRow,
  currency: string,
  timeZone: string,
): RecentOrder {
  const id = row.id || row.number || row.reference || cryptoRandom(row);
  const ref = row.number?.trim() || row.reference?.trim() || id.slice(0, 8).toUpperCase();
  const status = titleCaseStatus(row.status ?? "unknown");
  const money = formatMoney(orderAmount(row), row.currency || currency);
  const when = formatOrderWhen(row.paidAt || row.createdAt, timeZone);
  return {
    id,
    primary: `${ref} · ${orderName(row)} · ${money} · ${status}`,
    detail: `${when} · ${orderTicketSummary(row)}`,
  };
}

function cryptoRandom(row: OrderApiRow): string {
  return `order-${JSON.stringify(row).length}`;
}

function isPaid(status: string | null | undefined): boolean {
  return (status ?? "").toLowerCase() === "paid";
}

function isRefundLike(status: string | null | undefined): boolean {
  const value = (status ?? "").toLowerCase();
  return value === "refunded" || value === "cancelled" || value === "canceled";
}

export function buildAccessSoldRows(
  ticketTypes: TicketTypeDetail[],
  currency: string,
): AccessSoldRow[] {
  return ticketTypes.map((ticket, index) => {
    const name = ticket.name?.trim() || `Ticket ${index + 1}`;
    const unit = ticket.price?.amount ?? 0;
    const sold = ticket.quantitySold ?? 0;
    const guestsPer = ticket.guestsPerTicket ?? 1;
    const guests = sold * guestsPer;
    const gross = unit * sold;
    return {
      id: ticket.id || `tt-${index}`,
      title: name,
      amount: formatMoney(gross, ticket.price?.currency || currency),
      detail: `${formatMoney(unit, ticket.price?.currency || currency)} x ${sold.toLocaleString("en-GB")} tickets · ${guests.toLocaleString("en-GB")} guests`,
    };
  });
}

export function buildMetrics(options: {
  currency: string;
  orders: OrderApiRow[];
  ordersTotal: number;
}): SalesMetric[] {
  const { currency, orders, ordersTotal } = options;
  const paid = orders.filter((row) => isPaid(row.status));
  const refunded = orders.filter((row) => isRefundLike(row.status));
  const gross = paid.reduce((sum, row) => sum + orderAmount(row), 0);
  const refunds = refunded.reduce((sum, row) => sum + orderAmount(row), 0);

  return [
    {
      label: "Gross ticket sales",
      value: formatMoney(gross, currency),
      detail:
        ordersTotal > orders.length
          ? `${currency} · from ${paid.length} paid on this page · ${ordersTotal.toLocaleString("en-GB")} orders total`
          : `${currency} · ${ordersTotal.toLocaleString("en-GB")} orders`,
    },
    {
      label: "Refunds",
      value: formatMoney(refunds, currency),
      detail:
        refunded.length > 0
          ? `${refunded.length.toLocaleString("en-GB")} on this page`
          : "No refunds on this page",
    },
    {
      label: "Net after fees",
      value: formatMoney(Math.max(gross - refunds, 0), currency),
      detail: "Fees not available from the API yet",
    },
  ];
}

export function buildLedgers(
  events: EventSummary[],
  currentId: string,
  currenciesById: Record<string, string | null>,
): Ledger[] {
  return events
    .filter((event) => event.id !== currentId)
    .slice(0, 5)
    .map((event) => {
      const city = event.venue.city?.trim() || "—";
      const currency = currenciesById[event.id] || "—";
      return {
        id: event.id,
        primary: `${city} · ${currency} · —`,
        event: event.title,
      };
    });
}

export async function getSales(options?: {
  page?: number;
  experienceId?: string | null;
  now?: Date;
}): Promise<SalesResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const at = options?.now ?? new Date();
  const page = Math.max(1, options?.page ?? 1);

  const list = await listExperiences(bearer);
  if (!list.ok) return toFailure(list);

  const events = experiencesFrom(list);
  const event = selectDoorExperience(events, at, options?.experienceId);
  if (!event) {
    return { ok: true, data: null, experienceId: null, empty: true };
  }

  const [detailResult, guestsResult, ordersResult, counts] = await Promise.all([
    backendFetch<DetailResponse>(`/organizer/experiences/${event.id}`, {
      bearer,
    }),
    listGuestsPage(bearer, event.id, 1, 1),
    listOrdersPage(bearer, event.id, page, 20),
    countCheckIns(event.id, bearer).catch(() => ({
      checkedIn: 0,
      attendees: 0,
      capped: false,
    })),
  ]);

  const detail = detailResult.ok ? detailResult.data : null;
  const timezone = detail?.timezone || "UTC";
  const ticketTypes = detail?.ticketTypes ?? [];
  const currency =
    ticketTypes[0]?.price?.currency?.trim() ||
    (ordersResult.ok
      ? ordersResult.data.data.find((row) => row.currency)?.currency?.trim()
      : null) ||
    "NGN";

  const registered = guestsResult.ok
    ? guestsResult.data.total
    : counts.attendees;
  const capacity = detail?.capacity ?? 0;
  const available = Math.max(capacity - registered, 0);

  const orderRows = ordersResult.ok ? ordersResult.data.data ?? [] : [];
  const ordersTotal = ordersResult.ok ? ordersResult.data.total : 0;
  const recentOrders = orderRows.map((row) =>
    normalizeOrder(row, currency, timezone),
  );

  const accessRows = buildAccessSoldRows(ticketTypes, currency);
  const currencies = Array.from(
    new Set([
      currency,
      ...CURRENCY_FALLBACKS,
      ...ticketTypes
        .map((ticket) => ticket.price?.currency?.trim())
        .filter((value): value is string => Boolean(value)),
    ]),
  );

  // Light fan-out for other ledgers (city already on list; currency from detail).
  const others = events.filter((item) => item.id !== event.id).slice(0, 5);
  const otherDetails = await Promise.all(
    others.map((item) =>
      backendFetch<DetailResponse>(`/organizer/experiences/${item.id}`, {
        bearer,
      }).then((result) => ({
        id: item.id,
        currency: result.ok
          ? result.data.ticketTypes?.[0]?.price?.currency ?? null
          : null,
      })),
    ),
  );
  const currenciesById = Object.fromEntries(
    otherDetails.map((item) => [item.id, item.currency]),
  );

  const paidOnPage = orderRows.filter((row) => isPaid(row.status)).length;
  const title = detail?.title?.trim() || event.title;

  const data: SalesData = {
    eventMeta: `${title} · ${currency} ledger · Orders and guest places are counted separately.`,
    currencies,
    activeCurrency: currency,
    eventFilter: title,
    dateFilter: "All time",
    metrics: buildMetrics({ currency, orders: orderRows, ordersTotal }),
    accessSold: {
      guestPlaces: `${registered.toLocaleString("en-GB")} guest places`,
      rows:
        accessRows.length > 0
          ? accessRows
          : [
              {
                id: "empty",
                title: "No ticket types yet",
                amount: formatMoney(0, currency),
                detail: "Add ticket types in Event setup / Access",
              },
            ],
      footer: ordersResult.ok
        ? `Orders and guest places are counted separately. Showing ${orderRows.length.toLocaleString("en-GB")} of ${ordersTotal.toLocaleString("en-GB")} orders on this page.`
        : `Couldn't load orders. ${ordersResult.message}`,
    },
    capacity: {
      registered,
      capacity,
      note:
        capacity > 0
          ? `${available.toLocaleString("en-GB")} places available. Registration is not the same as check-in.`
          : "Capacity not set yet. Registration is not the same as check-in.",
      stats: [
        {
          label: "Paid orders",
          value:
            ordersTotal > 0
              ? ordersTotal.toLocaleString("en-GB")
              : paidOnPage.toLocaleString("en-GB"),
        },
        {
          label: "Registered attendees",
          value: registered.toLocaleString("en-GB"),
        },
        {
          label: "Checked in",
          value: `${counts.checkedIn.toLocaleString("en-GB")}${counts.capped ? "+" : ""}`,
        },
      ],
    },
    recentOrders: {
      paidCount: `${ordersTotal.toLocaleString("en-GB")} orders`,
      orders: recentOrders,
    },
    ledgers: buildLedgers(events, event.id, currenciesById),
  };

  return { ok: true, data, experienceId: event.id };
}
