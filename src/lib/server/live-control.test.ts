import { describe, expect, test } from "vitest";
import {
  isLiveMoment,
  mapPollOptions,
  mapQueueItem,
  mapReport,
  mapSquad,
  momentTitle,
} from "./live-control";

describe("live-control mappers", () => {
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
});
