import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Role2faToggles } from "@/app/super-admin/settings/role-2fa-toggles";

const POLICIES = [
  { role: "SUPER_ADMIN", label: "Super Admin", required: true, locked: true },
  { role: "SCHOOL_ADMIN", label: "School Admin", required: true, locked: false },
  { role: "ACCOUNTANT", label: "Accountant", required: false, locked: false },
] as const;

describe("Role2faToggles", () => {
  beforeEach(() => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders a switch per role and locks Super Admin on", () => {
    render(<Role2faToggles policies={[...POLICIES]} />);
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText(/always on/i)).toBeInTheDocument();

    const saSwitch = screen.getByRole("switch", { name: /super admin/i });
    expect(saSwitch).toBeDisabled();
    expect(saSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("toggling a role PUTs the new value to the settings API", async () => {
    const user = userEvent.setup();
    render(<Role2faToggles policies={[...POLICIES]} />);

    await user.click(screen.getByRole("switch", { name: /accountant/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/settings/two-factor");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ role: "ACCOUNTANT", required: true });

    // Optimistic flip reflected in the UI.
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: /accountant/i })).toHaveAttribute("aria-checked", "true"),
    );
  });

  it("does not call the API for the locked Super Admin switch", async () => {
    const user = userEvent.setup();
    render(<Role2faToggles policies={[...POLICIES]} />);
    await user.click(screen.getByRole("switch", { name: /super admin/i }));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
