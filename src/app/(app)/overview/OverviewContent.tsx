import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/auth/Button";
import { AttentionList } from "@/components/overview/AttentionList";
import { Card } from "@/components/overview/Card";
import { ComingUp } from "@/components/overview/ComingUp";
import { LiveEventCard } from "@/components/overview/LiveEventCard";
import { PageHeading } from "@/components/overview/PageHeading";
import { RoomPulse } from "@/components/overview/RoomPulse";
import { TeamActivity } from "@/components/overview/TeamActivity";
import { getOverview } from "@/lib/server/overview";

export async function OverviewContent() {
  const result = await getOverview();

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
          <Link href="/overview" className={buttonClasses("secondary")}>
            Try again
          </Link>
        </div>
      </Card>
    );
  }

  const { hero, comingUp, mock } = result.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeading now={new Date()} />

      {hero ? (
        <LiveEventCard hero={hero} activeNow={mock.activeNow} />
      ) : (
        <Card>
          <p className="text-sm font-medium">No live or upcoming event yet.</p>
          <p className="mt-2 text-[11px] text-muted">
            Create an event to see it here when it goes live.
          </p>
          <Link
            href="/events/setup/basics"
            className={buttonClasses("primary", "mt-5 inline-flex gap-2")}
          >
            <span aria-hidden>+</span>
            Create event
          </Link>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ComingUp items={comingUp.items} total={comingUp.total} />
          <AttentionList items={mock.attention} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <RoomPulse room={mock.room} />
          <TeamActivity items={mock.team} />
        </div>
      </div>
    </div>
  );
}
