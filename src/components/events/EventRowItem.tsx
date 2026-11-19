import Link from "next/link";
import { buttonClasses } from "@/components/auth/Button";
import { isPublishedStatus } from "@/lib/events/classify";
import { eventCoverSrc } from "@/lib/events/cover";
import { formatEventRange } from "@/lib/events/format";
import type { EventRow } from "@/lib/events/types";
import { utcOffset } from "@/lib/overview/format";
import { PublishEventButton } from "./PublishEventButton";

const count = (n: number) => n.toLocaleString("en-GB");

function tickets({ sold, capacity }: Pick<EventRow, "sold" | "capacity">): string {
  if (sold === null) return "—";
  if (capacity === null) return count(sold);
  return `${count(sold)} / ${count(capacity)}`;
}

export function EventRowItem({ event }: { event: EventRow }) {
  const place = [event.venue.name, event.venue.city].filter(Boolean).join(" · ");
  const zone = `${event.timezone} · ${utcOffset(event.timezone, new Date(event.startsAt))}`;
  const isDraft = !isPublishedStatus(event.status);
  const coverSrc = eventCoverSrc(event.coverImageUrl, event.id);

  return (
    <article className="flex flex-col gap-4 border-b border-border/60 py-6 last:border-b-0 sm:flex-row sm:items-center sm:gap-6">
      <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2 sm:size-24">
        {/* Decorative: the event title beside it names the row. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverSrc} alt="" className="size-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-xl font-medium tracking-tight">{event.title}</h3>
          {isDraft ? (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Draft
            </span>
          ) : null}
        </div>
        {place ? <p className="mt-1 text-[11px] text-muted">{place}</p> : null}
        <p className="mt-2 text-xs">
          {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
        </p>
        <p className="mt-1 text-[11px] text-muted">{zone}</p>
      </div>

      <div className="flex flex-col gap-3 sm:items-end sm:text-right">
        <div>
          <p className="text-xs">{tickets(event)}</p>
          {event.currency ? (
            <p className="mt-1 text-[11px] text-muted">{`Event currency · ${event.currency}`}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            href={`/events/setup/basics?id=${encodeURIComponent(event.id)}`}
            className={buttonClasses("secondary")}
          >
            Manage event
          </Link>
          {isDraft ? <PublishEventButton experienceId={event.id} /> : null}
        </div>
      </div>
    </article>
  );
}
