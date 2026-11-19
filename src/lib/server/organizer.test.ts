import { describe, expect, test } from "vitest";
import {
  experiencesFrom,
  normalizeExperiences,
  normalizeWorkspace,
  workspaceNameFrom,
} from "./organizer";

describe("normalizeWorkspace", () => {
  test("reads a flat workspace", () => {
    expect(normalizeWorkspace({ id: "w1", name: "Studio" })).toEqual({
      id: "w1",
      name: "Studio",
    });
  });

  test("reads nested data and workspace envelopes", () => {
    expect(normalizeWorkspace({ data: { id: "w1", name: "Nested" } })).toEqual({
      id: "w1",
      name: "Nested",
    });
    expect(
      normalizeWorkspace({ workspace: { id: "w2", name: "Wrapped" } }),
    ).toEqual({ id: "w2", name: "Wrapped" });
  });
});

describe("normalizeExperiences", () => {
  test("reads data, experiences, or a bare array", () => {
    const row = {
      id: "e1",
      title: "Night",
      status: "draft",
      startsAt: "2026-01-01T00:00:00Z",
      endsAt: "2026-01-01T02:00:00Z",
      venue: { name: null, city: null },
    };
    expect(normalizeExperiences({ data: [row] })).toEqual([row]);
    expect(normalizeExperiences({ experiences: [row] })).toEqual([row]);
    expect(normalizeExperiences([row])).toEqual([row]);
    expect(normalizeExperiences({})).toEqual([]);
  });
});

describe("workspaceNameFrom", () => {
  test("prefers a successful workspace payload", () => {
    expect(
      workspaceNameFrom(
        { ok: true, status: 200, data: { id: "w1", name: "From workspace" } },
        {
          user: { fullName: "A", email: "a@x.io" },
          workspace: { id: "w1", name: "From me" },
        },
      ),
    ).toBe("From workspace");
  });

  test("falls back to me.workspace when workspace fails", () => {
    expect(
      workspaceNameFrom(
        { ok: false, status: 404, message: "missing" },
        {
          user: { fullName: "A", email: "a@x.io" },
          workspace: { id: "w1", name: "From me" },
        },
      ),
    ).toBe("From me");
  });
});

describe("experiencesFrom", () => {
  test("returns [] for failures", () => {
    expect(
      experiencesFrom({ ok: false, status: 500, message: "boom" }),
    ).toEqual([]);
  });
});
