import { describe, expect, test } from "vitest";
import { formatMoney, formatOrderWhen, titleCaseStatus } from "./format";

describe("sales format", () => {
  test("formatMoney uses currency symbols", () => {
    expect(formatMoney(25300, "NGN")).toBe("₦25,300");
    expect(formatMoney(-425000, "NGN")).toBe("-₦425,000");
    expect(formatMoney(6545, "GBP")).toBe("£6,545");
  });

  test("titleCaseStatus", () => {
    expect(titleCaseStatus("paid")).toBe("Paid");
    expect(titleCaseStatus("")).toBe("Unknown");
  });

  test("formatOrderWhen uses the event zone", () => {
    expect(formatOrderWhen("2026-10-25T20:34:00Z", "Africa/Lagos")).toMatch(
      /25 Oct · \d{2}:\d{2} WAT/,
    );
  });
});
