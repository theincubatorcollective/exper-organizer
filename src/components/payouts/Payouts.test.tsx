import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { designPayouts } from "@/lib/payouts/mock";
import { Payouts } from "./Payouts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("Payouts", () => {
  test("shows the payouts header, currencies and metrics", () => {
    render(<Payouts data={designPayouts()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Payouts" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Balances are separated by currency. No conversion or mixed-currency totals.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NGN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Available NGN")).toBeInTheDocument();
    expect(screen.getAllByText("₦8,275,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("₦25,553,750")).toBeInTheDocument();
    expect(screen.getByText("₦12,640,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export statement/ })).toBeInTheDocument();
  });

  test("event and date filters are dropdowns", async () => {
    const user = userEvent.setup();
    render(<Payouts data={designPayouts()} />);

    const eventFilter = screen.getByLabelText("Filter by event");
    expect(eventFilter.tagName).toBe("SELECT");
    expect(eventFilter).toHaveDisplayValue("All NGN events");
    await user.selectOptions(eventFilter, "neon");
    expect(eventFilter).toHaveValue("neon");

    const dateFilter = screen.getByLabelText("Filter by date");
    expect(dateFilter.tagName).toBe("SELECT");
    expect(
      Array.from((dateFilter as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(["all", "month", "last30"]);
    await user.selectOptions(dateFilter, "last30");
    expect(dateFilter).toHaveValue("last30");
  });

  test("shows transfer funds, history and balances", () => {
    render(<Payouts data={designPayouts()} />);
    expect(screen.getByRole("heading", { name: "Transfer funds" })).toBeInTheDocument();
    expect(screen.getByText("From currency balance")).toBeInTheDocument();
    expect(screen.getByText("NGN — Available ₦8,275,000")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Afterhours Studio Ltd · GTBank · •••• 4829"),
    ).toBeInTheDocument();
    expect(screen.getByText("Amount in NGN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review transfer" })).toBeEnabled();

    expect(screen.getByRole("heading", { name: "Transfer history" })).toBeInTheDocument();
    expect(screen.getByText("NGN-0823 · Completed")).toBeInTheDocument();
    expect(screen.getByText("₦5,815,000")).toBeInTheDocument();
    expect(screen.getByText("21 Oct 2026 · GTBank •••• 4829")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Balances by currency" }),
    ).toBeInTheDocument();
    expect(screen.getByText("NGN · Nigeria")).toBeInTheDocument();
    expect(screen.getByText("Bank verification needed")).toBeInTheDocument();
    expect(screen.getByText("EUR · Germany")).toBeInTheDocument();
    expect(screen.getByText("No settled sales yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage bank accounts" }),
    ).toBeEnabled();
  });
});
