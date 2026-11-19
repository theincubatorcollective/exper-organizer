import { describe, expect, test } from "vitest";
import {
  sortFor,
  statusFromExperiencePayload,
  tabFor,
  tabForExperiencePayload,
} from "./classify";
import type { EventRow } from "./types";

const START = "2026-11-10T18:00:00Z";
const END = "2026-11-10T23:00:00Z";

const row = (over: Partial<EventRow> & { id: string }): EventRow => ({
  title: `Event ${over.id}`,
  status: "published",
  startsAt: START,
  endsAt: END,
  venue: { name: null, city: null },
  coverImageUrl: null,
  timezone: "UTC",
  capacity: null,
  sold: null,
  currency: null,
  ...over,
});

describe("tabFor", () => {
  test("a draft is a draft even when its start date has passed", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    expect(tabFor({ status: "draft", startsAt: START, endsAt: END }, now)).toBe("drafts");
  });

  test("published and not yet started is upcoming", () => {
    const now = new Date("2026-11-10T17:59:59Z");
    expect(tabFor({ status: "published", startsAt: START, endsAt: END }, now)).toBe("upcoming");
  });

  test("accepts Published casing and live/active aliases", () => {
    const now = new Date("2026-11-10T17:59:59Z");
    expect(tabFor({ status: "Published", startsAt: START, endsAt: END }, now)).toBe("upcoming");
    expect(tabFor({ status: "ACTIVE", startsAt: START, endsAt: END }, now)).toBe("upcoming");
  });

  test("invalid dates keep a published event out of upcoming/live/past", () => {
    const now = new Date("2026-11-10T17:59:59Z");
    expect(
      tabFor({ status: "published", startsAt: "not-a-date", endsAt: END }, now),
    ).toBe("drafts");
  });

  test("is live exactly at the start", () => {
    const now = new Date(START);
    expect(tabFor({ status: "published", startsAt: START, endsAt: END }, now)).toBe("live");
  });

  test("is live exactly at the end", () => {
    const now = new Date(END);
    expect(tabFor({ status: "published", startsAt: START, endsAt: END }, now)).toBe("live");
  });

  test("is past once the end has gone by", () => {
    const now = new Date("2026-11-10T23:00:01Z");
    expect(tabFor({ status: "published", startsAt: START, endsAt: END }, now)).toBe("past");
  });
});

describe("sortFor", () => {
  const a = row({ id: "a", startsAt: "2026-11-01T10:00:00Z" });
  const b = row({ id: "b", startsAt: "2026-11-05T10:00:00Z" });
  const c = row({ id: "c", startsAt: "2026-11-03T10:00:00Z" });
  const ids = (rows: EventRow[]) => rows.map((r) => r.id);

  test("upcoming runs soonest first", () => {
    expect(ids(sortFor("upcoming", [b, a, c]))).toEqual(["a", "c", "b"]);
  });

  test("past runs most recent first", () => {
    expect(ids(sortFor("past", [a, b, c]))).toEqual(["b", "c", "a"]);
  });

  test("live and drafts run by start ascending", () => {
    expect(ids(sortFor("live", [b, a, c]))).toEqual(["a", "c", "b"]);
    expect(ids(sortFor("drafts", [b, a, c]))).toEqual(["a", "c", "b"]);
  });

  test("returns a new array and leaves the input alone", () => {
    const input = [b, a];
    const out = sortFor("upcoming", input);
    expect(out).not.toBe(input);
    expect(ids(input)).toEqual(["b", "a"]);
  });
});

describe("statusFromExperiencePayload", () => {
  test("reads status, publishedAt, and nested envelopes", () => {
    expect(statusFromExperiencePayload({ status: "draft" })).toBe("draft");
    expect(statusFromExperiencePayload({ status: "Published" })).toBe("published");
    expect(
      statusFromExperiencePayload({ publishedAt: "2026-11-17T12:00:00Z" }),
    ).toBe("published");
    expect(
      statusFromExperiencePayload({ data: { state: "published" } }),
    ).toBe("published");
  });
});

describe("tabForExperiencePayload", () => {
  test("published past dates land on Past, not Upcoming", () => {
    const now = new Date("2026-11-17T21:00:00Z");
    expect(
      tabForExperiencePayload(
        {
          status: "published",
          startsAt: "2026-10-25T19:00:00Z",
          endsAt: "2026-10-26T02:30:00Z",
        },
        now,
      ),
    ).toBe("past");
  });

  test("published future dates land on Upcoming", () => {
    const now = new Date("2026-11-17T21:00:00Z");
    expect(
      tabForExperiencePayload(
        {
          status: "published",
          startsAt: "2026-11-20T19:00:00Z",
          endsAt: "2026-11-21T02:30:00Z",
        },
        now,
      ),
    ).toBe("upcoming");
  });
});
