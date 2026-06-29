import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateParentDialog } from "@/app/super-admin/parents/create-parent-dialog";

const schools = [{ id: "school-1", name: "Greenwood High", code: "GWH" }];

describe("CreateParentDialog", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) }) as never;
  });

  it("opens the form and reveals father fields once included", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));
    await user.click(screen.getByText(/father details/i));
    expect(screen.getAllByText(/first name/i)[0]).toBeInTheDocument();
  });

  it("blocks non-digit keystrokes in the father's mobile field", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));
    await user.click(screen.getByText(/father details/i));
    const mobile = screen.getByPlaceholderText("9876543210");
    await user.type(mobile, "abc123def");
    expect(mobile).toHaveValue("123");
  });

  it("shows a validation error for an invalid aadhaar number", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));
    await user.click(screen.getByText(/father details/i));
    const aadhaar = screen.getByPlaceholderText("XXXX XXXX XXXX");
    await user.click(aadhaar);
    await user.paste("123");

    await user.type(screen.getAllByText(/^first name \*/i)[0].closest("div")!.querySelector("input")!, "Ramesh");

    await user.click(screen.getByRole("button", { name: /save parent/i }));

    expect(await screen.findByText(/aadhaar must be exactly 12 digits/i)).toBeInTheDocument();
  });
});
