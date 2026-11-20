export type TeamMemberPermissions = {
  runPrompts: boolean;
  pauseEndLive: boolean;
  viewPrivateSquadScores: boolean;
  managePayouts: boolean;
  manageTeam: boolean;
  editEvents?: boolean;
  checkIn?: boolean;
  moderate?: boolean;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  badges: string[];
  detail: string;
  resend?: boolean;
  roleKey: string;
  eventAccess: "all" | "selected";
  experienceIds: string[];
  status: "active" | "pending";
  permissions: TeamMemberPermissions;
  isYou?: boolean;
  isOwner?: boolean;
};

export type RolePermission = {
  id: string;
  label: string;
  allowed: boolean;
  note?: string;
};

export type RoleOption = {
  key: string;
  label: string;
  permissions: TeamMemberPermissions;
};

export type TeamData = {
  eventMeta: string;
  memberCount: string;
  members: TeamMember[];
  roles: RoleOption[];
  /** Member shown in the Role permissions panel. */
  selectedMemberId: string | null;
  role: string;
  eventAccess: string;
  permissions: RolePermission[];
  roleKey: string;
};
