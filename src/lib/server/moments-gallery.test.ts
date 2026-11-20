import { describe, expect, test } from "vitest";
import { normalizeGalleryRow } from "./moments-gallery";

describe("normalizeGalleryRow", () => {
  test("maps gallery API fields into Moments UI copy", () => {
    const row = normalizeGalleryRow(
      {
        id: "g1",
        responseId: "r1",
        caption: "The room feels like it's breathing.",
        imageUrl: "https://cdn.example/photo.jpg",
        submitterName: "Ada Okafor",
        ticketNumber: "NS-0428",
        ticketTypeName: "General Access",
        checkedIn: true,
        consent: true,
        screening: "No issue detected · Human review required.",
        momentTitle: "Find Something Blue",
        createdAt: "2026-10-25T20:39:00.000Z",
      },
      0,
      "Neon Solstice",
      "UTC",
    );
    expect(row).toMatchObject({
      id: "g1",
      responseId: "r1",
      caption: "The room feels like it's breathing.",
      submitter: "Ada Okafor",
      ticketMeta: "NS-0428 · Checked in · General Access",
      consent: "Granted",
      imageUrl: "https://cdn.example/photo.jpg",
    });
    expect(row.authorMeta).toContain("Ada Okafor");
    expect(row.authorMeta).toContain("Neon Solstice");
  });
});
