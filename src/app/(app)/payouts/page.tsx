import type { Metadata } from "next";
import { PayoutsContent } from "./PayoutsContent";

export const metadata: Metadata = { title: "Payouts · EXPER" };

type Search = {
  currency?: string;
  experienceId?: string;
  datePreset?: string;
  from?: string;
  to?: string;
};

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const params = (await searchParams) ?? {};
  return (
    <PayoutsContent
      currency={params.currency ?? null}
      experienceId={params.experienceId ?? null}
      datePreset={params.datePreset ?? null}
      from={params.from ?? null}
      to={params.to ?? null}
    />
  );
}
