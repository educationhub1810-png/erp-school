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

// Helper to stub the /api/auth/otp/request response (status + requires2fa).
function mockOtpRequest(requires2fa: boolean, status = 200) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    status,
    json: async () => ({ success: status < 400, data: { requires2fa } }),
  } as Response);
}

describe("LoginForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
    // Default: no 2FA required, so admin flows fall through to signIn.
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { requires2fa: false } }),
    } as Response) as typeof fetch;
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

  it("does not offer Accountant, Librarian, Transport/HR/Warden/Mess Manager in the role dropdown", () => {
    render(<LoginForm />);
    for (const name of ["Accountant", "Librarian", "Transport Manager", "HR Manager", "Warden Manager", "Mess Manager"]) {
      expect(screen.queryByRole("option", { name })).not.toBeInTheDocument();
    }
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
    await user.type(screen.getByLabelText(/teacher code/i), "teacher@sch001.com");
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

  it("shows the DOB-password hint for Principal, Teacher and Parent too", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.queryByText(/DOB as DDMMYYYY/i)).not.toBeInTheDocument();
    for (const role of ["PRINCIPAL", "TEACHER", "PARENT"]) {
      await user.selectOptions(screen.getByLabelText(/role/i), role);
      expect(screen.getByText(/DOB as DDMMYYYY/i)).toBeInTheDocument();
    }
  });

  it("labels the username field as '<Role> Code' for code/DOB roles and 'Email or Mobile' otherwise", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    // no role selected yet — defaults to the email/mobile label + placeholder
    expect(screen.getByText("Email or Mobile")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter email or mobile")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/role/i), "TEACHER");
    expect(screen.getByLabelText("Teacher Code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter teacher code")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/role/i), "PRINCIPAL");
    expect(screen.getByLabelText("Principal Code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter principal code")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/role/i), "PARENT");
    expect(screen.getByLabelText("Parent Code")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/role/i), "STUDENT");
    expect(screen.getByLabelText("Student Code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter student code")).toBeInTheDocument();
  });

  it("shows username + password (no authenticator field) for Super Admin and School Admin", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    // the authenticator field no longer exists for any role
    expect(screen.queryByLabelText(/authenticator code/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/role/i), "SUPER_ADMIN");
    expect(screen.getByLabelText(/email or mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/authenticator code/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/role/i), "SCHOOL_ADMIN");
    expect(screen.getByLabelText(/email or mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it("requires username + password before submitting for Super Admin", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.selectOptions(screen.getByLabelText(/role/i), "SUPER_ADMIN");
    await user.click(screen.getByRole("button", { name: /login to dashboard/i }));

    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("runs the two-step email-OTP flow for Super Admin / School Admin", async () => {
    mockOtpRequest(true); // password accepted → a code was emailed
    signInMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.selectOptions(screen.getByLabelText(/role/i), "SCHOOL_ADMIN");
    await user.type(screen.getByLabelText(/email or mobile/i), "admin@sch001.com");
    await user.type(screen.getByLabelText(/^password/i), "Admin@123");
    await user.click(screen.getByRole("button", { name: /login to dashboard/i }));

    // Step 1 posts the credentials to the OTP request route — not signIn yet.
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/auth/otp/request",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(signInMock).not.toHaveBeenCalled();

    // The code-entry step appears; entering the code + verifying calls signIn.
    const otpInput = await screen.findByLabelText(/verification code/i);
    await user.type(otpInput, "482915");
    await user.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledOnce());
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        role: "SCHOOL_ADMIN",
        username: "admin@sch001.com",
        password: "Admin@123",
        otp: "482915",
        redirect: false,
      }),
    );
  });

  it("shows an error message when an admin password is rejected", async () => {
    // Wrong password → server hides it as requires2fa:false → signIn is tried
    // and fails with the generic credentials error.
    mockOtpRequest(false);
    signInMock.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.selectOptions(screen.getByLabelText(/role/i), "SUPER_ADMIN");
    await user.type(screen.getByLabelText(/email or mobile/i), "superadmin");
    await user.type(screen.getByLabelText(/^password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /login to dashboard/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("shows 'invalid or expired code' when the OTP is rejected", async () => {
    mockOtpRequest(true);
    signInMock.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.selectOptions(screen.getByLabelText(/role/i), "SUPER_ADMIN");
    await user.type(screen.getByLabelText(/email or mobile/i), "admin@sch001.com");
    await user.type(screen.getByLabelText(/^password/i), "Admin@123");
    await user.click(screen.getByRole("button", { name: /login to dashboard/i }));

    const otpInput = await screen.findByLabelText(/verification code/i);
    await user.type(otpInput, "000000");
    await user.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByText(/invalid or expired code/i)).toBeInTheDocument();
  });

  it("renders the branded hero panel with all four feature badges", () => {
    render(<LoginForm />);
    expect(screen.getAllByAltText("iSMS").length).toBeGreaterThan(0);
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
