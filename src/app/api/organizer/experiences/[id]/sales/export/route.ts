import { errorResponse } from "@/lib/server/backend";
import { requireBearer } from "@/lib/server/organizer-api";

type Params = { params: Promise<{ id: string }> };

/** Proxies CSV (or JSON error) from `GET .../sales/export`. */
export async function GET(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const base = process.env.BACKEND_URL?.replace(/\/+$/, "");
  if (!base) {
    return Response.json(
      { message: "The backend is not configured. Set BACKEND_URL." },
      { status: 500 },
    );
  }

  const incoming = new URL(request.url);
  const query = incoming.searchParams.toString();
  const target = `${base}/api/v1/organizer/experiences/${experienceId}/sales/export${
    query ? `?${query}` : ""
  }`;

  let response: Response;
  try {
    response = await fetch(target, {
      method: "GET",
      headers: {
        accept: "text/csv, application/json",
        authorization: `Bearer ${auth.bearer}`,
        "user-agent": `Exper-Organizer/0.1.0 (${request.headers.get("user-agent") ?? "unknown"})`,
      },
      cache: "no-store",
    });
  } catch {
    return errorResponse({
      ok: false,
      status: 502,
      message: "Couldn't reach the server. Try again.",
    });
  }

  const text = await response.text();
  if (!response.ok) {
    let message = "Couldn't export the sales statement.";
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { message?: unknown }).message === "string"
      ) {
        message = (parsed as { message: string }).message;
      }
    } catch {
      // keep default
    }
    return Response.json({ message }, { status: response.status });
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json") || text.trim().startsWith("{")) {
    try {
      const parsed = text ? JSON.parse(text) : {};
      return Response.json(parsed ?? {}, { status: response.status });
    } catch {
      return Response.json(
        { message: "Couldn't read the export response." },
        { status: 502 },
      );
    }
  }

  const disposition =
    response.headers.get("content-disposition") ||
    `attachment; filename="sales-${experienceId}.csv"`;

  return new Response(text, {
    status: response.status,
    headers: {
      "content-type": contentType || "text/csv; charset=utf-8",
      "content-disposition": disposition,
    },
  });
}
