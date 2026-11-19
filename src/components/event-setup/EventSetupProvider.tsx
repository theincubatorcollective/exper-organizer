"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchExperience } from "@/lib/event-setup/api";
import {
  experienceToDraft,
  readRememberedSetupExperienceId,
  rememberSetupExperienceId,
} from "@/lib/event-setup/hydrate";
import { designEventDraft } from "@/lib/event-setup/mock";
import type { EventDraft } from "@/lib/event-setup/types";

type SetupContextValue = {
  draft: EventDraft;
  loading: boolean;
  setDraft: (patch: Partial<EventDraft>) => void;
  updateTicket: (
    id: string,
    patch: Partial<EventDraft["tickets"][number]>,
  ) => void;
  addTicket: (ticket: EventDraft["tickets"][number]) => void;
  removeTicket: (id: string) => void;
  beginNewDraft: () => void;
};

const EventSetupContext = createContext<SetupContextValue | null>(null);

export function EventSetupProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<EventDraft>(() => designEventDraft());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("new") === "1") {
        rememberSetupExperienceId(null);
        if (!cancelled) setDraftState(designEventDraft());
        return;
      }

      const id = params.get("id") || readRememberedSetupExperienceId();
      if (!id) return;

      setLoading(true);
      const result = await fetchExperience(id);
      if (cancelled) return;

      if (result.ok) {
        const next = experienceToDraft(result.data);
        rememberSetupExperienceId(next.experienceId);
        setDraftState(next);
      } else if (result.status === 404) {
        rememberSetupExperienceId(null);
      }

      setLoading(false);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SetupContextValue>(
    () => ({
      draft,
      loading,
      setDraft: (patch) => {
        setDraftState((current) => {
          const next = { ...current, ...patch };
          if (patch.experienceId !== undefined) {
            rememberSetupExperienceId(patch.experienceId);
          }
          return next;
        });
      },
      updateTicket: (id, patch) =>
        setDraftState((current) => ({
          ...current,
          tickets: current.tickets.map((ticket) =>
            ticket.id === id ? { ...ticket, ...patch } : ticket,
          ),
        })),
      addTicket: (ticket) =>
        setDraftState((current) => ({
          ...current,
          tickets: [...current.tickets, ticket],
        })),
      removeTicket: (id) =>
        setDraftState((current) => ({
          ...current,
          tickets: current.tickets.filter((ticket) => ticket.id !== id),
        })),
      beginNewDraft: () => {
        rememberSetupExperienceId(null);
        setDraftState(designEventDraft());
      },
    }),
    [draft, loading],
  );

  return (
    <EventSetupContext.Provider value={value}>{children}</EventSetupContext.Provider>
  );
}

export function useEventSetup(): SetupContextValue {
  const value = useContext(EventSetupContext);
  if (!value) {
    throw new Error("useEventSetup must be used inside EventSetupProvider");
  }
  return value;
}
