import type { Metadata } from "next";
import { ExperienceBuilderContent } from "./ExperienceBuilderContent";

export const metadata: Metadata = { title: "Experience Builder · EXPER" };

type Search = { experienceId?: string | string[] };

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExperienceBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const params = (await searchParams) ?? {};
  return (
    <ExperienceBuilderContent experienceId={first(params.experienceId) ?? null} />
  );
}
