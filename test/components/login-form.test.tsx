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
  });

  it("renders the role dropdown, username and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email or mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // the role dropdown lists the known roles
    expect(screen.getByRole("option", { name: "Teacher" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Super Admin" })).toBeInTheDocument();
  });

  it("shows validation errors and does not call signIn when fields are empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /login to dashboard/i }));
    expect(await screen.findByText(/please select your role/i)).toBeInTheDocument();
    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("submits the selected role + credentials to signIn with redirect disabled", async () => {
    signInMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.selectOptions(screen.getByLabelText(/role/i), "TEACHER");
    await user.type(screen.getByLabelText(/email or mobile/i), "teacher@sch001.com");
    await user.type(screen.getByLabelText(/password/i), "Admin@123");
    await user.click(screen.getByRole("button", { name: /login to dashboard/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledOnce());
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        role: "TEACHER",
        username: "teacher@sch001.com",
        password: "Admin@123",
        redirect: false,
      }),
    );
  });

  it("shows the student hint when the Student role is selected", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.selectOptions(screen.getByLabelText(/role/i), "STUDENT");
    expect(screen.getByText(/student code/i)).toBeInTheDocument();
    expect(screen.getByText(/DOB as DDMMYYYY/i)).toBeInTheDocument();
  });

  it("shows the Authenticator code field only when Super Admin is selected", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.queryByLabelText(/authenticator code/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/role/i), "SUPER_ADMIN");
    expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument();
  });

  it("shows an error message when credentials are rejected", async () => {
    signInMock.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.selectOptions(screen.getByLabelText(/role/i), "SUPER_ADMIN");
    await user.type(screen.getByLabelText(/email or mobile/i), "x");
    await user.type(screen.getByLabelText(/password/i), "y");
    await user.click(screen.getByRole("button", { name: /login to dashboard/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("renders the branded hero panel with all four feature badges", () => {
    render(<LoginForm />);
    expect(screen.getAllByText("EduERP").length).toBeGreaterThan(0);
    expect(screen.getByText("Secure Platform")).toBeInTheDocument();
    expect(screen.getByText("Multi Role Access")).toBeInTheDocument();
    expect(screen.getByText("Real-time Analytics")).toBeInTheDocument();
    expect(screen.getByText("Cloud Based")).toBeInTheDocument();
  });

  it("renders the decorative background blobs and floating icons without breaking the form", () => {
    const { container } = render(<LoginForm />);
    expect(container.querySelectorAll(".animate-blob-1, .animate-blob-2, .animate-blob-3").length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll(".animate-float-1, .animate-float-2, .animate-float-3").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".animate-twinkle-a, .animate-twinkle-b, .animate-twinkle-c").length).toBeGreaterThan(0);
    // decorative only — the actual form must still be present and usable
    expect(screen.getByRole("button", { name: /login to dashboard/i })).toBeInTheDocument();
  });
});
