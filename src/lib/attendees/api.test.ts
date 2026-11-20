import { afterEach, describe, expect, test, vi } from "vitest";
import { exportGuestList } from "./api";

describe("exportGuestList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("downloads CSV when the BFF returns a blob", async () => {
    const click = vi.fn();
    const createElement = vi
      .spyOn(document, "createElement")
      .mockImplementation(() => ({ click }) as unknown as HTMLAnchorElement);
    const createObjectURL = vi.fn(() => "blob:guests");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("name,email\nAda,ada@example.com\n", {
          status: 200,
          headers: { "content-type": "text/csv" },
        }),
      ),
    );

    const result = await exportGuestList("exp-1", {
      q: "Ada",
      status: "pending",
    });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "/api/organizer/experiences/exp-1/guests/export?q=Ada&status=pending",
    );
    expect(createElement).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:guests");
  });

  test("opens a signed URL when the BFF returns JSON", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ url: "https://cdn.example/guests.csv" }, { status: 200 }),
      ),
    );

    const result = await exportGuestList("exp-2");
    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledWith(
      "https://cdn.example/guests.csv",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("surfaces API error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Export not ready." }, { status: 404 }),
      ),
    );

    const result = await exportGuestList("exp-3");
    expect(result).toEqual({
      ok: false,
      status: 404,
      message: "Export not ready.",
    });
  });
});
