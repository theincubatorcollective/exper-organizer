import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildEventMeta,
  formatCheckInClock,
  normalizeGuest,
  selectDoorExperience,
} from "./attendees";

describe("selectDoorExperience", () => {
  const now = new Date("2026-10-25T20:00:00Z");
  const events = [
    {
      id: "draft-1",
      title: "Draft Night",
      status: "draft",
      startsAt: "2026-11-01T19:00:00Z",
      endsAt: "2026-11-02T02:00:00Z",
      venue: { name: "Yard", city: "Lagos" },
    },
    {
      id: "live-1",
      title: "Live Night",
      status: "published",
      startsAt: "2026-10-25T18:00:00Z",
      endsAt: "2026-10-26T02:00:00Z",
      venue: { name: "Beach", city: "Lagos" },
    },
  ];

  test("prefers an explicit experienceId", () => {
    expect(selectDoorExperience(events, now, "draft-1")?.id).toBe("draft-1");
  });

  test("falls back to the published hero when live", () => {
    expect(selectDoorExperience(events, now)?.id).toBe("live-1");
  });

  test("falls back to the newest event when nothing is published", () => {
    expect(selectDoorExperience([events[0]], now)?.id).toBe("draft-1");
  });
});

describe("normalizeGuest", () => {
  test("maps checked-in and pending rows", () => {
    expect(
      normalizeGuest(
        {
          passId: "p1",
          fullName: "Ada Okafor",
          checkedInAt: "2026-10-25T20:38:00Z",
          ticketType: { name: "General Access" },
          number: "NS-0428",
          code: "AAAA-BBBB",
        },
        "Africa/Lagos",
      ),
    ).toMatchObject({
      id: "p1",
      name: "Ada Okafor",
      status: "checked-in",
      ticket: "General Access · NS-0428",
      code: "AAAA-BBBB",
      checkedInAt: formatCheckInClock("2026-10-25T20:38:00Z", "Africa/Lagos"),
    });

    expect(
      normalizeGuest(
        {
          id: "p2",
          name: "Dami",
          checkedInAt: null,
          ticketTypeName: "VIP",
          code: "CCCC",
        },
        "UTC",
      ),
    ).toMatchObject({
      id: "p2",
      status: "pending",
      ticket: "VIP · CCCC",
      code: "CCCC",
    });
  });
});

describe("buildEventMeta", () => {
  test("joins title, venue, timezone and date", () => {
    expect(
      buildEventMeta(
        {
          id: "e1",
          title: "Neon Solstice",
          status: "published",
          startsAt: "2024-10-25T19:00:00Z",
          endsAt: "2024-10-26T02:00:00Z",
          venue: { name: null, city: "Lagos" },
        },
        {
          timezone: "Africa/Lagos",
          venue: { name: "Main entrance", city: "Lagos" },
          startsAt: "2024-10-25T19:00:00Z",
        },
      ),
    ).toBe("Neon Solstice · Main entrance · Africa/Lagos · 25 Oct 2024");
  });
});

describe("checkInPass path", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", "http://backend.test");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("POSTs the pass code", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ outcome: "admitted" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { checkInPass } = await import("./attendees");
    const result = await checkInPass("tok", "exp-1", "3F9A-C21B-77D0-4E8E");
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { outcome: "admitted" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://backend.test/api/v1/organizer/experiences/exp-1/check-in",
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ code: "3F9A-C21B-77D0-4E8E" }));
  });
});
