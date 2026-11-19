"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/overview/Card";
import {
  createExperienceFromDraft,
  createTicketTypeOnExperience,
  deleteTicketTypeOnExperience,
  isPersistedTicketId,
} from "@/lib/event-setup/api";
import { formatNaira, totalGuestCapacity } from "@/lib/event-setup/mock";
import type { AccessMode } from "@/lib/event-setup/types";
import { useEventSetup } from "../EventSetupProvider";
import { SetupField, SetupInput, SetupSelect } from "../SetupField";
import { SetupShell } from "../SetupShell";

const CURRENCIES = [
  { value: "NGN", label: "NGN — Nigerian naira" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "GHS", label: "GHS — Ghanaian cedi" },
  { value: "KES", label: "KES — Kenyan shilling" },
  { value: "USD", label: "USD — US dollar" },
];

const MODES: { id: AccessMode; label: string }[] = [
  { id: "paid", label: "Paid access" },
  { id: "free", label: "Free RSVP" },
  { id: "invite", label: "Invite only" },
];

export function AccessStep() {
  const { draft, setDraft, addTicket, removeTicket } = useEventSetup();
  const capacity = totalGuestCapacity(draft.tickets);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("25000");
  const [quantity, setQuantity] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function ensureExperienceId(): Promise<string | null> {
    if (draft.experienceId) return draft.experienceId;
    const created = await createExperienceFromDraft(draft);
    if (!created.ok) {
      setError(created.message);
      return null;
    }
    setDraft({ experienceId: created.data.id });
    return created.data.id;
  }

  async function onAddTicket(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();
    const priceAmount = Number(price);
    const quantityTotal = Number(quantity);
    if (!trimmed) {
      setError("Give this ticket type a name.");
      return;
    }
    if (!Number.isFinite(priceAmount) || priceAmount < 0) {
      setError("Enter a valid price.");
      return;
    }
    if (!Number.isFinite(quantityTotal) || quantityTotal < 1) {
      setError("Enter a quantity of at least 1.");
      return;
    }

    setBusy(true);
    try {
      const experienceId = await ensureExperienceId();
      if (!experienceId) return;

      const created = await createTicketTypeOnExperience(experienceId, {
        name: trimmed,
        priceAmount,
        quantityTotal,
      });
      if (!created.ok) {
        setError(created.message);
        return;
      }

      addTicket({
        ...created.data,
        guestsPerTicket: created.data.guestsPerTicket || 1,
        description: created.data.description || "",
      });
      setName("");
      setPrice("25000");
      setQuantity("100");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveTicket(ticketId: string) {
    setError(null);
    setRemovingId(ticketId);
    try {
      if (draft.experienceId && isPersistedTicketId(ticketId)) {
        const result = await deleteTicketTypeOnExperience(
          draft.experienceId,
          ticketId,
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
      }
      removeTicket(ticketId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <SetupShell stepId="access">
      <Card>
        <h2 className="text-base font-medium">3. Access</h2>

        <div className="mt-6 flex flex-col gap-5">
          <SetupField
            label="Event currency"
            hint="NGN · GBP · GHS · KES · USD. Locked after the first sale."
          >
            <SetupSelect
              value={draft.currency}
              onChange={(e) => {
                const next = CURRENCIES.find((item) => item.value === e.target.value);
                setDraft({
                  currency: e.target.value,
                  currencyLabel: next?.label ?? e.target.value,
                });
              }}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </SetupSelect>
          </SetupField>

          <div className="flex flex-wrap gap-2">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={draft.accessMode === mode.id}
                onClick={() => setDraft({ accessMode: mode.id })}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  draft.accessMode === mode.id
                    ? "bg-accent text-accent-fg"
                    : "bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <ul className="flex flex-col">
            {draft.tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex items-start justify-between gap-3 border-b border-border/50 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {`${ticket.name} — ${formatNaira(ticket.price)}`}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {`${ticket.quantity.toLocaleString("en-GB")} tickets × ${ticket.guestsPerTicket} guest${
                      ticket.guestsPerTicket === 1 ? "" : "s"
                    } · ${ticket.description}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onRemoveTicket(ticket.id)}
                  disabled={removingId === ticket.id}
                  className="shrink-0 text-[11px] font-semibold text-muted hover:text-fg disabled:opacity-50"
                >
                  {removingId === ticket.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>

          {adding ? (
            <form
              onSubmit={(e) => void onAddTicket(e)}
              className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4"
            >
              <SetupField label="Ticket name">
                <SetupInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="General Access"
                  autoFocus
                />
              </SetupField>
              <div className="grid gap-3 sm:grid-cols-2">
                <SetupField label="Price (NGN)">
                  <SetupInput
                    type="number"
                    min={0}
                    step={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </SetupField>
                <SetupField label="Quantity">
                  <SetupInput
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </SetupField>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save ticket type"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAdding(false);
                    setError(null);
                  }}
                  className="rounded-full bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-fg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setError(null);
              }}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold hover:text-fg"
            >
              <span aria-hidden>+</span>
              Add ticket type
            </button>
          )}

          {error ? (
            <p role="alert" className="text-[11px] text-red-400">
              {error}
            </p>
          ) : null}

          <div>
            <p className="text-sm">
              Total guest capacity · {capacity.total.toLocaleString("en-GB")} places
            </p>
            <p className="mt-1 text-[11px] text-muted">{capacity.breakdown}</p>
          </div>

          <div className="rounded-2xl bg-surface-2 px-4 py-4">
            <p className="text-[11px] text-muted">Sales close · {draft.timezone}</p>
            <p className="mt-1 text-sm">{draft.salesCloseLabel}</p>
          </div>

          <div>
            <p className="text-sm">
              Refund policy ·{" "}
              <span className="text-muted">Edit</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">{draft.refundPolicy}</p>
          </div>
        </div>
      </Card>
    </SetupShell>
  );
}
