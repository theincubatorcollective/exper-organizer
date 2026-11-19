import { describe, expect, test } from "vitest";
import {
  draftToPatchExperienceBody,
  toApiCategory,
} from "@/lib/event-setup/api";
import { designEventDraft } from "@/lib/event-setup/mock";

describe("experience edit/publish helpers", () => {
  test("toApiCategory maps Basics labels", () => {
    expect(toApiCategory("Music & nightlife")).toBe("music");
    expect(toApiCategory("Arts & culture")).toBe("arts");
    expect(toApiCategory("Food & drink")).toBe("food");
  });

  test("draftToPatchExperienceBody includes Postman edit fields", () => {
    const draft = designEventDraft();
    const body = draftToPatchExperienceBody(draft);
    expect(body.summary).toBeTruthy();
    expect(body.country).toBe(draft.country);
    expect(body.currency).toBe(draft.currency);
    expect(body.showVenueBeforePurchase).toBe(true);
    expect(body.refundPolicy).toBe(draft.refundPolicy);
    expect(body.title).toBe(draft.title);
    expect(body.venueName).toBe(draft.venueName);
  });
});
