import { errorResponse, parseJsonBody, type BackendResult } from "./backend";
import { readToken } from "./overview";

export async function requireBearer(): Promise<
  { bearer: string } | { error: Response }
> {
  const bearer = await readToken();
  if (!bearer) {
    return {
      error: Response.json({ message: "Sign in to continue." }, { status: 401 }),
    };
  }
  return { bearer };
}

export async function readJsonBody(
  request: Request,
): Promise<{ body: Record<string, unknown> } | { error: Response }> {
  return parseJsonBody(request);
}

export function fromBackend<T>(result: BackendResult<T>): Response {
  if (!result.ok) return errorResponse(result);
  if (result.status === 204) return new Response(null, { status: 204 });
  return Response.json(result.data ?? {}, { status: result.status });
}
