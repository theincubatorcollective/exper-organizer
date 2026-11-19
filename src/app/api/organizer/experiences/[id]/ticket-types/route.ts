import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  createTicketType,
  normalizeTicketType,
  type TicketTypeWriteBody,
} from "@/lib/server/ticket-types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId } = await params;
  if (!experienceId) {
    return Response.json({ message: "experienceId is required." }, { status: 400 });
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const name =
    typeof parsed.body.name === "string" ? parsed.body.name.trim() : "";
  const priceAmount =
    typeof parsed.body.priceAmount === "number" ? parsed.body.priceAmount : NaN;
  const quantityTotal =
    typeof parsed.body.quantityTotal === "number"
      ? parsed.body.quantityTotal
      : NaN;

  if (!name || !Number.isFinite(priceAmount) || !Number.isFinite(quantityTotal)) {
    return Response.json(
      { message: "name, priceAmount and quantityTotal are required." },
      { status: 400 },
    );
  }

  const body: TicketTypeWriteBody = { name, priceAmount, quantityTotal };
  const result = await createTicketType(
    auth.bearer,
    experienceId,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);

  const ticket = normalizeTicketType(result.data, {
    name,
    price: priceAmount,
    quantity: quantityTotal,
  });
  if (!ticket) {
    return Response.json(
      { message: "Ticket type was created but could not be read." },
      { status: 502 },
    );
  }

  return Response.json(ticket, { status: result.status === 201 ? 201 : 200 });
}
