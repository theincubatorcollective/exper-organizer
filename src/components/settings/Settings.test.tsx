import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { designSettings } from "@/lib/settings/mock";
import { Settings } from "./Settings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderSettings() {
  return render(<Settings data={designSettings()} />);
}

describe("Settings", () => {
  test("shows the settings header and tabs", () => {
    renderSettings();
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(
      screen.getByText("Workspace preferences, security and event defaults."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Workspace" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Security" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  test("shows organisation and event defaults", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Organisation" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Afterhours studio")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Afterhours Studio Ltd")).toBeInTheDocument();
    expect(screen.getByDisplayValue("hello@afterhours.studio")).toBeInTheDocument();
    expect(screen.getByDisplayValue("afterhours.studio/support")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();

    expect(screen.getByRole("heading", { name: "Event defaults" })).toBeInTheDocument();
    expect(screen.getByText("Photo review")).toBeInTheDocument();
    expect(screen.getByText("Require approval before sharing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save defaults" })).toBeEnabled();
  });

  test("shows security, notifications and workspace controls", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument();
    expect(screen.getByText("Two-step verification")).toBeInTheDocument();
    expect(
      screen.getAllByText("Not available from the organizer API yet.").length,
    ).toBeGreaterThan(0);

    expect(
      screen.getByRole("heading", { name: "Notification delivery" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Daily summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save notifications" })).toBeEnabled();

    expect(
      screen.getByRole("heading", { name: "Workspace controls" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Delete workspace/ }),
    ).toBeInTheDocument();
  });

  test("notification toggles flip On/Off", async () => {
    const user = userEvent.setup();
    renderSettings();
    const daily = screen.getByRole("button", { name: "Off" });
    await user.click(daily);
    expect(screen.queryByRole("button", { name: "Off" })).not.toBeInTheDocument();
  });
});
