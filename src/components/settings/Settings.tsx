"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClasses } from "@/components/auth/Button";
import { Card } from "@/components/overview/Card";
import {
  saveEventDefaults,
  saveNotifications,
  saveOrganisation,
} from "@/lib/settings/api";
import type {
  SettingsData,
  SettingsStatusRow,
  SettingsTab,
} from "@/lib/settings/types";

export function Settings({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("workspace");
  const [organisation, setOrganisation] = useState(data.organisation);
  const [notifications, setNotifications] = useState(data.notifications);
  const [eventDefaults, setEventDefaults] = useState(data.eventDefaults);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "workspace", label: "Workspace" },
    { id: "security", label: "Security" },
    { id: "notifications", label: "Notifications" },
  ];

  async function onSaveOrganisation(event: FormEvent) {
    event.preventDefault();
    setBusy("organisation");
    setError(null);
    setMessage(null);
    try {
      const result = await saveOrganisation(organisation);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOrganisation(result.data);
      setMessage("Organisation saved.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function onSaveNotifications(event: FormEvent) {
    event.preventDefault();
    setBusy("notifications");
    setError(null);
    setMessage(null);
    try {
      const result = await saveNotifications(notifications);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotifications(result.data);
      setMessage("Notifications saved.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function onSaveDefaults(event: FormEvent) {
    event.preventDefault();
    setBusy("defaults");
    setError(null);
    setMessage(null);
    try {
      const result = await saveEventDefaults(eventDefaults);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEventDefaults(result.data);
      setMessage("Event defaults saved.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div>
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
            Settings
          </h1>
          <p className="mt-2 text-[11px] text-muted">{data.eventMeta}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                tab === item.id
                  ? "bg-accent text-accent-fg"
                  : "bg-surface-2 text-fg hover:bg-border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {message ? (
          <p role="status" className="text-[11px] text-accent">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-[11px] text-red-400">
            {error}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Organisation">
            {data.loadErrors?.organisation ? (
              <p className="mt-3 text-[11px] text-red-400">
                {data.loadErrors.organisation}
              </p>
            ) : null}
            <form onSubmit={(e) => void onSaveOrganisation(e)} className="mt-5">
              <div className="flex flex-col gap-3">
                <TextField
                  label="Workspace name"
                  value={organisation.name}
                  onChange={(value) =>
                    setOrganisation((current) => ({ ...current, name: value }))
                  }
                />
                <TextField
                  label="Legal business name"
                  value={organisation.legalName}
                  onChange={(value) =>
                    setOrganisation((current) => ({
                      ...current,
                      legalName: value,
                    }))
                  }
                />
                <TextField
                  label="Contact email"
                  value={organisation.contactEmail}
                  onChange={(value) =>
                    setOrganisation((current) => ({
                      ...current,
                      contactEmail: value,
                    }))
                  }
                />
                <TextField
                  label="Support website"
                  value={organisation.supportWebsite}
                  onChange={(value) =>
                    setOrganisation((current) => ({
                      ...current,
                      supportWebsite: value,
                    }))
                  }
                />
              </div>
              <button
                type="submit"
                disabled={busy === "organisation"}
                className={buttonClasses(
                  "primary",
                  `mt-5 ${busy === "organisation" ? "opacity-50" : ""}`,
                )}
              >
                {busy === "organisation" ? "Saving…" : "Save changes"}
              </button>
            </form>
          </Card>

          <Card title="Event defaults">
            {data.loadErrors?.eventDefaults ? (
              <p className="mt-3 text-[11px] text-red-400">
                {data.loadErrors.eventDefaults}
              </p>
            ) : null}
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              These are starting values for new events, never product-wide
              constants. Each event keeps its own venue, timezone and currency.
            </p>
            <form onSubmit={(e) => void onSaveDefaults(e)} className="mt-5">
              <div className="flex flex-col gap-3">
                <TextField
                  label="Suggested country"
                  value={eventDefaults.suggestedCountry ?? ""}
                  placeholder="e.g. Nigeria"
                  onChange={(value) =>
                    setEventDefaults((current) => ({
                      ...current,
                      suggestedCountry: value.trim() ? value : null,
                    }))
                  }
                />
                <TextField
                  label="Timezone"
                  value={eventDefaults.defaultTimezone ?? ""}
                  placeholder="e.g. Africa/Lagos"
                  onChange={(value) =>
                    setEventDefaults((current) => ({
                      ...current,
                      defaultTimezone: value.trim() ? value : null,
                    }))
                  }
                />
                <TextField
                  label="Currency"
                  value={eventDefaults.defaultCurrency ?? ""}
                  placeholder="e.g. NGN"
                  onChange={(value) =>
                    setEventDefaults((current) => ({
                      ...current,
                      defaultCurrency: value.trim()
                        ? value.trim().toUpperCase()
                        : null,
                    }))
                  }
                />
              </div>
              <div className="mt-5">
                <ToggleRow
                  label="Photo review"
                  detail="Require approval before sharing"
                  on={eventDefaults.photoReviewRequired}
                  onToggle={() =>
                    setEventDefaults((current) => ({
                      ...current,
                      photoReviewRequired: !current.photoReviewRequired,
                    }))
                  }
                />
              </div>
              <button
                type="submit"
                disabled={busy === "defaults"}
                className={buttonClasses(
                  "primary",
                  `mt-5 ${busy === "defaults" ? "opacity-50" : ""}`,
                )}
              >
                {busy === "defaults" ? "Saving…" : "Save defaults"}
              </button>
            </form>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Security">
            <ul className="mt-5 flex flex-col gap-4">
              {data.security.map((row) => (
                <li key={row.id}>
                  <StatusRow row={row} />
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Notification delivery">
            {data.loadErrors?.notifications ? (
              <p className="mt-3 text-[11px] text-red-400">
                {data.loadErrors.notifications}
              </p>
            ) : null}
            <form
              onSubmit={(e) => void onSaveNotifications(e)}
              className="mt-5 flex flex-col gap-4"
            >
              <ToggleRow
                label="Live incident alerts"
                detail="Push + email · Event team only"
                on={notifications.liveIncidentAlerts}
                onToggle={() =>
                  setNotifications((current) => ({
                    ...current,
                    liveIncidentAlerts: !current.liveIncidentAlerts,
                  }))
                }
              />
              <ToggleRow
                label="Payout updates"
                detail="Email · Finance and Owner"
                on={notifications.payoutUpdates}
                onToggle={() =>
                  setNotifications((current) => ({
                    ...current,
                    payoutUpdates: !current.payoutUpdates,
                  }))
                }
              />
              <ToggleRow
                label="Daily summary"
                detail={`Email at ${String(notifications.dailySummaryHourLocal).padStart(2, "0")}:00 in your timezone`}
                on={notifications.dailySummary}
                onToggle={() =>
                  setNotifications((current) => ({
                    ...current,
                    dailySummary: !current.dailySummary,
                  }))
                }
              />
              <TextField
                label="Daily summary hour (0–23)"
                value={String(notifications.dailySummaryHourLocal)}
                onChange={(value) => {
                  const hour = Number(value);
                  setNotifications((current) => ({
                    ...current,
                    dailySummaryHourLocal: Number.isFinite(hour)
                      ? Math.min(23, Math.max(0, Math.floor(hour)))
                      : current.dailySummaryHourLocal,
                  }));
                }}
              />
              <button
                type="submit"
                disabled={busy === "notifications"}
                className={buttonClasses(
                  "primary",
                  busy === "notifications" ? "opacity-50" : "",
                )}
              >
                {busy === "notifications" ? "Saving…" : "Save notifications"}
              </button>
            </form>
          </Card>

          <Card title="Workspace controls">
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {data.workspaceControls.body}
            </p>
            <button
              type="button"
              aria-disabled="true"
              className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-surface-2 px-5 py-2.5 text-xs font-semibold text-danger"
            >
              <TrashIcon />
              Delete workspace…
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex min-h-[4.5rem] w-full flex-col justify-center gap-1 rounded-[1.25rem] bg-surface-2 px-5 py-3">
      <span className="text-[10px] text-muted">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </label>
  );
}

function ToggleRow({
  label,
  detail,
  on,
  onToggle,
}: {
  label: string;
  detail: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        <p className="mt-1 text-[11px] text-muted">{detail}</p>
      </div>
      <button
        type="button"
        aria-pressed={on}
        onClick={onToggle}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
        }`}
      >
        {on ? "On" : "Off"}
      </button>
    </div>
  );
}

function StatusRow({ row }: { row: SettingsStatusRow }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm">{row.label}</p>
        <p
          className={`shrink-0 text-sm ${
            row.statusAccent ? "font-medium text-accent" : "text-fg"
          }`}
        >
          {row.status}
        </p>
      </div>
      <p className="mt-1 text-[11px] text-muted">{row.detail}</p>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-3 fill-none stroke-current"
      strokeWidth="1.5"
    >
      <path d="M2.5 3.5h7M4.5 3.5V2.5h3v1M3.5 3.5l.5 6.5h4l.5-6.5" />
    </svg>
  );
}
