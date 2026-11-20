import { describe, expect, test } from "vitest";
import {
  normalizeEventDefaults,
  normalizeNotifications,
  normalizeOrganisation,
  normalizeSecurity,
  securityRowsFrom,
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

  test("normalizeSecurity maps sessions and defaults", () => {
    const settings = normalizeSecurity({
      twoFactorEnabled: false,
      signInAlerts: true,
      hasPassword: true,
      passwordChangedAt: null,
      sessions: [
        {
          id: "a",
          label: "Chrome on Windows",
          current: true,
          lastActiveAt: "2026-11-20T12:00:00.000Z",
        },
        {
          id: "b",
          label: "Phone",
          current: false,
          lastActiveAt: null,
        },
      ],
    });
    expect(settings.signInAlerts).toBe(true);
    expect(settings.sessions).toHaveLength(2);
    expect(settings.sessions[0]).toMatchObject({
      id: "a",
      label: "Chrome on Windows",
      current: true,
    });
    expect(settings.sessions[1].lastActiveLabel).toBe("—");
    expect(securityRowsFrom(settings)[2]).toMatchObject({
      id: "s3",
      status: "On",
    });
  });
});
