import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EditUserAction } from "@/components/shared/edit-user-action";

describe("EditUserAction", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("prefills the dialog with the user's current email and saves changes via PATCH", async () => {
    const user = userEvent.setup();
    render(<EditUserAction userId="u1" name="Jane" email="old@sch001.com" mobile={null} />);

    await user.click(screen.getByRole("button", { name: /edit user/i }));

    const emailInput = await screen.findByLabelText(/email/i);
    expect(emailInput).toHaveValue("old@sch001.com");

    await user.clear(emailInput);
    await user.type(emailInput, "new@sch001.com");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/users/u1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toMatchObject({ name: "Jane", email: "new@sch001.com" });
    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
  });

  it("shows the server error and does not refresh on failure", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ error: "Email already registered" }) }) as never;
    const user = userEvent.setup();
    render(<EditUserAction userId="u1" name="Jane" email="old@sch001.com" mobile={null} />);

    await user.click(screen.getByRole("button", { name: /edit user/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
