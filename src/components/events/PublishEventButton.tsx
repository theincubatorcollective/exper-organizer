"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClasses } from "@/components/auth/Button";
import { publishExperienceAndConfirm } from "@/lib/event-setup/api";

export function PublishEventButton({ experienceId }: { experienceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPublish() {
    setError(null);
    setBusy(true);
    try {
      const result = await publishExperienceAndConfirm(experienceId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Land on the tab dates imply (past Oct dates → Past, future → Upcoming).
      router.push(`/events?tab=${result.data.tab}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        onClick={onPublish}
        disabled={busy}
        className={buttonClasses(
          "primary",
          busy ? "cursor-not-allowed opacity-70" : "",
        )}
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
      {error ? (
        <p className="max-w-[14rem] text-[10px] leading-snug text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
