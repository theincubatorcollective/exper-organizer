import type { Metadata } from "next";
import { LiveControlContent } from "./LiveControlContent";

export const metadata: Metadata = { title: "Live Control · EXPER" };

type SearchParams = Promise<{
  experienceId?: string | string[];
}>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LiveControlPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const experienceId = first(params.experienceId) ?? null;
  return <LiveControlContent experienceId={experienceId} />;
}
