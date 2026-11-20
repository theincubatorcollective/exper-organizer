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
        status: "Off",
        detail: "Password sign-in only.",
      },
      {
        id: "s2",
        label: "Active sessions",
        status: "2",
        detail: "Including this device.",
      },
      {
        id: "s3",
        label: "Sign-in alerts",
        status: "On",
        detail: "Email when a new device signs in.",
        statusAccent: true,
      },
    ],
    securitySettings: {
      twoFactorEnabled: false,
      signInAlerts: true,
      hasPassword: true,
      passwordChangedLabel: null,
      sessions: [
        {
          id: "sess-1",
          label: "This device",
          current: true,
          lastActiveLabel: "Just now",
        },
        {
          id: "sess-2",
          label: "Unknown device",
          current: false,
          lastActiveLabel: "2 hours ago",
        },
      ],
    },
    workspaceControls: {
      body: "Deleting a workspace requires Owner verification. Financial records follow retention rules. Delete is not available from the API yet.",
    },
  };
}
