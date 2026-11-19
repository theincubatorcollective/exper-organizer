import { describe, expect, test } from "vitest";
import {
  endNoteFromLabels,
  formatEventLabel,
  formatEventLabelShort,
  parseEventLabel,
} from "./datetime";

describe("event-setup datetime helpers", () => {
  test("parseEventLabel reads setup labels", () => {
    expect(parseEventLabel("25 Oct 2026 / 20:00")).toEqual({
      date: "2026-10-25",
      time: "20:00",
    });
  });

  test("formatEventLabel builds setup labels", () => {
    expect(formatEventLabel("2026-10-25", "20:00")).toBe("25 Oct 2026 / 20:00");
  });

  test("formatEventLabelShort shortens for review", () => {
    expect(formatEventLabelShort("25 Oct 2026 / 20:00")).toBe("25 Oct, 20:00");
  });

  test("endNoteFromLabels describes overnight events", () => {
    expect(
      endNoteFromLabels("25 Oct 2026 / 20:00", "26 Oct 2026 / 03:30"),
    ).toBe("Ends the following day · 7 hours 30 minutes");
  });
});
