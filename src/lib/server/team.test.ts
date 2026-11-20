import { describe, expect, test } from "vitest";
import {
  buildTeamData,
  eventAccessLabel,
  mapMember,
  mapRole,
  normalizePermissions,
  permissionsForUi,
} from "./team";

describe("team mappers", () => {
  test("mapMember builds badges, detail and pending resend", () => {
    expect(
      mapMember({
        id: "m1",
        fullName: "Tope Adewale",
        email: "tope@afterhours.studio",
        role: "owner",
        roles: ["Owner"],
        eventAccess: "all",
        experienceLabels: [],
        status: "active",
        isYou: true,
        isOwner: true,
        permissions: {
          runPrompts: true,
          pauseEndLive: true,
          viewPrivateSquadScores: true,
          managePayouts: true,
          manageTeam: true,
        },
      }),
    ).toMatchObject({
      name: "Tope Adewale",
      badges: ["You", "Owner"],
      detail: "tope@afterhours.studio · All events",
      resend: false,
      roleKey: "owner",
    });

    expect(
      mapMember({
        id: "inv1",
        fullName: null,
        email: "nia@afterhours.studio",
        role: "editor",
        roles: ["Editor", "Invite pending"],
        eventAccess: "selected",
        experienceLabels: ["Nairobi Frequency"],
        status: "pending",
      }),
    ).toMatchObject({
      name: "nia",
      badges: ["Editor", "Invite pending"],
      detail: "nia@afterhours.studio · Nairobi Frequency",
      resend: true,
      status: "pending",
    });
  });

  test("eventAccessLabel and permissionsForUi", () => {
    expect(eventAccessLabel("all", [])).toBe("All events");
    expect(eventAccessLabel("selected", ["Neon Solstice"])).toBe(
      "Neon Solstice",
    );
    expect(
      permissionsForUi(
        normalizePermissions({
          runPrompts: true,
          pauseEndLive: true,
          viewPrivateSquadScores: true,
          managePayouts: false,
          manageTeam: false,
        }),
      ).filter((row) => row.allowed),
    ).toHaveLength(3);
  });

  test("buildTeamData selects live operator style panel", () => {
    const data = buildTeamData(
      [
        mapMember({
          id: "m1",
          fullName: "Tope",
          email: "tope@x.com",
          role: "owner",
          roles: ["Owner"],
          isYou: true,
          eventAccess: "all",
          status: "active",
          permissions: normalizePermissions({
            runPrompts: true,
            pauseEndLive: true,
            viewPrivateSquadScores: true,
            managePayouts: true,
            manageTeam: true,
          }),
        }),
        mapMember({
          id: "m5",
          fullName: "Ama Mensah",
          email: "ama@x.com",
          role: "live_operator",
          roles: ["Live operator"],
          eventAccess: "selected",
          experienceLabels: ["Accra After Dark"],
          status: "active",
          permissions: normalizePermissions({
            runPrompts: true,
            pauseEndLive: true,
            viewPrivateSquadScores: true,
            managePayouts: false,
            manageTeam: false,
          }),
        }),
      ],
      [
        mapRole({
          key: "live_operator",
          label: "Live operator",
          permissions: {
            runPrompts: true,
            pauseEndLive: true,
            viewPrivateSquadScores: true,
            managePayouts: false,
            manageTeam: false,
          },
        }),
      ],
      2,
      "Afterhours studio",
    );

    expect(data.selectedMemberId).toBe("m5");
    expect(data.role).toBe("Live operator");
    expect(data.eventAccess).toBe("Selected events only");
    expect(data.memberCount).toBe("2 members");
    expect(data.eventMeta).toContain("Afterhours studio");
  });
});
