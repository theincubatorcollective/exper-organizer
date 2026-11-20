"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/auth/Button";
import { Card } from "@/components/overview/Card";
import {
  inviteTeammate,
  resendTeammateInvite,
  saveMemberPermissions,
} from "@/lib/team/api";
import type {
  RolePermission,
  TeamData,
  TeamMember,
  TeamMemberPermissions,
} from "@/lib/team/types";

const PERMISSION_ORDER: Array<keyof TeamMemberPermissions> = [
  "runPrompts",
  "pauseEndLive",
  "viewPrivateSquadScores",
  "managePayouts",
  "manageTeam",
];

export function TeamRoles({ data }: { data: TeamData }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    data.selectedMemberId ?? data.members[0]?.id ?? null,
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(
    data.roles.find((role) => role.key === "editor")?.key ??
      data.roles[0]?.key ??
      "editor",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => data.members.find((member) => member.id === selectedId) ?? null,
    [data.members, selectedId],
  );

  const [draftRole, setDraftRole] = useState(selected?.roleKey ?? "editor");
  const [draftAccess, setDraftAccess] = useState<"all" | "selected">(
    selected?.eventAccess ?? "all",
  );
  const [draftPermissions, setDraftPermissions] = useState<TeamMemberPermissions>(
    selected?.permissions ?? {
      runPrompts: false,
      pauseEndLive: false,
      viewPrivateSquadScores: false,
      managePayouts: false,
      manageTeam: false,
    },
  );

  function selectMember(member: TeamMember) {
    setSelectedId(member.id);
    setDraftRole(member.roleKey);
    setDraftAccess(member.eventAccess);
    setDraftPermissions(member.permissions);
    setError(null);
    setMessage(null);
  }

  const roleLabel =
    data.roles.find((role) => role.key === draftRole)?.label ?? draftRole;
  const accessLabel =
    draftAccess === "selected" ? "Selected events only" : "All events";

  const permissionRows: RolePermission[] = PERMISSION_ORDER.map((id) => {
    const base = data.permissions.find((row) => row.id === id);
    return {
      id,
      label: base?.label ?? id,
      allowed: Boolean(draftPermissions[id]),
      note: base?.note,
    };
  });

  function cycleRole() {
    if (!data.roles.length) return;
    const index = data.roles.findIndex((role) => role.key === draftRole);
    const next = data.roles[(index + 1) % data.roles.length];
    setDraftRole(next.key);
    setDraftPermissions(next.permissions);
  }

  function cycleAccess() {
    setDraftAccess((value) => (value === "all" ? "selected" : "all"));
  }

  function togglePermission(id: keyof TeamMemberPermissions) {
    setDraftPermissions((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setBusy("invite");
    setError(null);
    setMessage(null);
    const result = await inviteTeammate({
      email: inviteEmail.trim(),
      role: inviteRole,
      eventAccess: "all",
      experienceIds: [],
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setInviteEmail("");
    setInviteOpen(false);
    setMessage("Invite sent.");
    router.refresh();
  }

  async function onResend(member: TeamMember) {
    setBusy(`resend-${member.id}`);
    setError(null);
    setMessage(null);
    const result = await resendTeammateInvite(member.id);
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(`Invite resent to ${member.email}.`);
  }

  async function onSave() {
    if (!selected) return;
    if (selected.status === "pending") {
      setError("Pending invites can’t be edited yet. Resend or wait until they join.");
      return;
    }
    setBusy("save");
    setError(null);
    setMessage(null);
    const result = await saveMemberPermissions(selected.id, {
      role: draftRole,
      eventAccess: draftAccess,
      experienceIds: draftAccess === "all" ? [] : selected.experienceIds,
      permissions: {
        runPrompts: draftPermissions.runPrompts,
        pauseEndLive: draftPermissions.pauseEndLive,
        viewPrivateSquadScores: draftPermissions.viewPrivateSquadScores,
        managePayouts: draftPermissions.managePayouts,
        manageTeam: draftPermissions.manageTeam,
      },
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage("Permissions saved.");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
              Team / Roles
            </h1>
            <p className="mt-2 text-[11px] text-muted">{data.eventMeta}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setInviteOpen((open) => !open)}
              className={buttonClasses("primary", "gap-2")}
            >
              <PlusIcon />
              Invite teammate
            </button>
            <button
              type="button"
              aria-disabled="true"
              className={buttonClasses("secondary", "cursor-not-allowed")}
            >
              View audit log
            </button>
          </div>
        </div>
        {inviteOpen ? (
          <form
            onSubmit={(event) => void onInvite(event)}
            className="flex flex-col gap-3 rounded-[1.25rem] bg-surface-2 p-4 sm:flex-row sm:items-end"
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[10px] text-muted">Email</span>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="rounded-xl bg-bg px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-accent"
                placeholder="name@studio.com"
              />
            </label>
            <label className="flex w-full flex-col gap-1 sm:w-48">
              <span className="text-[10px] text-muted">Role</span>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                className="rounded-xl bg-bg px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-accent"
              >
                {data.roles
                  .filter((role) => role.key !== "owner")
                  .map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy === "invite"}
              className={buttonClasses(
                "primary",
                busy === "invite" ? "cursor-not-allowed opacity-70" : "",
              )}
            >
              {busy === "invite" ? "Sending…" : "Send invite"}
            </button>
          </form>
        ) : null}
        {error ? (
          <p role="alert" className="text-[11px] text-red-400">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-[11px] text-muted">{message}</p>
        ) : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)] xl:items-start">
        <Card title="Workspace team" aside={`/ ${data.memberCount}`}>
          {data.members.length === 0 ? (
            <p className="mt-5 text-[11px] text-muted">
              No teammates yet. Invite someone to get started.
            </p>
          ) : (
            <ul className="mt-5 flex flex-col">
              {data.members.map((member) => {
                const pressed = member.id === selectedId;
                return (
                  <li
                    key={member.id}
                    className="border-b border-border/50 py-4 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => selectMember(member)}
                        className="min-w-0 flex-1 text-left"
                        aria-pressed={pressed}
                      >
                        <p className="text-sm">
                          {member.name}
                          {member.badges.map((badge) => (
                            <span key={badge} className="text-muted">
                              {` · ${badge}`}
                            </span>
                          ))}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {member.detail}
                        </p>
                      </button>
                      {member.resend ? (
                        <button
                          type="button"
                          disabled={busy === `resend-${member.id}`}
                          onClick={() => void onResend(member)}
                          className="shrink-0 pt-0.5 text-sm font-medium text-accent disabled:opacity-70"
                        >
                          {busy === `resend-${member.id}`
                            ? "Sending…"
                            : "Resend"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Role permissions">
          {!selected ? (
            <p className="mt-5 text-[11px] text-muted">
              Select a teammate to edit their role.
            </p>
          ) : (
            <>
              <div className="mt-5 flex flex-col gap-3">
                <FieldButton
                  label="Role"
                  value={roleLabel}
                  onClick={cycleRole}
                  disabled={selected.isOwner}
                />
                <FieldButton
                  label="Event access"
                  value={accessLabel}
                  onClick={cycleAccess}
                  disabled={selected.isOwner}
                />
              </div>

              <ul className="mt-5 flex flex-col gap-4">
                {permissionRows.map((permission) => (
                  <li key={permission.id}>
                    <button
                      type="button"
                      disabled={selected.isOwner || selected.status === "pending"}
                      onClick={() =>
                        togglePermission(
                          permission.id as keyof TeamMemberPermissions,
                        )
                      }
                      className="flex w-full items-baseline justify-between gap-3 text-left disabled:cursor-not-allowed"
                    >
                      <p className="min-w-0 text-sm">{permission.label}</p>
                      <p
                        className={`shrink-0 text-sm ${
                          permission.allowed ? "text-fg" : "text-muted"
                        }`}
                      >
                        {permission.allowed ? "Allowed" : "Not allowed"}
                      </p>
                    </button>
                    {permission.note ? (
                      <p className="mt-1 text-[11px] text-muted">
                        {permission.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-[11px] leading-relaxed text-muted">
                {data.roleKey}
              </p>

              <button
                type="button"
                disabled={
                  busy === "save" ||
                  selected.isOwner ||
                  selected.status === "pending"
                }
                onClick={() => void onSave()}
                className={buttonClasses(
                  "primary",
                  `mt-5 ${
                    busy === "save" ||
                    selected.isOwner ||
                    selected.status === "pending"
                      ? "cursor-not-allowed opacity-70"
                      : ""
                  }`,
                )}
              >
                {busy === "save" ? "Saving…" : "Save permissions"}
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function FieldButton({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[4.5rem] w-full flex-col justify-center gap-1 rounded-[1.25rem] bg-surface-2 px-5 py-3 text-left ${
        disabled ? "cursor-not-allowed opacity-70" : ""
      }`}
    >
      <span className="text-[10px] text-muted">{label}</span>
      <span className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0">{value}</span>
        <span aria-hidden className="shrink-0 text-muted">
          ⌄
        </span>
      </span>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-3 fill-none stroke-current"
      strokeWidth="1.6"
    >
      <path d="M6 2v8M2 6h8" />
    </svg>
  );
}
