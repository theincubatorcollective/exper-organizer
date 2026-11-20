"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/overview/Card";
import {
  coverMetaFromFile,
  createExperienceFromDraft,
  uploadExperienceCover,
  validateCoverFile,
} from "@/lib/event-setup/api";
import { categoryLabels } from "@/lib/event-setup/categories";
import { useEventSetup } from "../EventSetupProvider";
import { SetupField, SetupInput, SetupSelect, SetupTextarea } from "../SetupField";
import { SetupShell } from "../SetupShell";

const CATEGORIES = categoryLabels();

export function BasicsStep() {
  const { draft, setDraft } = useEventSetup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  async function onPickCover(file: File | null) {
    if (!file) return;
    setCoverError(null);

    const invalid = validateCoverFile(file);
    if (invalid) {
      setCoverError(invalid);
      return;
    }

    setUploading(true);
    try {
      let experienceId = draft.experienceId;
      if (!experienceId) {
        const created = await createExperienceFromDraft(draft);
        if (!created.ok) {
          setCoverError(created.message);
          return;
        }
        experienceId = created.data.id;
        setDraft({ experienceId });
      }

      const uploaded = await uploadExperienceCover(experienceId, file);
      if (!uploaded.ok) {
        setCoverError(uploaded.message);
        return;
      }

      const url = uploaded.data.coverImageUrl?.trim();
      if (!url) {
        setCoverError("Upload succeeded but no cover URL came back.");
        return;
      }

      setDraft({
        experienceId,
        coverImageUrl: url,
        coverMeta: coverMetaFromFile(file),
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <SetupShell stepId="basics" showSaveDraft>
      <Card>
        <h2 className="text-base font-medium">1. Basics</h2>

        <div className="mt-5 overflow-hidden rounded-2xl bg-surface-2">
          <div className="aspect-[16/9] sm:aspect-[21/9]">
            {/* Decorative: event title field names the cover. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.coverImageUrl}
              alt=""
              className="size-full object-cover"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void onPickCover(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className={`inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-[11px] font-semibold text-fg ${
              uploading ? "cursor-not-allowed opacity-70" : "hover:bg-border"
            }`}
          >
            <span aria-hidden>▣</span>
            {uploading ? "Uploading…" : "Change cover"}
          </button>
          <p className="text-[11px] text-muted">{draft.coverMeta}</p>
        </div>
        {coverError ? (
          <p role="alert" className="mt-2 text-[11px] text-red-400">
            {coverError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-4">
          <SetupField label="Event title">
            <SetupInput
              value={draft.title}
              onChange={(e) => setDraft({ title: e.target.value })}
            />
          </SetupField>

          <SetupField label="Description">
            <SetupTextarea
              value={draft.description}
              onChange={(e) => setDraft({ description: e.target.value })}
            />
          </SetupField>

          <SetupField label="Category">
            <SetupSelect
              value={draft.category}
              onChange={(e) => setDraft({ category: e.target.value })}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </SetupSelect>
          </SetupField>

          <SetupField
            label="Event URL"
            hint="A short link for your invitations and event page."
          >
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-accent">
              <span className="shrink-0 text-muted">exper.live /</span>
              <input
                value={draft.slug}
                onChange={(e) =>
                  setDraft({
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-"),
                  })
                }
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </div>
          </SetupField>
        </div>
      </Card>
    </SetupShell>
  );
}
