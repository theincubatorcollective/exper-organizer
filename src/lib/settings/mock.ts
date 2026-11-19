import type { SettingsData } from "./types";

/** Figma Settings fixture for unit tests. */
export function designSettings(): SettingsData {
  return {
    eventMeta: "Workspace preferences, security and event defaults.",
    organisation: {
      name: "Afterhours studio",
      legalName: "Afterhours Studio Ltd",
      contactEmail: "hello@afterhours.studio",
      supportWebsite: "afterhours.studio/support",
    },
    notifications: {
      liveIncidentAlerts: true,
      payoutUpdates: true,
      dailySummary: false,
      dailySummaryHourLocal: 9,
    },
    eventDefaults: {
      suggestedCountry: null,
      defaultTimezone: null,
      defaultCurrency: null,
      photoReviewRequired: true,
    },
    security: [
      {
        id: "s1",
        label: "Two-step verification",
        status: "—",
        detail: "Not available from the organizer API yet.",
      },
      {
        id: "s2",
        label: "Active sessions",
        status: "—",
        detail: "Not available from the organizer API yet.",
      },
      {
        id: "s3",
        label: "Sign-in alerts",
        status: "—",
        detail: "Not available from the organizer API yet.",
      },
    ],
    workspaceControls: {
      body: "Deleting a workspace requires Owner verification. Financial records follow retention rules. Delete is not available from the API yet.",
    },
  };
}
