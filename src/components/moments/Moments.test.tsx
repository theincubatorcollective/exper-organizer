import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { designMoments } from "@/lib/moments/mock";
import { Moments } from "./Moments";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

function renderMoments() {
  return render(
    <Moments data={designMoments()} experienceId="exp-test" />,
  );
}

describe("Moments", () => {
  test("shows the moderation header and status tabs", () => {
    renderMoments();
    expect(
      screen.getByRole("heading", { level: 1, name: "Moments moderation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Neon Solstice · Review submissions before they appear in the room or event memory.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending 13" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Approved 157" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejected 4" })).toBeInTheDocument();
  });

  test("shows the current submission, actions and details", () => {
    renderMoments();
    expect(
      screen.getByText("The room feels like it's breathing."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ada Okafor · Neon Solstice · 21:39 WAT"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve photo/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Reject…/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Skip for now" })).toBeEnabled();
    expect(
      screen.getByRole("heading", { name: "Submission details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("NS-0428 · Checked in · General Access")).toBeInTheDocument();
    expect(screen.getByText("Granted")).toBeInTheDocument();
    expect(
      screen.getByText("No issue detected · Human review required."),
    ).toBeInTheDocument();
    expect(screen.getByText("Rejection reason")).toBeInTheDocument();
  });

  test("shows the up-next queue", () => {
    renderMoments();
    expect(screen.getByRole("heading", { name: /Up next/ })).toBeInTheDocument();
    expect(screen.getByText("/ Oldest first")).toBeInTheDocument();
    expect(screen.getByText(/Kunle Bello/)).toBeInTheDocument();
    expect(screen.getAllByText(/Find Something Blue/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kemi Adeyemi/)).toBeInTheDocument();
    expect(screen.getByText(/Bola Akande/)).toBeInTheDocument();
    expect(
      screen.getByText("Showing 3 of 12 other pending submissions"),
    ).toBeInTheDocument();
  });
});
