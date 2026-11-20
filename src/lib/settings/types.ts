export type SettingsTab = "workspace" | "security" | "notifications";

export type SettingsStatusRow = {
  id: string;
  label: string;
  status: string;
  detail: string;
  statusAccent?: boolean;
};

export type OrganisationProfile = {
  name: string;
  legalName: string;
  contactEmail: string;
  supportWebsite: string;
};

export type NotificationSettings = {
  liveIncidentAlerts: boolean;
  payoutUpdates: boolean;
  dailySummary: boolean;
  dailySummaryHourLocal: number;
};

export type EventDefaultsSettings = {
  suggestedCountry: string | null;
  defaultTimezone: string | null;
  defaultCurrency: string | null;
  photoReviewRequired: boolean;
};

export type SecuritySession = {
  id: string;
  label: string;
  current: boolean;
  lastActiveLabel: string;
};

export type SecuritySettings = {
  twoFactorEnabled: boolean;
  signInAlerts: boolean;
  hasPassword: boolean;
  passwordChangedLabel: string | null;
  sessions: SecuritySession[];
};

export type SettingsData = {
  eventMeta: string;
  organisation: OrganisationProfile;
  notifications: NotificationSettings;
  eventDefaults: EventDefaultsSettings;
  security: SettingsStatusRow[];
  securitySettings: SecuritySettings;
  workspaceControls: {
    body: string;
  };
  loadErrors?: {
    organisation: string | null;
    notifications: string | null;
    eventDefaults: string | null;
    security: string | null;
  };
};
