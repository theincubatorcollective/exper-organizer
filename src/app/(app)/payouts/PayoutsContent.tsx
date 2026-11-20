import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/auth/Button";
import { Card } from "@/components/overview/Card";
import { Payouts } from "@/components/payouts/Payouts";
import type { PayoutDatePreset } from "@/lib/payouts/types";
import { getPayouts } from "@/lib/server/payouts";

export async function PayoutsContent({
  currency,
  experienceId,
  datePreset,
  from,
  to,
}: {
  currency?: string | null;
  experienceId?: string | null;
  datePreset?: string | null;
  from?: string | null;
  to?: string | null;
}) {
  const preset =
    datePreset === "month" || datePreset === "last30" || datePreset === "all"
      ? (datePreset as PayoutDatePreset)
      : null;

  const result = await getPayouts({
    currency,
    experienceId,
    datePreset: preset,
    from,
    to,
  });

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
          <Link href="/payouts" className={buttonClasses("secondary")}>
            Try again
          </Link>
        </div>
      </Card>
    );
  }

  return <Payouts data={result.data} />;
}
