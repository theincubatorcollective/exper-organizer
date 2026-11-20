import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { EventSetupProvider } from "./EventSetupProvider";
import { AccessStep } from "./steps/AccessStep";
import { BasicsStep } from "./steps/BasicsStep";
import { DateVenueStep } from "./steps/DateVenueStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { ReviewStep } from "./steps/ReviewStep";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function renderStep(node: React.ReactNode) {
  return render(<EventSetupProvider>{node}</EventSetupProvider>);
}

describe("Event setup flow", () => {
  test("Basics shows the draft title, cover controls and next step", () => {
    renderStep(<BasicsStep />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Event setup / Basics" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Neon Solstice")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change cover/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Next: Date \/ Venue/ })).toHaveAttribute(
      "href",
      "/events/setup/date-venue",
    );
    expect(screen.getByText("ATTENDEE APP PREVIEW")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get access" })).toBeInTheDocument();
  });

  test("editing the title updates the attendee preview", async () => {
    const user = userEvent.setup();
    renderStep(<BasicsStep />);
    const title = screen.getByDisplayValue("Neon Solstice");
    await user.clear(title);
    await user.type(title, "Midnight Parade");
    expect(screen.getAllByText("Midnight Parade").length).toBeGreaterThan(0);
  });

  test("Date / Venue shows venue fields and date/time pickers", () => {
    renderStep(<DateVenueStep />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Event setup / Date / Venue" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Landmark Beach")).toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-10-25");
    expect(screen.getByLabelText("Start time")).toHaveValue("20:00");
    expect(screen.getByLabelText("End date")).toHaveValue("2026-10-26");
    expect(screen.getByLabelText(/End time/)).toHaveValue("03:30");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: /Next: Access/ })).toHaveAttribute(
      "href",
      "/events/setup/access",
    );
  });

  test("Access shows ticket types and capacity", () => {
    renderStep(<AccessStep />);
    expect(screen.getByText(/General Access — ₦25,000/)).toBeInTheDocument();
    expect(screen.getByText(/VIP · Soundscape — ₦65,000/)).toBeInTheDocument();
    expect(screen.getByText(/Squad Bundle \(4×\) — ₦85,000/)).toBeInTheDocument();
    expect(screen.getByText(/1,600 places/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add ticket type/ })).toBeEnabled();
  });

  test("Access add form opens from Add ticket type", async () => {
    const user = userEvent.setup();
    renderStep(<AccessStep />);
    await user.click(screen.getByRole("button", { name: /Add ticket type/ }));
    expect(screen.getByPlaceholderText("General Access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save ticket type/ })).toBeInTheDocument();
  });

  test("Access edit form opens from Edit and pre-fills the ticket", async () => {
    const user = userEvent.setup();
    renderStep(<AccessStep />);
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]!);
    expect(screen.getByDisplayValue("General Access")).toBeInTheDocument();
    expect(screen.getByDisplayValue("25000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save changes/ })).toBeInTheDocument();
  });

  test("Experience lists run of show and builder entry", () => {
    renderStep(<ExperienceStep />);
    expect(screen.getByText("One has to go")).toBeInTheDocument();
    expect(screen.getByText("Find Something Blue")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open Experience Builder/ }),
    ).toHaveAttribute("href", "/experience-builder");
  });

  test("Review summarises every section with edit links", () => {
    renderStep(<ReviewStep />);
    expect(screen.getByText("Ready for the room?")).toBeInTheDocument();
    expect(screen.getByText("5 / 5 checked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish event/ })).toBeEnabled();
    const editLinks = screen.getAllByRole("link", { name: "Edit" });
    expect(editLinks).toHaveLength(4);
  });

  test("Basics Save draft is enabled", () => {
    renderStep(<BasicsStep />);
    expect(screen.getByRole("button", { name: /Save draft/ })).toBeEnabled();
  });
});
