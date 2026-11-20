import { describe, expect, test } from "vitest";
import {
  isLiveMoment,
  mapLeaderboardRow,
  mapLivePhase,
  mapMomentResponse,
  mapPollOptions,
  mapQueueItem,
  mapReport,
  mapResultsOptions,
  mapSquad,
  momentTitle,
} from "./live-control";

describe("live-control mappers", () => {
  test("mapLivePhase normalizes state strings", () => {
    expect(mapLivePhase("running")).toBe("running");
    expect(mapLivePhase("LIVE")).toBe("running");
    expect(mapLivePhase("paused")).toBe("paused");
    expect(mapLivePhase("ended")).toBe("ended");
    expect(mapLivePhase("weird")).toBe("unknown");
  });

  test("detects live moments", () => {
    expect(isLiveMoment({ status: "live", id: "1" })).toBe(true);
    expect(isLiveMoment({ status: "closed", id: "2" })).toBe(false);
    expect(
      isLiveMoment({
        id: "3",
        startsAt: "2026-10-25T20:00:00Z",
        closedAt: null,
      }),
    ).toBe(true);
  });

  test("momentTitle prefers title then prompt", () => {
    expect(momentTitle({ title: "Look up." })).toBe("Look up.");
    expect(
      momentTitle({ type: "wrong_answers", content: { prompt: "What is the DJ doing?" } }),
    ).toBe("What is the DJ doing?");
  });

  test("mapQueueItem labels scheduled and closed rows", () => {
    expect(
      mapQueueItem(
        { id: "q1", title: "Find Something Blue", status: "scheduled", type: "photo_prompt" },
        "Africa/Lagos",
      ),
    ).toMatchObject({ title: "Find Something Blue", status: "Ready" });

    expect(
      mapQueueItem(
        {
          id: "q2",
          title: "One has to go",
          status: "closed",
          responseCount: 240,
          closedAt: "2026-10-25T20:32:00Z",
        },
        "Africa/Lagos",
      ).status,
    ).toBe("240 responses");
  });

  test("mapPollOptions computes percents", () => {
    expect(
      mapPollOptions({
        content: {
          options: [
            { label: "Afrobeats", votes: 55 },
            { label: "House", votes: 45 },
          ],
        },
      }),
    ).toEqual([
      { label: "Afrobeats", percent: 55, votes: 55, emphasize: true },
      { label: "House", percent: 45, votes: 45, emphasize: false },
    ]);
  });

  test("mapSquad and mapReport", () => {
    expect(
      mapSquad({
        name: "Neon Nomads",
        points: 1340,
        memberCount: 8,
        missionsCompleted: 5,
      }),
    ).toEqual({
      name: "Neon Nomads",
      points: 1340,
      detail: "8 members · 5 missions completed",
    });

    expect(
      mapReport(
        {
          id: "r1",
          text: "Flagged joke",
          author: "Tunde",
          createdAt: "2026-10-25T20:40:00Z",
          laughs: 3,
        },
        "UTC",
      ),
    ).toMatchObject({
      text: "Flagged joke",
      author: "Tunde",
      laughs: 3,
      flagged: true,
    });
  });

  test("mapMomentResponse and mapResultsOptions", () => {
    expect(
      mapMomentResponse(
        {
          id: "a1",
          text: "Updating Windows.",
          author: "Kemi",
          createdAt: "2026-10-25T20:41:08Z",
          laughs: 24,
          flagged: false,
        },
        "UTC",
      ),
    ).toMatchObject({
      id: "a1",
      text: "Updating Windows.",
      author: "Kemi",
      laughs: 24,
      flagged: false,
    });

    expect(
      mapResultsOptions({
        respondents: 240,
        options: [
          { id: "opt_1", label: "We should hang soon", votes: 132, percent: 55 },
          { id: "opt_2", label: "Maybe next week", votes: 108, percent: 45 },
        ],
      }),
    ).toEqual([
      {
        label: "We should hang soon",
        percent: 55,
        votes: 132,
        emphasize: true,
      },
      {
        label: "Maybe next week",
        percent: 45,
        votes: 108,
        emphasize: false,
      },
    ]);
  });

  test("mapLeaderboardRow", () => {
    expect(
      mapLeaderboardRow({
        userId: "u1",
        displayName: "Femisola",
        points: 2480,
      }),
    ).toEqual({ name: "Femisola", points: 2480 });
  });
});
