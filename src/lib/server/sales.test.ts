import { describe, expect, test } from "vitest";
import {
  accessSoldFromSummary,
  buildAccessSoldRows,
  buildLedgers,
  buildMetrics,
  ledgersFromApi,
  metricsFromSummary,
  normalizeOrder,
} from "./sales";

describe("normalizeOrder", () => {
  test("maps a paid order into recent-order copy", () => {
    expect(
      normalizeOrder(
        {
          id: "o1",
          number: "NS-1048",
          status: "paid",
          totalAmount: 25000,
          currency: "NGN",
          paidAt: "2026-10-25T20:34:00Z",
          buyer: { fullName: "Tolu James" },
          quantity: 1,
          ticketTypeName: "General Access",
        },
        "NGN",
        "Africa/Lagos",
      ),
    ).toEqual({
      id: "o1",
      primary: "NS-1048 · Tolu James · ₦25,000 · Paid",
      detail: expect.stringMatching(/25 Oct · \d{2}:\d{2} WAT · 1 x General Access/),
    });
  });
});

describe("buildAccessSoldRows", () => {
  test("rolls ticket types into access-sold rows", () => {
    expect(
      buildAccessSoldRows(
        [
          {
            id: "ga",
            name: "General Access",
            price: { amount: 25000, currency: "NGN" },
            quantitySold: 2,
            guestsPerTicket: 1,
          },
        ],
        "NGN",
      ),
    ).toEqual([
      {
        id: "ga",
        title: "General Access",
        amount: "₦50,000",
        detail: "₦25,000 x 2 tickets · 2 guests",
      },
    ]);
  });
});

describe("buildMetrics", () => {
  test("sums paid and refund-like rows on the page", () => {
    const metrics = buildMetrics({
      currency: "NGN",
      ordersTotal: 2,
      orders: [
        { status: "paid", totalAmount: 25000 },
        { status: "refunded", totalAmount: 5000 },
      ],
    });
    expect(metrics[0]).toMatchObject({
      label: "Gross ticket sales",
      value: "₦25,000",
    });
    expect(metrics[1]).toMatchObject({
      label: "Refunds",
      value: "₦5,000",
    });
    expect(metrics[2].value).toBe("₦20,000");
  });
});

describe("metricsFromSummary", () => {
  test("maps summary gross / refunds / fees into metric cards", () => {
    const metrics = metricsFromSummary(
      {
        currency: "NGN",
        grossTicketSales: 35300000,
        grossOrderCount: 1012,
        refundsAmount: 425000,
        refundsGuestPlaces: 17,
        feesAmount: 1046250,
        netAfterFees: 33828750,
      },
      "NGN",
    );
    expect(metrics[0]).toMatchObject({
      label: "Gross ticket sales",
      value: "₦35,300,000",
      detail: "NGN · 1,012 orders",
    });
    expect(metrics[1]).toMatchObject({
      label: "Refunds",
      value: "₦425,000",
      detail: "17 guest places",
    });
    expect(metrics[2]).toMatchObject({
      label: "Net after fees",
      value: "₦33,828,750",
      detail: "₦1,046,250 fees",
    });
  });

  test("notes missing fees when feesAmount is null", () => {
    const metrics = metricsFromSummary(
      {
        currency: "NGN",
        grossTicketSales: 1000,
        refundsAmount: 0,
        feesAmount: null,
        netAfterFees: null,
      },
      "NGN",
    );
    expect(metrics[2].detail).toMatch(/not configured/i);
  });
});

describe("accessSoldFromSummary", () => {
  test("maps accessSold rows from summary", () => {
    expect(
      accessSoldFromSummary(
        {
          currency: "NGN",
          accessSold: [
            {
              ticketTypeId: "ga",
              name: "General Access",
              unitAmount: 25000,
              ticketsSold: 2,
              guestPlaces: 2,
              grossAmount: 50000,
            },
          ],
        },
        "NGN",
      ),
    ).toEqual([
      {
        id: "ga",
        title: "General Access",
        amount: "₦50,000",
        detail: "₦25,000 x 2 tickets · 2 guests",
      },
    ]);
  });
});

describe("ledgersFromApi", () => {
  test("skips the current experience and formats gross", () => {
    expect(
      ledgersFromApi(
        {
          data: [
            {
              experienceId: "a",
              title: "Neon",
              city: "Lagos",
              currency: "NGN",
              grossAmount: 1000,
            },
            {
              experienceId: "b",
              title: "Rooftop Sessions",
              city: "London",
              currency: "GBP",
              grossAmount: 6545,
            },
          ],
        },
        "a",
      ),
    ).toEqual([
      {
        id: "b",
        primary: "London · GBP · £6,545",
        event: "Rooftop Sessions",
      },
    ]);
  });
});

describe("buildLedgers", () => {
  test("lists other events without inventing revenue", () => {
    expect(
      buildLedgers(
        [
          {
            id: "a",
            title: "Neon",
            status: "published",
            startsAt: "2026-10-25T19:00:00Z",
            endsAt: "2026-10-26T02:00:00Z",
            venue: { name: "Beach", city: "Lagos" },
          },
          {
            id: "b",
            title: "Rooftop Sessions",
            status: "published",
            startsAt: "2026-11-01T19:00:00Z",
            endsAt: "2026-11-02T02:00:00Z",
            venue: { name: "Roof", city: "London" },
          },
        ],
        "a",
        { b: "GBP" },
      ),
    ).toEqual([
      {
        id: "b",
        primary: "London · GBP · —",
        event: "Rooftop Sessions",
      },
    ]);
  });
});
