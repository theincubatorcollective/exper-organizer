import { describe, expect, test } from "vitest";
import {
  normalizeEventDefaults,
  normalizeNotifications,
  normalizeOrganisation,
} from "./workspace-settings";

describe("workspace settings normalizers", () => {
  test("normalizeOrganisation reads flat and nested payloads", () => {
    expect(
      normalizeOrganisation({
        name: "Afterhours studio",
        legalName: "Afterhours Studio Ltd",
        contactEmail: "hello@afterhours.studio",
        supportWebsite: "https://afterhours.studio/support",
      }),
    ).toEqual({
      name: "Afterhours studio",
      legalName: "Afterhours Studio Ltd",
      contactEmail: "hello@afterhours.studio",
      supportWebsite: "https://afterhours.studio/support",
    });

    expect(
      normalizeOrganisation({ data: { name: "Nested" } }, "Fallback"),
    ).toEqual({
      name: "Nested",
      legalName: "",
      contactEmail: "",
      supportWebsite: "",
    });
  });

  test("normalizeNotifications defaults missing booleans", () => {
    expect(normalizeNotifications({})).toEqual({
      liveIncidentAlerts: true,
      payoutUpdates: true,
      dailySummary: false,
      dailySummaryHourLocal: 9,
    });
    expect(
      normalizeNotifications({
        liveIncidentAlerts: false,
        dailySummaryHourLocal: 7,
      }),
    ).toMatchObject({
      liveIncidentAlerts: false,
      dailySummaryHourLocal: 7,
    });
  });

  test("normalizeEventDefaults keeps nulls", () => {
    expect(
      normalizeEventDefaults({
        suggestedCountry: "Nigeria",
        defaultTimezone: "Africa/Lagos",
        defaultCurrency: "NGN",
        photoReviewRequired: false,
      }),
    ).toEqual({
      suggestedCountry: "Nigeria",
      defaultTimezone: "Africa/Lagos",
      defaultCurrency: "NGN",
      photoReviewRequired: false,
    });
  });
});
