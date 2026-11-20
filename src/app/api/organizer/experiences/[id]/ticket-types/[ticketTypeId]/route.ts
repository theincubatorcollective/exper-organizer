import {
  fromBackend,
  readJsonBody,
  requireBearer,
} from "@/lib/server/organizer-api";
import {
  deleteTicketType,
  normalizeTicketType,
  updateTicketType,
  type TicketTypeWriteBody,
} from "@/lib/server/ticket-types";

type Params = { params: Promise<{ id: string; ticketTypeId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId, ticketTypeId } = await params;
  if (!experienceId || !ticketTypeId) {
    return Response.json(
      { message: "experienceId and ticketTypeId are required." },
      { status: 400 },
    );
  }

  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const body: TicketTypeWriteBody = {};
  if (typeof parsed.body.name === "string") body.name = parsed.body.name.trim();
  if (typeof parsed.body.priceAmount === "number") {
    body.priceAmount = parsed.body.priceAmount;
  }
  if (typeof parsed.body.quantityTotal === "number") {
    body.quantityTotal = parsed.body.quantityTotal;
  }
  if (typeof parsed.body.guestsPerTicket === "number") {
    body.guestsPerTicket = parsed.body.guestsPerTicket;
  }
  if (typeof parsed.body.description === "string") {
    body.description = parsed.body.description.trim();
  }

  if (
    body.name === undefined &&
    body.priceAmount === undefined &&
    body.quantityTotal === undefined &&
    body.guestsPerTicket === undefined &&
    body.description === undefined
  ) {
    return Response.json(
      {
        message:
          "Provide name, priceAmount, quantityTotal, guestsPerTicket or description to update.",
      },
      { status: 400 },
    );
  }

  const result = await updateTicketType(
    auth.bearer,
    experienceId,
    ticketTypeId,
    body,
    request.headers.get("user-agent"),
  );
  if (!result.ok) return fromBackend(result);

  const ticket = normalizeTicketType(result.data, {
    id: ticketTypeId,
    name: body.name,
    price: body.priceAmount,
    quantity: body.quantityTotal,
    guestsPerTicket: body.guestsPerTicket,
    description: body.description,
  });

  return Response.json(ticket ?? { id: ticketTypeId, ...body }, {
    status: result.status,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireBearer();
  if ("error" in auth) return auth.error;

  const { id: experienceId, ticketTypeId } = await params;
  if (!experienceId || !ticketTypeId) {
    return Response.json(
      { message: "experienceId and ticketTypeId are required." },
      { status: 400 },
    );
  }

  const result = await deleteTicketType(
    auth.bearer,
    experienceId,
    ticketTypeId,
    _request.headers.get("user-agent"),
  );
  return fromBackend(result);
}
