"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  createExperienceFromDraft,
  publishExperienceAndConfirm,
  savedAtLabelNow,
  updateExperienceFromDraft,
} from "@/lib/event-setup/api";
import { stepById } from "@/lib/event-setup/steps";
import type { SetupStepId } from "@/lib/event-setup/types";
import { AttendeePreview } from "./AttendeePreview";
import { useEventSetup } from "./EventSetupProvider";
import { SetupFooter } from "./SetupFooter";
import { SetupStepper } from "./SetupStepper";

export function SetupShell({
  stepId,
  children,
  previewFootnote,
  showSaveDraft = false,
}: {
  stepId: SetupStepId;
  children: ReactNode;
  previewFootnote?: string;
  showSaveDraft?: boolean;
}) {
  const router = useRouter();
  const { draft, setDraft, loading } = useEventSetup();
  const step = stepById(stepId);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function persistDraft(): Promise<string | null> {
    const experienceId = await ensureExperienceId();
    if (!experienceId) return null;

    const updated = await updateExperienceFromDraft(experienceId, draft);
    if (!updated.ok) {
      setError(updated.message);
      return null;
    }

    setDraft({
      experienceId,
      savedAtLabel: savedAtLabelNow(draft.timezone),
      status: draft.status === "Published" ? "Published" : "Draft",
    });
    return experienceId;
  }

  async function onSaveDraft() {
    setError(null);
    setSaving(true);
    try {
      await persistDraft();
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    setError(null);
    setPublishing(true);
    try {
      const experienceId = await persistDraft();
      if (!experienceId) return;

      const published = await publishExperienceAndConfirm(experienceId);
      if (!published.ok) {
        setError(published.message);
        return;
      }

      setDraft({
        status:
          published.data.status === "pending_review" ? "Draft" : "Published",
        savedAtLabel: savedAtLabelNow(draft.timezone),
      });
      router.push(`/events?tab=${published.data.tab}`);
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-tight">
            {step.title}
          </h1>
          <p className="text-[11px] text-muted">Loading saved draft…</p>
        </div>
        <div className="h-64 animate-pulse rounded-3xl bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-tight">
          {step.title}
        </h1>
        <p className="text-[11px] text-muted">
          {`${draft.title} · ${draft.status} · ${draft.savedAtLabel}`}
        </p>
      </div>

      <SetupStepper current={stepId} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.75fr)] xl:items-start">
        <div className="min-w-0">{children}</div>
        <AttendeePreview footnote={previewFootnote} />
      </div>

      <SetupFooter
        step={step}
        showSaveDraft={showSaveDraft}
        onSaveDraft={showSaveDraft ? onSaveDraft : undefined}
        saving={saving}
        onPublish={stepId === "review" ? onPublish : undefined}
        publishing={publishing}
        error={error}
      />
    </div>
  );
}
