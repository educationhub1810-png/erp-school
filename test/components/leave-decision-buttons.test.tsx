import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LeaveDecisionButtons } from "@/components/shared/leave-decision-buttons";

describe("LeaveDecisionButtons", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders Approve and Reject buttons", () => {
    render(<LeaveDecisionButtons leaveId="leave-1" />);
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("clicking Approve PATCHes the leave request with status APPROVED", async () => {
    const user = userEvent.setup();
    render(<LeaveDecisionButtons leaveId="leave-1" />);
    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/leave/leave-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "APPROVED" });
    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
  });

  it("clicking Reject PATCHes the leave request with status REJECTED", async () => {
    const user = userEvent.setup();
    render(<LeaveDecisionButtons leaveId="leave-2" />);
    await user.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/leave/leave-2");
    expect(JSON.parse(init.body as string)).toEqual({ status: "REJECTED" });
  });

  it("shows an error toast and does not refresh when the request fails", async () => {
    const { toast } = await import("sonner");
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false, error: "Already decided" }) }) as never;
    const user = userEvent.setup();
    render(<LeaveDecisionButtons leaveId="leave-3" />);
    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Already decided"));
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
