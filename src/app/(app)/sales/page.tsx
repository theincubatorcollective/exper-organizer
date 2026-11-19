import type { Metadata } from "next";
import { SalesContent } from "./SalesContent";

export const metadata: Metadata = { title: "Sales · EXPER" };

type SearchParams = Promise<{
  page?: string | string[];
  experienceId?: string | string[];
}>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const pageRaw = Number(first(params.page) ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const experienceId = first(params.experienceId) ?? null;

  return <SalesContent page={page} experienceId={experienceId} />;
}
