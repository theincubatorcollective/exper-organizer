import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { designExperienceBuilder } from "@/lib/experience-builder/mock";
import { ExperienceBuilder } from "./ExperienceBuilder";

function renderBuilder() {
  return render(
    <ExperienceBuilder
      data={designExperienceBuilder()}
      experienceId="exp-test"
    />,
  );
}

describe("ExperienceBuilder", () => {
  test("shows the builder chrome, timeline and selected prompt editor", () => {
    renderBuilder();
    expect(
      screen.getByRole("heading", { level: 1, name: "Experience Builder" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Neon Solstice · Run-of-show/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tonight's timeline/ })).toBeInTheDocument();
    expect(screen.getByText("4 prompts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask the room" })).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("What is the DJ actually doing up there?"),
    ).toBeInTheDocument();
    expect(screen.getByText("ATTENDEE APP · PREVIEW")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Post my wrong answer" }),
    ).toBeInTheDocument();
  });

  test("selecting another timeline item updates the editor and preview", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByRole("button", { name: /Find Something Blue/ }));
    expect(screen.getByDisplayValue("Find Something Blue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload my photo" })).toBeInTheDocument();
  });

  test("Add / Save prompt / Save version are enabled; Import stays disabled", () => {
    renderBuilder();
    expect(screen.getByRole("button", { name: "Add prompt" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save prompt" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save version" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Import from event" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("preview Send explains it does not go to attendees", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByRole("button", { name: "Post my wrong answer" }));
    expect(
      screen.getByText(/layout preview only/i),
    ).toBeInTheDocument();
  });
});
