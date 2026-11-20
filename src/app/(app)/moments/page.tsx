import type { Metadata } from "next";
import type { MomentTab } from "@/lib/moments/types";
import { MomentsContent } from "./MomentsContent";

export const metadata: Metadata = { title: "Moments · EXPER" };

type Search = {
  experienceId?: string | string[];
  status?: string | string[];
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function asTab(value?: string): MomentTab {
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }
  return "pending";
}

export default async function MomentsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const params = (await searchParams) ?? {};
  return (
    <MomentsContent
      experienceId={first(params.experienceId) ?? null}
      status={asTab(first(params.status))}
    />
  );
}
