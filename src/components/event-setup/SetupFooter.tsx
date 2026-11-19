"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/auth/Button";
import type { SetupStep } from "@/lib/event-setup/steps";

export function SetupFooter({
  step,
  showSaveDraft = false,
  onSaveDraft,
  saving = false,
  onPublish,
  publishing = false,
  error = null,
}: {
  step: SetupStep;
  showSaveDraft?: boolean;
  onSaveDraft?: () => void;
  saving?: boolean;
  onPublish?: () => void;
  publishing?: boolean;
  error?: string | null;
}) {
  const isReview = step.id === "review";
  const busy = saving || publishing;

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          {step.prevHref ? (
            <Link href={step.prevHref} className={buttonClasses("secondary", "gap-2")}>
              <span aria-hidden>←</span>
              Back
            </Link>
          ) : showSaveDraft ? (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={busy || !onSaveDraft}
              className={buttonClasses(
                "secondary",
                `gap-2 ${busy || !onSaveDraft ? "cursor-not-allowed opacity-70" : ""}`,
              )}
            >
              <span aria-hidden>✓</span>
              {saving ? "Saving…" : "Save draft"}
            </button>
          ) : (
            <span />
          )}
          {showSaveDraft && step.prevHref ? (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={busy || !onSaveDraft}
              className={buttonClasses(
                "secondary",
                `gap-2 ${busy || !onSaveDraft ? "cursor-not-allowed opacity-70" : ""}`,
              )}
            >
              <span aria-hidden>✓</span>
              {saving ? "Saving…" : "Save draft"}
            </button>
          ) : null}
        </div>
        {isReview && onPublish ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={busy}
            className={buttonClasses(
              "primary",
              `gap-2 self-start sm:self-auto ${busy ? "cursor-not-allowed opacity-70" : ""}`,
            )}
          >
            {publishing ? "Publishing…" : step.nextLabel}
            <span aria-hidden>→</span>
          </button>
        ) : step.nextHref ? (
          <Link
            href={step.nextHref}
            className={buttonClasses("primary", "gap-2 self-start sm:self-auto")}
          >
            {step.nextLabel}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
