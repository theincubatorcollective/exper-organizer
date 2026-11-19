import { describe, expect, test } from "vitest";
import { experienceToDraft, fromApiCategory } from "./hydrate";
import { designEventDraft } from "./mock";

describe("experienceToDraft", () => {
  test("maps get-experience payload onto the setup draft", () => {
    const draft = experienceToDraft({
      id: "exp-99",
      title: "Sound/Scape",
      status: "draft",
      category: "music",
      summary: "A night of sound",
      timezone: "Africa/Lagos",
      startsAt: "2026-11-20T19:00:00.000Z",
      endsAt: "2026-11-21T02:30:00.000Z",
      showVenueBeforePurchase: false,
      refundPolicy: "No refunds",
      currency: "NGN",
      venue: {
        name: "The Yard",
        address: "12 Broad St",
        city: "Lagos",
      },
      country: "Nigeria",
      ticketTypes: [
        {
          id: "tt-1",
          name: "General Access",
          price: { amount: 10000, currency: "NGN" },
          quantityTotal: 200,
          guestsPerTicket: 1,
          description: "Floor",
        },
      ],
    });

    expect(draft.experienceId).toBe("exp-99");
    expect(draft.title).toBe("Sound/Scape");
    expect(draft.description).toBe("A night of sound");
    expect(draft.category).toBe("Music & nightlife");
    expect(draft.venueName).toBe("The Yard");
    expect(draft.address).toBe("12 Broad St");
    expect(draft.city).toBe("Lagos");
    expect(draft.showVenueBeforePurchase).toBe(false);
    expect(draft.refundPolicy).toBe("No refunds");
    expect(draft.status).toBe("Draft");
    expect(draft.tickets).toHaveLength(1);
    expect(draft.tickets[0]?.price).toBe(10000);
    expect(draft.startLabel).toMatch(/20 Nov 2026/);
    expect(draft.endLabel).toMatch(/21 Nov 2026/);
  });

  test("keeps design defaults when payload is empty", () => {
    const base = designEventDraft();
    expect(experienceToDraft(null).title).toBe(base.title);
  });

  test("fromApiCategory maps known slugs", () => {
    expect(fromApiCategory("food")).toBe("Food & drink");
  });
});
