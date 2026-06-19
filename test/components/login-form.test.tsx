import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- mock the framework deps the client component reaches for ---
const signInMock = vi.fn();
vi.mock("next-auth/react", () => ({ signIn: (...a: unknown[]) => signInMock(...a) }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

import { LoginForm } from "@/app/login/login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
    // /api/public/schools fetch on mount
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ data: [{ id: "s1", name: "DPS", code: "SCH001" }] }) })),
    );
  });

  it("renders the school dropdown, username and password fields", async () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/school/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // schools load in from the public endpoint
    await waitFor(() => expect(screen.getByRole("option", { name: /DPS — SCH001/ })).toBeInTheDocument());
  });

  it("shows validation errors and does not call signIn when fields are empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("submits credentials to signIn with redirect disabled", async () => {
    signInMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<LoginForm />);
    await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled());

    await user.type(screen.getByLabelText(/username/i), "superadmin");
    await user.type(screen.getByLabelText(/password/i), "admin123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledOnce());
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ username: "superadmin", password: "admin123", redirect: false }),
    );
  });

  it("shows an error message when credentials are rejected", async () => {
    signInMock.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled());

    await user.type(screen.getByLabelText(/username/i), "x");
    await user.type(screen.getByLabelText(/password/i), "y");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
