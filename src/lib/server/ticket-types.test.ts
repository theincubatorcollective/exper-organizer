import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  createExperience,
  createTicketType,
  deleteTicketType,
  normalizeExperienceId,
  normalizeTicketType,
  updateTicketType,
} from "./ticket-types";

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

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("normalizeExperienceId", () => {
  test("reads flat and nested ids", () => {
    expect(normalizeExperienceId({ id: "exp-1" })).toBe("exp-1");
    expect(normalizeExperienceId({ data: { id: "exp-2" } })).toBe("exp-2");
    expect(normalizeExperienceId({ experience: { id: "exp-3" } })).toBe("exp-3");
    expect(normalizeExperienceId({})).toBeNull();
  });
});

describe("normalizeTicketType", () => {
  test("maps priceAmount / quantityTotal", () => {
    expect(
      normalizeTicketType({
        id: "tt-1",
        name: "General",
        priceAmount: 25000,
        quantityTotal: 100,
      }),
    ).toEqual({
      id: "tt-1",
      name: "General",
      price: 25000,
      quantity: 100,
      guestsPerTicket: 1,
      description: "",
    });
  });

  test("maps nested price.amount and quantity", () => {
    expect(
      normalizeTicketType({
        id: "tt-2",
        name: "VIP",
        price: { amount: 65000, currency: "NGN" },
        quantity: 50,
        description: "Mezzanine",
        guestsPerTicket: 1,
      }),
    ).toMatchObject({
      id: "tt-2",
      price: 65000,
      quantity: 50,
      description: "Mezzanine",
    });
  });
});

describe("ticket-types API helpers", () => {
  test("createExperience POSTs the draft body", async () => {
    fetchMock.mockResolvedValue(json({ id: "exp-9" }, { status: 201 }));
    const body = {
      title: "Sound/Scape",
      category: "music",
      city: "Lagos",
      venueName: "The Yard",
      startsAt: "2026-11-14T19:00:00Z",
      endsAt: "2026-11-15T02:00:00Z",
      capacity: 500,
    };
    const result = await createExperience("tok", body);
    expect(result).toEqual({ ok: true, status: 201, data: { id: "exp-9" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test/api/v1/organizer/experiences");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(body));
    expect(init.headers.authorization).toBe("Bearer tok");
  });

  test("createTicketType POSTs under the experience", async () => {
    fetchMock.mockResolvedValue(
      json({ id: "tt-1", name: "General", priceAmount: 5000, quantityTotal: 10 }),
    );
    await createTicketType("tok", "exp-1", {
      name: "General",
      priceAmount: 5000,
      quantityTotal: 10,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://backend.test/api/v1/organizer/experiences/exp-1/ticket-types",
    );
    expect(init.method).toBe("POST");
  });

  test("updateTicketType PATCHes priceAmount", async () => {
    fetchMock.mockResolvedValue(json({ id: "tt-1", priceAmount: 6000 }));
    await updateTicketType("tok", "exp-1", "tt-1", { priceAmount: 6000 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://backend.test/api/v1/organizer/experiences/exp-1/ticket-types/tt-1",
    );
    expect(init.method).toBe("PATCH");
  });

  test("deleteTicketType uses DELETE", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const result = await deleteTicketType("tok", "exp-1", "tt-1");
    expect(result).toMatchObject({ ok: true, status: 204 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://backend.test/api/v1/organizer/experiences/exp-1/ticket-types/tt-1",
    );
    expect(init.method).toBe("DELETE");
  });
});
