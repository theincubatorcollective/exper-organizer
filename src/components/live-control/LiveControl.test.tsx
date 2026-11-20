import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { designLiveControl } from "@/lib/live-control/mock";
import { LiveControl } from "./LiveControl";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderLive() {
  return render(
    <LiveControl data={designLiveControl()} experienceId="exp-test" />,
  );
}

describe("LiveControl", () => {
  test("shows the live header, metrics and active prompt with side timer", () => {
    renderLive();
    expect(
      screen.getByRole("heading", { level: 1, name: "Live Control" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Neon Solstice · Landmark Beach/)).toBeInTheDocument();
    expect(screen.getByText("Live · Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause all" })).toBeEnabled();
    expect(
      screen.getAllByRole("button", { name: "End event…" }).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("LIVE · TEXT PROMPT")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "What is the DJ actually doing up there?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("01:42")).toBeInTheDocument();
    expect(screen.getByText("of 03:00 remaining")).toBeInTheDocument();
    expect(
      screen.getByText("38 of 876 active attendees answered"),
    ).toBeInTheDocument();
    expect(screen.getByText("4.3%")).toBeInTheDocument();
    expect(
      screen.getByText(
        "838 yet to answer · One answer per person · Creative prompt, no correct answer",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Pause$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /End prompt/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Send next/ })).toBeEnabled();
    expect(
      screen.getByText(
        "Sending next closes this prompt first. Attendees keep their submitted answers.",
      ),
    ).toBeInTheDocument();
  });

  test("prompt queue shows upcoming items and manual send", () => {
    renderLive();
    expect(screen.getByRole("heading", { name: /Prompt queue/ })).toBeInTheDocument();
    expect(screen.getByText("/ Manual send")).toBeInTheDocument();
    expect(screen.getByText(/Find Something Blue/)).toBeInTheDocument();
    expect(screen.getByText("Up next · Photo mission · 05:00")).toBeInTheDocument();
    expect(screen.getByText(/Write tonight's headline/)).toBeInTheDocument();
    expect(screen.getByText("Private squad mission · 04:00")).toBeInTheDocument();
    expect(screen.getByText("· 240 votes")).toBeInTheDocument();
    expect(screen.getByText("Sent at 21:30 WAT · Poll closed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit run of show/ })).toHaveAttribute(
      "href",
      "/experience-builder",
    );
  });

  test("response stream can switch to flagged answers", async () => {
    const user = userEvent.setup();
    renderLive();
    await user.click(screen.getByRole("button", { name: "Flagged 2" }));
    expect(
      screen.getByText("Pretending the playlist is intentional."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Counting how many people are filming him."),
    ).toBeInTheDocument();
  });

  test("poll, photo and lower panels match the Figma structure", () => {
    renderLive();
    expect(screen.getByText("Closed · 21:32")).toBeInTheDocument();
    expect(screen.getByText("Voice notes")).toBeInTheDocument();
    expect(screen.getByText("Consent given · Waiting for review")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Arrivals/ })).toBeInTheDocument();
    expect(screen.getByText("Main entrance")).toBeInTheDocument();
    expect(screen.getByText("Femisola")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Event safety controls" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pause all activity" }),
    ).toBeEnabled();
  });
});
