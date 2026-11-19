import type { Metadata } from "next";
import { SettingsContent } from "./SettingsContent";

export const metadata: Metadata = { title: "Settings · EXPER" };

export default function SettingsPage() {
  return <SettingsContent />;
}
