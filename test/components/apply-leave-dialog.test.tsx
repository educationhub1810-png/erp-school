import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ApplyLeaveDialog } from "@/components/shared/apply-leave-dialog";

describe("ApplyLeaveDialog", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders an Apply for Leave trigger that opens the form", async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveDialog />);
    await user.click(screen.getByRole("button", { name: /apply for leave/i }));
    expect(screen.getByText(/leave type/i)).toBeInTheDocument();
    expect(screen.getByText(/reason/i)).toBeInTheDocument();
    expect(screen.getByText("From Date *")).toBeInTheDocument();
    expect(screen.getByText("To Date *")).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveDialog />);
    await user.click(screen.getByRole("button", { name: /apply for leave/i }));
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(await screen.findByText(/from date is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("defaults the leave type to Casual Leave and lists every leave type as an option", async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveDialog />);
    await user.click(screen.getByRole("button", { name: /apply for leave/i }));

    expect(screen.getByText("Casual Leave")).toBeInTheDocument();
    await user.click(screen.getByText("Casual Leave"));
    expect(screen.getByRole("option", { name: "Sick Leave" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Earned Leave" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unpaid Leave" })).toBeInTheDocument();
  });
});
