import type { TicketType } from "@/lib/event-setup/types";
import { backendFetch, type BackendResult } from "./backend";

/** `POST /organizer/experiences` */
export type CreateExperienceBody = {
  title: string;
  category: string;
  city: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
};

export type CreateExperienceResponse = {
  id: string;
};

/** `POST|PATCH .../ticket-types` */
export type TicketTypeWriteBody = {
  name?: string;
  priceAmount?: number;
  quantityTotal?: number;
  guestsPerTicket?: number;
  description?: string;
};

export type TicketTypeResponse = {
  id: string;
  name?: string;
  priceAmount?: number;
  quantityTotal?: number;
  price?: { amount?: number; currency?: string | null };
  quantity?: number;
  description?: string;
  guestsPerTicket?: number;
};

export function createExperience(
  bearer: string,
  body: CreateExperienceBody,
  userAgent?: string | null,
): Promise<BackendResult<CreateExperienceResponse>> {
  return backendFetch<CreateExperienceResponse>("/organizer/experiences", {
    method: "POST",
    body,
    bearer,
    userAgent,
  });
}

export function createTicketType(
  bearer: string,
  experienceId: string,
  body: TicketTypeWriteBody,
  userAgent?: string | null,
): Promise<BackendResult<TicketTypeResponse>> {
  return backendFetch<TicketTypeResponse>(
    `/organizer/experiences/${experienceId}/ticket-types`,
    { method: "POST", body, bearer, userAgent },
  );
}

export function updateTicketType(
  bearer: string,
  experienceId: string,
  ticketTypeId: string,
  body: TicketTypeWriteBody,
  userAgent?: string | null,
): Promise<BackendResult<TicketTypeResponse>> {
  return backendFetch<TicketTypeResponse>(
    `/organizer/experiences/${experienceId}/ticket-types/${ticketTypeId}`,
    { method: "PATCH", body, bearer, userAgent },
  );
}

export function deleteTicketType(
  bearer: string,
  experienceId: string,
  ticketTypeId: string,
  userAgent?: string | null,
): Promise<BackendResult<unknown>> {
  return backendFetch(
    `/organizer/experiences/${experienceId}/ticket-types/${ticketTypeId}`,
    { method: "DELETE", bearer, userAgent },
  );
}

/** Accept `{ id }` or nested `{ data | experience: { id } }`. */
export function normalizeExperienceId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.id === "string" && obj.id) return obj.id;
  for (const key of ["data", "experience"] as const) {
    const inner = obj[key];
    if (inner && typeof inner === "object") {
      const nested = inner as Record<string, unknown>;
      if (typeof nested.id === "string" && nested.id) return nested.id;
    }
  }
  return null;
}

/** Map API ticket payload → draft `TicketType`. */
export function normalizeTicketType(
  payload: unknown,
  fallback?: Partial<TicketType>,
): TicketType | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id : fallback?.id;
  if (!id) return null;

  const priceNested =
    obj.price && typeof obj.price === "object"
      ? (obj.price as Record<string, unknown>)
      : null;
  const price =
    typeof obj.priceAmount === "number"
      ? obj.priceAmount
      : typeof priceNested?.amount === "number"
        ? priceNested.amount
        : (fallback?.price ?? 0);
  const quantity =
    typeof obj.quantityTotal === "number"
      ? obj.quantityTotal
      : typeof obj.quantity === "number"
        ? obj.quantity
        : (fallback?.quantity ?? 0);

  return {
    id,
    name:
      typeof obj.name === "string" && obj.name
        ? obj.name
        : (fallback?.name ?? "Ticket"),
    price,
    quantity,
    guestsPerTicket:
      typeof obj.guestsPerTicket === "number"
        ? obj.guestsPerTicket
        : (fallback?.guestsPerTicket ?? 1),
    description:
      typeof obj.description === "string"
        ? obj.description
        : (fallback?.description ?? ""),
  };
}

