import Link from "next/link";
import { redirect } from "next/navigation";
import { Moments } from "@/components/moments/Moments";
import { buttonClasses } from "@/components/auth/Button";
import { Card } from "@/components/overview/Card";
import type { MomentTab } from "@/lib/moments/types";
import { getMomentsGallery } from "@/lib/server/moments-gallery";

export async function MomentsContent({
  experienceId,
  status,
}: {
  experienceId?: string | null;
  status?: MomentTab;
}) {
  const tab = status ?? "pending";
  const result = await getMomentsGallery({ experienceId, status: tab });

  if (!result.ok) {
    if (result.reason === "unauthorized") redirect("/sign-in");
    if (result.reason === "forbidden") {
      return (
        <Card className="mx-auto max-w-xl">
          <p role="alert" className="text-sm">
            This account isn&apos;t an organizer.
          </p>
        </Card>
      );
    }
    return (
      <Card className="mx-auto flex max-w-xl flex-col gap-4">
        <p role="alert" className="text-sm">
          {result.message}
        </p>
        <div>
          <Link href="/moments" className={buttonClasses("secondary")}>
            Try again
          </Link>
        </div>
      </Card>
    );
  }

  if (result.empty || !result.data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header>
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
            Moments moderation
          </h1>
        </header>
        <Card>
          <p className="text-sm font-medium">No experience to moderate yet.</p>
          <p className="mt-2 text-[11px] text-muted">
            Create an event and run a photo mission before submissions appear here.
          </p>
          <Link
            href="/events/setup/basics"
            className={buttonClasses("primary", "mt-5 inline-flex gap-2")}
          >
            <span aria-hidden>+</span>
            Create event
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <Moments
      data={result.data}
      experienceId={result.experienceId}
      initialTab={tab}
    />
  );
}
