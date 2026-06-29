import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateUserDialog } from "@/app/school-admin/users/create-user-dialog";

describe("CreateUserDialog", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as never;
  });

  it("opens the form from the trigger", async () => {
    const user = userEvent.setup();
    render(<CreateUserDialog />);
    await user.click(screen.getByRole("button", { name: /create user/i }));
    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
  });

  it("blocks non-digit keystrokes in the mobile field", async () => {
    const user = userEvent.setup();
    render(<CreateUserDialog />);
    await user.click(screen.getByRole("button", { name: /create user/i }));
    const mobile = screen.getByPlaceholderText("9876543210");
    await user.type(mobile, "abc123def");
    expect(mobile).toHaveValue("123");
  });

  it("shows a validation error for an invalid mobile number", async () => {
    const user = userEvent.setup();
    render(<CreateUserDialog />);
    await user.click(screen.getByRole("button", { name: /create user/i }));
    await user.type(screen.getByPlaceholderText("John Doe"), "Jane Doe");
    // Force an invalid mobile by pasting (bypasses keydown blocking).
    const mobile = screen.getByPlaceholderText("9876543210");
    await user.click(mobile);
    await user.paste("12345");
    await user.click(screen.getAllByRole("button", { name: /create user/i }).find((b) => b.getAttribute("type") === "submit")!);

    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
