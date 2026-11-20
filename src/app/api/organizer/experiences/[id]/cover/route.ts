import { errorResponse } from "@/lib/server/backend";
import { requireBearer } from "@/lib/server/organizer-api";

type Params = { params: Promise<{ id: string }> };

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

/** Proxies `POST .../cover` multipart `file` to the organizer backend. */
export async function POST(request: Request, { params }: Params) {
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: "Send a multipart form with a file." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ message: "A cover image file is required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { message: "Cover image must be 8 MB or smaller." },
      { status: 400 },
    );
  }
  const type = file.type || "application/octet-stream";
  if (!ACCEPTED.has(type)) {
    return Response.json(
      { message: "Use a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }

  const outbound = new FormData();
  outbound.set("file", file, file.name || "cover");

  let response: Response;
  try {
    response = await fetch(
      `${base}/api/v1/organizer/experiences/${experienceId}/cover`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${auth.bearer}`,
          "user-agent": `Exper-Organizer/0.1.0 (${request.headers.get("user-agent") ?? "unknown"})`,
        },
        body: outbound,
        cache: "no-store",
      },
    );
  } catch {
    return errorResponse({
      ok: false,
      status: 502,
      message: "Couldn't reach the server. Try again.",
    });
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!response.ok) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { message?: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : "Couldn't upload the cover image.";
    return Response.json({ message }, { status: response.status });
  }

  return Response.json(parsed ?? {}, { status: response.status });
}
