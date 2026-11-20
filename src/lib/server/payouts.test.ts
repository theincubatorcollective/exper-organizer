import { describe, expect, test } from "vitest";
import {
  bankAccountLabel,
  buildPayoutsData,
  mapBalance,
  mapTransfer,
  resolveDateRange,
} from "./payouts";

describe("payouts mappers", () => {
  test("mapBalance formats available and attention state", () => {
    expect(
      mapBalance({
        currency: "NGN",
        country: "Nigeria",
        available: 8275000,
        pending: 100,
        bankLabel: "GTBank · Verified",
        needsAttention: false,
      }),
    ).toMatchObject({
      code: "NGN",
      country: "Nigeria",
      amount: "₦8,275,000",
      detail: "GTBank · Verified",
      needsAttention: false,
    });

    expect(
      mapBalance({
        currency: "GHS",
        country: "Ghana",
        available: 0,
        bankLabel: null,
        needsAttention: true,
      }),
    ).toMatchObject({
      code: "GHS",
      detail: "Bank verification needed",
      needsAttention: true,
    });
  });

  test("mapTransfer, bankAccountLabel and date presets", () => {
    expect(
      mapTransfer({
        id: "t1",
        reference: "NGN-0823",
        status: "completed",
        amount: 5815000,
        currency: "NGN",
        bankLabel: "GTBank •••• 4829",
        createdAt: "2026-10-21T00:00:00Z",
      }),
    ).toMatchObject({
      primary: "NGN-0823 · Completed",
      amount: "₦5,815,000",
    });

    expect(
      bankAccountLabel({
        accountName: "Afterhours Studio Ltd",
        bankName: "GTBank",
        accountNumberMasked: "•••• 4829",
      }),
    ).toBe("Afterhours Studio Ltd · GTBank · •••• 4829");

    expect(resolveDateRange("all").label).toBe("All time");
    expect(resolveDateRange("last30", new Date("2026-10-25T12:00:00Z"))).toMatchObject({
      preset: "last30",
      label: "Last 30 days",
      to: "2026-10-25",
    });
  });

  test("buildPayoutsData builds metrics for currency", () => {
    const data = buildPayoutsData({
      currency: "NGN",
      summary: {
        currency: "NGN",
        payoutsEnabled: false,
        available: 0,
        pendingSettlement: 0,
        pendingDetail: null,
        transferredInPeriod: 0,
        transferredCount: 0,
      },
      balances: [
        {
          currency: "NGN",
          country: "Nigeria",
          available: 0,
          pending: 0,
          bankLabel: null,
          needsAttention: true,
        },
      ],
      banks: [],
      bankCatalog: [{ code: "044", name: "Access Bank" }],
      transfers: [],
      experiences: [{ id: "exp-1", title: "API Probe Night" }],
      filters: {
        from: null,
        to: null,
        experienceId: null,
        datePreset: "all",
        dateLabel: "All time",
      },
      workspaceName: "Afterhours studio",
      now: new Date("2026-10-15T12:00:00Z"),
    });

    expect(data.activeCurrency).toBe("NGN");
    expect(data.eventMeta).toContain("Afterhours studio");
    expect(data.metrics[0]).toMatchObject({
      label: "Available NGN",
      value: "₦0",
      detail: "payouts not enabled yet",
    });
    expect(data.metrics[2].label).toBe("Transferred in October");
    expect(data.transfer.bankAccount).toBe("No verified bank account");
    expect(data.history).toEqual([]);
    expect(data.balances[0].needsAttention).toBe(true);
    expect(data.payoutsEnabled).toBe(false);
    expect(data.bankOptions[0]).toEqual({
      code: "044",
      name: "Access Bank",
    });
    expect(data.exportAvailable).toBe(false);
  });
});
