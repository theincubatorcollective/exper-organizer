import { describe, expect, test } from "vitest";
import {
  coverMetaFromFile,
  draftToCreateExperienceBody,
  isPersistedTicketId,
  labelToIso,
  toApiCategory,
  validateCoverFile,
} from "./api";
import { designEventDraft } from "./mock";

describe("event-setup ticket api helpers", () => {
  test("toApiCategory maps labels to backend slugs", () => {
    expect(toApiCategory("Music")).toBe("music");
    expect(toApiCategory("Music & nightlife")).toBe("music");
    expect(toApiCategory("Art")).toBe("art");
    expect(toApiCategory("Arts & culture")).toBe("culture");
    expect(toApiCategory("Food & drink")).toBe("food");
    expect(toApiCategory("Nightlife")).toBe("nightlife");
    expect(toApiCategory("Other")).toBe("other");
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

describe("cover upload helpers", () => {
  test("validateCoverFile accepts jpeg under the size cap", () => {
    const file = new File([new Uint8Array(1200)], "cover.jpg", {
      type: "image/jpeg",
    });
    expect(validateCoverFile(file)).toBeNull();
  });

  test("validateCoverFile rejects wrong type and oversized files", () => {
    expect(
      validateCoverFile(new File([new Uint8Array(10)], "x.gif", { type: "image/gif" })),
    ).toMatch(/JPG, PNG, or WebP/i);
    expect(
      validateCoverFile(
        new File([new Uint8Array(9 * 1024 * 1024)], "big.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).toMatch(/8 MB/i);
  });

  test("coverMetaFromFile formats size and kind", () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], "neon.png", {
      type: "image/png",
    });
    expect(coverMetaFromFile(file)).toBe("Uploaded cover · PNG · 2.0 MB");
  });
});
