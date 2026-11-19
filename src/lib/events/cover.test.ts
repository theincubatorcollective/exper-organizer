import { describe, expect, test } from "vitest";
import {
  coverFromExperiencePayload,
  eventCoverSrc,
  fallbackEventCover,
} from "./cover";

describe("event covers", () => {
  test("fallback is stable for the same id", () => {
    expect(fallbackEventCover("exp-1")).toBe(fallbackEventCover("exp-1"));
  });

  test("eventCoverSrc prefers the API url", () => {
    expect(eventCoverSrc("https://cdn.test/a.jpg", "exp-1")).toBe(
      "https://cdn.test/a.jpg",
    );
  });

  test("eventCoverSrc falls back when blank", () => {
    expect(eventCoverSrc(null, "exp-1")).toMatch(/^\/(events|overview)\//);
  });

  test("coverFromExperiencePayload reads nested shapes", () => {
    expect(
      coverFromExperiencePayload({ coverUrl: "https://cdn.test/b.jpg" }),
    ).toBe("https://cdn.test/b.jpg");
    expect(
      coverFromExperiencePayload({ cover: { url: "https://cdn.test/c.jpg" } }),
    ).toBe("https://cdn.test/c.jpg");
  });
});
