import type { Metadata } from "next";
import { TeamContent } from "./TeamContent";

export const metadata: Metadata = { title: "Team / Roles · EXPER" };

export default function TeamPage() {
  return <TeamContent />;
}
