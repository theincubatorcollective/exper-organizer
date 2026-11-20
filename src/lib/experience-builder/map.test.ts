import { describe, expect, test } from "vitest";
import {
  apiPromptToBuilder,
  builderPromptToApi,
  parseDurationSeconds,
  typeFromFormat,
} from "./map";

describe("experience-builder map", () => {
  test("maps API room_vote into builder prompt fields", () => {
    const prompt = apiPromptToBuilder(
      {
        id: "p1",
        type: "room_vote",
        title: "One has to go",
        supportingText: "Pick one",
        scheduledAt: "2026-12-01T20:30:00.000Z",
        durationSeconds: 120,
        audience: "checked_in",
        rewardPoints: 50,
        moderation: "none",
        status: "ready",
      },
      0,
      "UTC",
    );
    expect(prompt).toMatchObject({
      id: "p1",
      kind: "poll",
      format: "Multiple choice",
      durationLabel: "2 min",
      audience: "All checked-in attendees",
      title: "One has to go",
    });
  });

  test("builderPromptToApi round-trips type and duration", () => {
    expect(typeFromFormat("Wrong answers only")).toBe("wrong_answers");
    expect(parseDurationSeconds("03:00 minutes")).toBe(180);
    const body = builderPromptToApi(
      {
        id: "local-1",
        title: "Probe",
        time: "21:15",
        kind: "text",
        kindLabel: "Text",
        durationLabel: "3 min",
        status: "ready",
        statusLabel: "Ready",
        format: "Wrong answers only",
        supportingText: "Go",
        audience: "All checked-in attendees",
        duration: "03:00 minutes",
        responseLimit: "One",
        moderation: "On · Flagged",
        scoring: "x",
        ctaLabel: "Send",
        answerPlaceholder: "…",
      },
      "2026-12-01T00:00:00.000Z",
    );
    expect(body).toMatchObject({
      type: "wrong_answers",
      title: "Probe",
      durationSeconds: 180,
      moderation: "required",
      scheduledAt: "2026-12-01T21:15:00.000Z",
    });
    expect(body.id).toBeUndefined();
  });
});
