import type {
  RoleOption,
  RolePermission,
  TeamData,
  TeamMember,
  TeamMemberPermissions,
} from "@/lib/team/types";
import { backendFetch } from "./backend";
import { getWorkspace, normalizeWorkspace } from "./organizer";
import { readToken, toFailure, type Failure } from "./overview";

export type TeamResult = { ok: true; data: TeamData } | Failure;

const UNAUTHORIZED: Failure = {
  ok: false,
  reason: "unauthorized",
  message: "Sign in to continue.",
};

export type MemberApiRow = {
  id?: string;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  roles?: string[] | null;
  eventAccess?: string | null;
  experienceIds?: string[] | null;
  experienceLabels?: string[] | null;
  permissions?: Partial<TeamMemberPermissions> | null;
  status?: string | null;
  isYou?: boolean | null;
  isOwner?: boolean | null;
};

export type MembersPageResponse = {
  data?: MemberApiRow[];
  total?: number;
};

export type RoleApiRow = {
  key?: string;
  label?: string;
  permissions?: Partial<TeamMemberPermissions> | null;
};

export type RolesResponse = {
  permissions?: string[];
  data?: RoleApiRow[];
};

export type InviteBody = {
  email: string;
  role: string;
  eventAccess: "all" | "selected";
  experienceIds?: string[];
};

export type UpdateMemberBody = {
  role?: string;
  eventAccess?: "all" | "selected";
  experienceIds?: string[];
  permissions?: Partial<TeamMemberPermissions>;
};

const PERMISSION_FIELDS: Array<{
  id: keyof TeamMemberPermissions;
  label: string;
  note?: string;
}> = [
  { id: "runPrompts", label: "Run prompts & reminders" },
  {
    id: "pauseEndLive",
    label: "Pause / end live event",
    note: "Confirmation required for end",
  },
  { id: "viewPrivateSquadScores", label: "View private squad scores" },
  { id: "managePayouts", label: "Manage sales & payouts" },
  { id: "manageTeam", label: "Manage team permissions" },
];

const ROLE_BLURB =
  "Owner: full access. Editor: event setup. Moderator: photo and response review. Check-in: admission only. Finance: ledgers and transfers.";

export function listMembers(bearer: string) {
  return backendFetch<MembersPageResponse | MemberApiRow[]>(
    "/organizer/workspace/members",
    { bearer },
  );
}

export function listRoles(bearer: string) {
  return backendFetch<RolesResponse>("/organizer/workspace/roles", {
    bearer,
  });
}

export function inviteMember(
  bearer: string,
  body: InviteBody,
  userAgent?: string | null,
) {
  return backendFetch<MemberApiRow>("/organizer/workspace/members/invites", {
    method: "POST",
    body,
    bearer,
    userAgent,
  });
}

export function resendInvite(
  bearer: string,
  inviteId: string,
  userAgent?: string | null,
) {
  return backendFetch(
    `/organizer/workspace/members/invites/${inviteId}/resend`,
    { method: "POST", body: {}, bearer, userAgent },
  );
}

export function updateMember(
  bearer: string,
  memberId: string,
  body: UpdateMemberBody,
  userAgent?: string | null,
) {
  return backendFetch<MemberApiRow>(
    `/organizer/workspace/members/${memberId}`,
    { method: "PATCH", body, bearer, userAgent },
  );
}

export function removeInvite(
  bearer: string,
  inviteId: string,
  userAgent?: string | null,
) {
  return backendFetch(
    `/organizer/workspace/members/invites/${inviteId}`,
    { method: "DELETE", bearer, userAgent },
  );
}

function asList<T>(payload: T[] | { data?: T[] } | undefined | null): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export function normalizePermissions(
  raw?: Partial<TeamMemberPermissions> | null,
): TeamMemberPermissions {
  return {
    runPrompts: Boolean(raw?.runPrompts),
    pauseEndLive: Boolean(raw?.pauseEndLive),
    viewPrivateSquadScores: Boolean(raw?.viewPrivateSquadScores),
    managePayouts: Boolean(raw?.managePayouts),
    manageTeam: Boolean(raw?.manageTeam),
    editEvents: raw?.editEvents,
    checkIn: raw?.checkIn,
    moderate: raw?.moderate,
  };
}

export function eventAccessLabel(
  access: string | null | undefined,
  labels: string[] | null | undefined,
): string {
  if ((access ?? "").toLowerCase() === "selected") {
    const named = (labels ?? []).map((label) => label.trim()).filter(Boolean);
    if (named.length === 1) return named[0];
    if (named.length > 1) return named.join(", ");
    return "Selected events only";
  }
  return "All events";
}

export function mapMember(row: MemberApiRow): TeamMember {
  const email = row.email?.trim() || "—";
  const name =
    row.fullName?.trim() ||
    (email.includes("@") ? email.split("@")[0] : email) ||
    "Teammate";
  const status =
    (row.status ?? "").toLowerCase() === "pending" ? "pending" : "active";
  const eventAccess =
    (row.eventAccess ?? "").toLowerCase() === "selected" ? "selected" : "all";
  const roleBadges = (row.roles ?? [])
    .map((role) => role.trim())
    .filter(Boolean);
  if (roleBadges.length === 0 && row.role) {
    roleBadges.push(roleLabelFromKey(row.role));
  }
  const uniqueBadges = [
    ...new Set([...(row.isYou ? ["You"] : []), ...roleBadges]),
  ];

  return {
    id: row.id || email,
    name,
    email,
    badges: uniqueBadges,
    detail: `${email} · ${eventAccessLabel(eventAccess, row.experienceLabels)}`,
    resend: status === "pending",
    roleKey: (row.role ?? "editor").toLowerCase(),
    eventAccess,
    experienceIds: Array.isArray(row.experienceIds)
      ? row.experienceIds.filter(Boolean)
      : [],
    status,
    permissions: normalizePermissions(row.permissions),
    isYou: Boolean(row.isYou),
    isOwner: Boolean(row.isOwner),
  };
}

export function mapRole(row: RoleApiRow): RoleOption {
  return {
    key: (row.key ?? "editor").toLowerCase(),
    label: row.label?.trim() || roleLabelFromKey(row.key),
    permissions: normalizePermissions(row.permissions),
  };
}

export function permissionsForUi(
  permissions: TeamMemberPermissions,
): RolePermission[] {
  return PERMISSION_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    allowed: Boolean(permissions[field.id]),
    note: field.note,
  }));
}

function roleLabelFromKey(key: string | null | undefined): string {
  switch ((key ?? "").toLowerCase()) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "moderator":
      return "Moderator";
    case "check_in":
      return "Check-in";
    case "finance":
      return "Finance";
    case "live_operator":
      return "Live operator";
    default:
      return key?.replaceAll("_", " ") || "Member";
  }
}

export function buildTeamData(
  members: TeamMember[],
  roles: RoleOption[],
  total: number,
  workspaceName: string | null,
  selectedMemberId?: string | null,
): TeamData {
  const selected =
    members.find((member) => member.id === selectedMemberId) ??
    members.find((member) => !member.isYou) ??
    members[0] ??
    null;
  const roleOption =
    roles.find((role) => role.key === selected?.roleKey) ?? null;

  return {
    eventMeta: workspaceName
      ? `${workspaceName} · Give people the access they need, and nothing more.`
      : "Give people the access they need, and nothing more.",
    memberCount: `${total} ${total === 1 ? "member" : "members"}`,
    members,
    roles,
    selectedMemberId: selected?.id ?? null,
    role: roleOption?.label ?? roleLabelFromKey(selected?.roleKey),
    eventAccess:
      selected?.eventAccess === "selected"
        ? "Selected events only"
        : "All events",
    permissions: permissionsForUi(
      selected?.permissions ?? normalizePermissions(null),
    ),
    roleKey: ROLE_BLURB,
  };
}

export async function getTeam(options?: {
  selectedMemberId?: string | null;
}): Promise<TeamResult> {
  const bearer = await readToken();
  if (!bearer) return UNAUTHORIZED;

  const [membersResult, rolesResult, workspaceResult] = await Promise.all([
    listMembers(bearer),
    listRoles(bearer),
    getWorkspace(bearer),
  ]);

  if (!membersResult.ok) return toFailure(membersResult);
  if (!rolesResult.ok) return toFailure(rolesResult);

  const page = membersResult.data;
  const rows = asList(page);
  const total =
    page && !Array.isArray(page) && typeof page.total === "number"
      ? page.total
      : rows.length;

  const members = rows.map(mapMember);
  const roles = asList(rolesResult.data).map(mapRole);
  const workspaceName = workspaceResult.ok
    ? normalizeWorkspace(workspaceResult.data)?.name ?? null
    : null;

  return {
    ok: true,
    data: buildTeamData(
      members,
      roles,
      total,
      workspaceName,
      options?.selectedMemberId,
    ),
  };
}
