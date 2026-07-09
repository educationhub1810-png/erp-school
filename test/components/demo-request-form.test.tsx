import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DemoRequestForm } from "@/app/landing/demo-request-form";
import { toast } from "sonner";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
  await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
  await user.type(screen.getByLabelText(/^phone$/i), "9876543210");
  await user.type(screen.getByLabelText(/school \/ institution name/i), "Greenwood High");
}

describe("DemoRequestForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as never;
  });

  it("renders every required field", () => {
    render(<DemoRequestForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/school \/ institution name/i)).toBeInTheDocument();
  });

  it("shows validation errors and does not submit when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<DemoRequestForm />);
    await user.click(screen.getByRole("button", { name: /request a demo/i }));

    expect(await screen.findByText(/^name is required$/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits the form to /api/public/demo-request and shows a confirmation", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { submitted: true } }),
    });
    const user = userEvent.setup();
    render(<DemoRequestForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /request a demo/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      "/api/public/demo-request",
      expect.objectContaining({ method: "POST" }),
    ));
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "9876543210",
      schoolName: "Greenwood High",
    });

    expect(await screen.findByText(/thanks — request received/i)).toBeInTheDocument();
  });

  it("shows an error toast and keeps the form when the request fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Something broke" }),
    });
    const user = userEvent.setup();
    render(<DemoRequestForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /request a demo/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something broke"));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });
});
