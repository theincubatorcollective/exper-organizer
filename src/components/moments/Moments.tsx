"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/auth/Button";
import { Card } from "@/components/overview/Card";
import { reviewMomentSubmission } from "@/lib/moments/api";
import type { MomentTab, MomentsData } from "@/lib/moments/types";

export function Moments({
  data,
  experienceId,
  initialTab = "pending",
}: {
  data: MomentsData;
  experienceId: string;
  initialTab?: MomentTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<MomentTab>(initialTab);
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const items = data.items;
  const current = items[cursor] ?? null;
  const queue = useMemo(
    () =>
      items.slice(cursor + 1).map((item) => ({
        id: item.id,
        name: item.submitter,
        action: "Review",
        detail: `${item.momentTitle} · ${item.authorMeta.split(" · ").at(-1) ?? ""}`.trim(),
      })),
    [items, cursor],
  );

  const tabs: { id: MomentTab; label: string }[] = [
    { id: "pending", label: `Pending ${data.counts.pending}` },
    { id: "approved", label: `Approved ${data.counts.approved}` },
    { id: "rejected", label: `Rejected ${data.counts.rejected}` },
  ];

  function switchTab(next: MomentTab) {
    setTab(next);
    setCursor(0);
    setError(null);
    setMessage(null);
    router.replace(`/moments?status=${next}&experienceId=${experienceId}`);
    router.refresh();
  }

  async function onReview(approved: boolean) {
    if (!current) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await reviewMomentSubmission(
      experienceId,
      current.responseId,
      approved,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(approved ? "Photo approved." : "Photo rejected.");
    router.refresh();
  }

  function onSkip() {
    if (cursor < items.length - 1) {
      setCursor((value) => value + 1);
      setMessage(null);
      setError(null);
      return;
    }
    setMessage("No more submissions in this queue.");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div>
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
            Moments moderation
          </h1>
          <p className="mt-2 text-[11px] text-muted">{data.eventMeta}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => switchTab(item.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                tab === item.id
                  ? "bg-accent text-accent-fg"
                  : "bg-surface-2 text-fg hover:bg-border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {error ? (
          <p role="alert" className="text-[11px] text-red-400">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-[11px] text-muted">{message}</p>
        ) : null}
      </header>

      {!current ? (
        <Card>
          <p className="text-sm font-medium">No submissions in this queue.</p>
          <p className="mt-2 text-[11px] text-muted">
            Photo missions will show up here for review when guests submit.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)] xl:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="overflow-hidden rounded-3xl bg-[#ececeb] text-[#111111]">
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#d8d8d6]">
                {/* Decorative: caption below names the moment. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
              <div className="px-5 py-5 sm:px-6">
                <p className="text-[clamp(1.15rem,2.2vw,1.45rem)] font-semibold tracking-tight">
                  {current.caption}
                </p>
                <p className="mt-2 text-[11px] text-[#6b6b6f]">
                  {current.authorMeta}
                </p>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || tab === "approved"}
                onClick={() => void onReview(true)}
                className={buttonClasses(
                  "primary",
                  `gap-2 ${busy || tab === "approved" ? "cursor-not-allowed opacity-70" : ""}`,
                )}
              >
                <CheckIcon />
                Approve photo
              </button>
              <button
                type="button"
                disabled={busy || tab === "rejected"}
                onClick={() => void onReview(false)}
                className={`inline-flex items-center gap-2 rounded-full bg-surface-2 px-5 py-2.5 text-xs font-semibold text-danger ${
                  busy || tab === "rejected" ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                <RejectIcon />
                Reject…
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onSkip}
                className={buttonClasses(
                  "secondary",
                  busy ? "cursor-not-allowed opacity-70" : "",
                )}
              >
                Skip for now
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-muted">
              {current.actionNote}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Card title="Submission details">
              <div className="mt-4">
                <p className="text-sm font-medium">{current.submitter}</p>
                <p className="mt-1 text-[11px] text-muted">{current.ticketMeta}</p>
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[11px] text-muted">Photo consent</p>
                  <p className="text-sm">{current.consent}</p>
                </div>
                <p className="mt-1 text-[11px] text-muted">{current.consentNote}</p>
              </div>

              <div className="mt-5">
                <p className="text-[11px] text-muted">Automated screening</p>
                <p className="mt-1 text-sm">{current.screening}</p>
              </div>

              <label className="mt-5 flex min-h-[4.5rem] w-full flex-col justify-center gap-1 rounded-[1.25rem] bg-surface-2 px-5 py-3">
                <span className="text-[10px] text-muted">Rejection reason</span>
                <span className="flex items-center justify-between gap-3 text-sm text-muted">
                  <span>Optional note — not required by the API yet</span>
                  <span aria-hidden>⌄</span>
                </span>
              </label>

              <p className="mt-4 text-[11px] leading-relaxed text-muted">
                Harassment, personal information or unsafe content should not be
                published.
              </p>
            </Card>

            <Card title="Up next" aside="/ Oldest first">
              {queue.length === 0 ? (
                <p className="mt-5 text-[11px] text-muted">{data.queueFooter}</p>
              ) : (
                <>
                  <ul className="mt-5 flex flex-col gap-4">
                    {queue.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => {
                            const index = items.findIndex((row) => row.id === item.id);
                            if (index >= 0) setCursor(index);
                          }}
                        >
                          <p className="text-sm">
                            {item.name}{" "}
                            <span className="text-muted">· {item.action}</span>
                          </p>
                          <p className="mt-1 text-[11px] text-muted">{item.detail}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-[11px] text-muted">{data.queueFooter}</p>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-3 fill-none stroke-current"
      strokeWidth="1.8"
    >
      <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
    </svg>
  );
}

function RejectIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-3 fill-none stroke-current"
      strokeWidth="1.8"
    >
      <path d="M3 3l6 6M9 3l-6 6" />
    </svg>
  );
}
