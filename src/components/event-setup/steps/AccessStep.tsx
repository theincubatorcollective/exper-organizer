"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/overview/Card";
import {
  createExperienceFromDraft,
  createTicketTypeOnExperience,
  deleteTicketTypeOnExperience,
  isPersistedTicketId,
  updateTicketTypeOnExperience,
} from "@/lib/event-setup/api";
import { formatNaira, totalGuestCapacity } from "@/lib/event-setup/mock";
import type { AccessMode, TicketType } from "@/lib/event-setup/types";
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

type TicketFormState = {
  name: string;
  price: string;
  quantity: string;
  guestsPerTicket: string;
  description: string;
};

const EMPTY_FORM: TicketFormState = {
  name: "",
  price: "25000",
  quantity: "100",
  guestsPerTicket: "1",
  description: "",
};

function formFromTicket(ticket: TicketType): TicketFormState {
  return {
    name: ticket.name,
    price: String(ticket.price),
    quantity: String(ticket.quantity),
    guestsPerTicket: String(ticket.guestsPerTicket || 1),
    description: ticket.description || "",
  };
}

export function AccessStep() {
  const { draft, setDraft, addTicket, updateTicket, removeTicket } =
    useEventSetup();
  const capacity = totalGuestCapacity(draft.tickets);
  const [formMode, setFormMode] = useState<"closed" | "create" | "edit">(
    "closed",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TicketFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function patchForm(patch: Partial<TicketFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function openCreate() {
    setError(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormMode("create");
  }

  function openEdit(ticket: TicketType) {
    setError(null);
    setEditingId(ticket.id);
    setForm(formFromTicket(ticket));
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode("closed");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

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

  function parseForm(): {
    name: string;
    priceAmount: number;
    quantityTotal: number;
    guestsPerTicket: number;
    description: string;
  } | null {
    const name = form.name.trim();
    const priceAmount = Number(form.price);
    const quantityTotal = Number(form.quantity);
    const guestsPerTicket = Number(form.guestsPerTicket);
    if (!name) {
      setError("Give this ticket type a name.");
      return null;
    }
    if (!Number.isFinite(priceAmount) || priceAmount < 0) {
      setError("Enter a valid price.");
      return null;
    }
    if (!Number.isFinite(quantityTotal) || quantityTotal < 1) {
      setError("Enter a quantity of at least 1.");
      return null;
    }
    if (!Number.isFinite(guestsPerTicket) || guestsPerTicket < 1) {
      setError("Guests per ticket must be at least 1.");
      return null;
    }
    return {
      name,
      priceAmount,
      quantityTotal,
      guestsPerTicket,
      description: form.description.trim(),
    };
  }

  async function onSaveTicket(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = parseForm();
    if (!parsed) return;

    setBusy(true);
    try {
      if (formMode === "edit" && editingId) {
        if (draft.experienceId && isPersistedTicketId(editingId)) {
          const updated = await updateTicketTypeOnExperience(
            draft.experienceId,
            editingId,
            parsed,
          );
          if (!updated.ok) {
            setError(updated.message);
            return;
          }
          updateTicket(editingId, {
            name: updated.data.name || parsed.name,
            price: updated.data.price ?? parsed.priceAmount,
            quantity: updated.data.quantity ?? parsed.quantityTotal,
            guestsPerTicket:
              updated.data.guestsPerTicket || parsed.guestsPerTicket,
            description: updated.data.description || parsed.description,
          });
        } else {
          updateTicket(editingId, {
            name: parsed.name,
            price: parsed.priceAmount,
            quantity: parsed.quantityTotal,
            guestsPerTicket: parsed.guestsPerTicket,
            description: parsed.description,
          });
        }
        closeForm();
        return;
      }

      const experienceId = await ensureExperienceId();
      if (!experienceId) return;

      const created = await createTicketTypeOnExperience(experienceId, parsed);
      if (!created.ok) {
        setError(created.message);
        return;
      }

      addTicket({
        ...created.data,
        guestsPerTicket: created.data.guestsPerTicket || parsed.guestsPerTicket,
        description: created.data.description || parsed.description,
      });
      closeForm();
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
      if (editingId === ticketId) closeForm();
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
                const next = CURRENCIES.find(
                  (item) => item.value === e.target.value,
                );
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
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(ticket)}
                    className="text-[11px] font-semibold text-muted hover:text-fg"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRemoveTicket(ticket.id)}
                    disabled={removingId === ticket.id}
                    className="text-[11px] font-semibold text-muted hover:text-fg disabled:opacity-50"
                  >
                    {removingId === ticket.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {formMode !== "closed" ? (
            <form
              onSubmit={(e) => void onSaveTicket(e)}
              className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4"
            >
              <p className="text-xs font-semibold text-muted">
                {formMode === "edit" ? "Edit ticket type" : "New ticket type"}
              </p>
              <SetupField label="Ticket name">
                <SetupInput
                  value={form.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                  placeholder="General Access"
                  autoFocus
                />
              </SetupField>
              <div className="grid gap-3 sm:grid-cols-2">
                <SetupField label={`Price (${draft.currency})`}>
                  <SetupInput
                    type="number"
                    min={0}
                    step={1}
                    value={form.price}
                    onChange={(e) => patchForm({ price: e.target.value })}
                  />
                </SetupField>
                <SetupField label="Quantity">
                  <SetupInput
                    type="number"
                    min={1}
                    step={1}
                    value={form.quantity}
                    onChange={(e) => patchForm({ quantity: e.target.value })}
                  />
                </SetupField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SetupField label="Guests per ticket">
                  <SetupInput
                    type="number"
                    min={1}
                    step={1}
                    value={form.guestsPerTicket}
                    onChange={(e) =>
                      patchForm({ guestsPerTicket: e.target.value })
                    }
                  />
                </SetupField>
                <SetupField label="Description">
                  <SetupInput
                    value={form.description}
                    onChange={(e) => patchForm({ description: e.target.value })}
                    placeholder="Standard floor access"
                  />
                </SetupField>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg disabled:opacity-50"
                >
                  {busy
                    ? "Saving…"
                    : formMode === "edit"
                      ? "Save changes"
                      : "Save ticket type"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeForm}
                  className="rounded-full bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-fg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={openCreate}
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
              Total guest capacity · {capacity.total.toLocaleString("en-GB")}{" "}
              places
            </p>
            <p className="mt-1 text-[11px] text-muted">{capacity.breakdown}</p>
          </div>

          <div className="rounded-2xl bg-surface-2 px-4 py-4">
            <p className="text-[11px] text-muted">
              Sales close · {draft.timezone}
            </p>
            <p className="mt-1 text-sm">{draft.salesCloseLabel}</p>
          </div>

          <div>
            <p className="text-sm">
              Refund policy · <span className="text-muted">Edit</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">{draft.refundPolicy}</p>
          </div>
        </div>
      </Card>
    </SetupShell>
  );
}
