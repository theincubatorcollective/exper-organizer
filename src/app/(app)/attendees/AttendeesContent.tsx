import Link from "next/link";
import { redirect } from "next/navigation";
import { Attendees } from "@/components/attendees/Attendees";
import { buttonClasses } from "@/components/auth/Button";
import { Card } from "@/components/overview/Card";
import { getAttendees } from "@/lib/server/attendees";

export async function AttendeesContent({
  page,
  experienceId,
}: {
  page: number;
  experienceId?: string | null;
}) {
  const result = await getAttendees({ page, experienceId });

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
          <Link href="/attendees" className={buttonClasses("secondary")}>
            Try again
          </Link>
        </div>
      </Card>
    );
  }

  if (!result.data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header>
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
            Attendees / Check-in
          </h1>
        </header>
        <Card>
          <p className="text-sm font-medium">No experience to check in yet.</p>
          <p className="mt-2 text-[11px] text-muted">
            Create an event, then open Door once guests have passes.
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
    <Attendees data={result.data} experienceId={result.experienceId} />
  );
}
