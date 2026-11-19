import { describe, expect, test } from "vitest";
import {
  draftToCreateExperienceBody,
  isPersistedTicketId,
  labelToIso,
  toApiCategory,
} from "./api";
import { designEventDraft } from "./mock";

describe("event-setup ticket api helpers", () => {
  test("toApiCategory maps design labels", () => {
    expect(toApiCategory("Music & nightlife")).toBe("music");
    expect(toApiCategory("Food & drink")).toBe("food");
    expect(toApiCategory("")).toBe("other");
  });

  test("labelToIso parses setup labels", () => {
    const iso = labelToIso("25 Oct 2026 / 20:00", 1);
    expect(iso).toMatch(/^2026-10-25T/);
  });

  test("draftToCreateExperienceBody uses draft fields", () => {
    const body = draftToCreateExperienceBody(designEventDraft());
    expect(body).toMatchObject({
      title: "Neon Solstice",
      category: "music",
      city: "Lagos",
      venueName: "Landmark Beach",
      capacity: 1600,
    });
    expect(body.startsAt).toMatch(/^2026-10-25T/);
    expect(body.endsAt).toMatch(/^2026-10-26T/);
  });

  test("isPersistedTicketId detects UUIDs only", () => {
    expect(isPersistedTicketId("ga")).toBe(false);
    expect(
      isPersistedTicketId("11111111-1111-4111-8111-111111111111"),
    ).toBe(true);
  });
});
